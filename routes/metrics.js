const client = require("prom-client");
const express = require("express");
const router = express.Router();
const register = new client.Registry();
const vars = require("../components/vars");
const mqtt = require("mqtt");
const mqttConnectString = vars.mqttHost + ":" + vars.mqttPort;
const baseTopic = vars.mqttTopic;
const watts = baseTopic + "grid_house_watts/state";
const volts1 = baseTopic + "house_l1_volts/state";
const volts2 = baseTopic + "house_l2_volts/state";
const current1 = baseTopic + "house_l1_amps/state";
const current2 = baseTopic + "house_l2_amps/state";
const totalCurrent = baseTopic + "grid_house_amps/state";
const solarWatts = baseTopic + "total_solar_watts/state";
const solarCurrent1 = baseTopic + "solar_l1_amps/state";
const solarCurrent2 = baseTopic + "solar_l2_amps/state";
const solarTotalCurrent = baseTopic + "total_solar_amps/state";
const frequency = baseTopic + "freq/state";
const topics = [
  watts,
  volts1,
  volts2,
  current1,
  current2,
  totalCurrent,
  frequency,
  solarWatts,
  solarTotalCurrent,
  solarCurrent1,
  solarCurrent2,
];

// might as well collect some stuff about this server
const collectDefaultMetrics = client.collectDefaultMetrics;

// Probe every 5th second and set to the registry we're using
collectDefaultMetrics({ timeout: 5000 });
collectDefaultMetrics({ register });

// register all the guages
const V1 = new client.Gauge({
  name: "home_voltage_1",
  help: "Current voltage on leg 1 of the home power feed in Volts (V).",
});

const V2 = new client.Gauge({
  name: "home_voltage_2",
  help: "Current voltage on leg 2 of the home power feed in Volts (V).",
});

const W = new client.Gauge({
  name: "home_current_power",
  help: "Current total home power usage in Watts (W).",
  labelNames: ["exporting"],
});

const CT1 = new client.Gauge({
  name: "home_current_1",
  help: "Current amperage (current) on leg 1 of the home power feed in Amps (A).",
  labelNames: ["exporting"],
});

const CT2 = new client.Gauge({
  name: "home_current_2",
  help: "Current amperage (current) on leg 2 of the home power feed in Amps (A).",
  labelNames: ["exporting"],
});

const totI = new client.Gauge({
  name: "home_total_current",
  help: "Total amperage (current) for the home in Amps (A)",
  labelNames: ["exporting"],
});

const freq = new client.Counter({
  name: "home_grid_freq",
  help: "Current grid frequency for home power feed in Hertz (Hz)",
});

const scraperVersion = new client.Counter({
  name: "energy_scraper_info",
  help: "Energy scraper version information",
  labelNames: ["version", "hostname", "buildId"],
});

const wCounter = new client.Counter({
  name: "home_current_power_counter",
  help: "Current total home power usage in Watts (W).",
  labelNames: ["exporting"],
});

const CT1Counter = new client.Counter({
  name: "home_current_1_counter",
  help: "Current amperage (current) on leg 1 of the home power feed in Amps (A).",
  labelNames: ["exporting"],
});

const CT2Counter = new client.Counter({
  name: "home_current_2_counter",
  help: "Current amperage (current) on leg 2 of the home power feed in Amps (A).",
  labelNames: ["exporting"],
});

const totICounter = new client.Counter({
  name: "home_total_current_counter",
  help: "Total amperage (current) for the home in Amps (A)",
  labelNames: ["exporting"],
});

const solarTotI = new client.Gauge({
  name: "solar_total_current",
  help: "Total amperage (current) for solar in in Amps (A)",
});

const solarW = new client.Gauge({
  name: "solar_current_power",
  help: "Current total home power usage in Watts (W).",
});

const solarCT1 = new client.Gauge({
  name: "solar_current_1",
  help: "Current amperage (current) on leg 1 of the solar power feed in Amps (A).",
});

const solarCT2 = new client.Gauge({
  name: "solar_current_2",
  help: "Current amperage (current) on leg 2 of the solar power feed in Amps (A).",
});

register.registerMetric(V1);
register.registerMetric(V2);
register.registerMetric(freq);
register.registerMetric(scraperVersion);

if (vars.useGaugesMains) {
  register.registerMetric(W);
  register.registerMetric(CT1);
  register.registerMetric(CT2);
  register.registerMetric(totI);
}

if (vars.useCountersMains) {
  register.registerMetric(wCounter);
  register.registerMetric(CT1Counter);
  register.registerMetric(CT2Counter);
  register.registerMetric(totICounter);
}

if (vars.monitorSolar) {
  register.registerMetric(solarW);
  register.registerMetric(solarCT1);
  register.registerMetric(solarCT2);
  register.registerMetric(solarTotI);
}

function setCounter(counter, message) {
  val = parseFloat(message);
  if (val < 0) {
    counter.inc({ exporting: "true" }, Math.abs(val));
    counter.inc({ exporting: "false" }, 0);
  } else {
    counter.inc({ exporting: "false" }, Math.abs(val));
    counter.inc({ exporting: "true" }, 0);
  }
}

function setGauge(gauge, message) {
  val = parseFloat(message);
  if (val < 0) {
    gauge.set({ exporting: "true" }, Math.abs(val));
    gauge.set({ exporting: "false" }, 0);
  } else {
    gauge.set({ exporting: "false" }, Math.abs(val));
    gauge.set({ exporting: "true" }, 0);
  }
}

// start mqtt on start of the software
mqttReports();

async function mqttReports() {
  const client = mqtt.connect(mqttConnectString, {
    username: vars.mqttUserName,
    password: vars.mqttPass,
  });

  try {
    client.on("connect", () => {
      var d = new Date();
      console.log(
        "Getting metrics from MQTT server " +
          mqttConnectString +
          " at " +
          d.toISOString() +
          "; base topic: " +
          baseTopic
      );
    });

    client.on('error', function (error) {
      console.log(error)
    })
    

    await client.subscribe(topics);
    client.on("message", function (topic, message) {
      switch (topic) {
        case watts:
          if (vars.useGaugesMains) setGauge(W, message);
          if (vars.useCountersMains) setCounter(wCounter, message);
          break;
        case volts1:
          V1.set(parseFloat(message));
          break;
        case volts2:
          V2.set(parseFloat(message));
          break;
        case current1:
          if (vars.useGaugesMains) setGauge(CT1, message);
          if (vars.useCountersMains) setCounter(CT1Counter, message);
          break;
        case current2:
          if (vars.useGaugesMains) setGauge(CT2, message);
          if (vars.useCountersMains) setCounter(CT2Counter, message);
          break;
        case totalCurrent:
          if (vars.useGaugesMains) setGauge(totI, message);
          if (vars.useCountersMains) setCounter(totICounter, message);
          break;
        case solarWatts:
          if (vars.monitorSolar) solarW.set(Math.abs(parseFloat(message)));
          break;
        case solarTotalCurrent:
          if (vars.monitorSolar) solarTotI.set(Math.abs(parseFloat(message)));
          break;
        case solarCurrent1:
          if (vars.monitorSolar) solarCT1.set(Math.abs(parseFloat(message)));
          break;
        case solarCurrent2:
          if (vars.monitorSolar) solarCT2.set(Math.abs(parseFloat(message)));
          break;
        case frequency:
          freq.inc(parseFloat(message));
          break;
      }
    });
  } catch (e) {
    console.log(e.stack);
  }
}

/* GET metrics page. */
router.get("/", async function (req, res, next) {
  try {
    scraperVersion
      .labels(vars.vers, vars.hostname, vars.azureBuildNumber)
      .inc();
    res.set("Content-Type", register.contentType);
    res.send(register.metrics());
  } catch (e) {
    next(e);
  }
});

module.exports = router;
