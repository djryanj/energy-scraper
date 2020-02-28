const client = require('prom-client');
const express = require("express");
const router = express.Router();
const register = new client.Registry();
const vars = require("../components/vars");
const mqtt = require('async-mqtt')

// Solar meter values to add
// SolarV
// SCT1
// SCT2
// totSolarI
// SolarW

const mqttConnectString = vars.mqttHost + ":" + vars.mqttPort;
const baseTopic = vars.mqttTopic;
const watts = baseTopic+'/W';
const volts1 = baseTopic+'/V1';
const volts2 = baseTopic+'/V2';
const current1 = baseTopic+'/CT1';
const current2 = baseTopic+'/CT2';
const totalCurrent = baseTopic+'/totI';
const solarWatts = baseTopic+'/SolarW';
const solarVolts = baseTopic+'/SolarV';
const solarCurrent1 = baseTopic+'/SCT1';
const solarCurrent2 = baseTopic+'/SCT2';
const solarTotalCurrent = baseTopic+'/totSolarI';
const powerFactor = baseTopic+'/PF';
const temperature = baseTopic+'/temp';
const fundamentalPower = baseTopic+'/FundPow';
const harmonicPower = baseTopic+'/HarPow';
const reactivePower = baseTopic+'/ReactPow';
const apparentPower = baseTopic+'/AppPow';
const phase1 = baseTopic+'/PhaseA';
const phase2 = baseTopic+'/PhaseC';
const frequency = baseTopic+'/freq';
const ramfree = baseTopic+'/freeram';
const topics = [
    watts,
    volts1,
    volts2,
    current1,
    current2,
    totalCurrent,
    powerFactor,
    temperature,
    frequency,
    ramfree,
    fundamentalPower,
    harmonicPower,
    reactivePower,
    apparentPower,
    phase1,
    phase2,
    solarWatts,
    solarVolts,
    solarTotalCurrent,
    solarCurrent1,
    solarCurrent2
]

// might as well collect some stuff about this server
const collectDefaultMetrics = client.collectDefaultMetrics;

// Probe every 5th second and set to the registry we're using
collectDefaultMetrics({ timeout: 5000 });
collectDefaultMetrics({ register });

// register all the guages
const V1 = new client.Counter({
    name: "home_voltage_1",
    help: "Current voltage on leg 1 of the home power feed in Volts (V)."
});

const V2 = new client.Counter({
    name: "home_voltage_2",
    help: "Current voltage on leg 2 of the home power feed in Volts (V)."
});

const W = new client.Gauge({
    name: "home_current_power",
    help: "Current total home power usage in Watts (W)."
});

const CT1 = new client.Gauge({
    name: "home_current_1",
    help: "Current amperage (current) on leg 1 of the home power feed in Amps (A)."
});

const CT2 = new client.Gauge({
    name: "home_current_2",
    help: "Current amperage (current) on leg 2 of the home power feed in Amps (A)."
});

const totI = new client.Gauge({
    name: "home_total_current",
    help: "Total amperage (current) for the home in Amps (A)"
});

const PF = new client.Gauge({
    name: "home_power_factor",
    help: "Power factor of the home power feed.",
})

const temp = new client.Gauge({
    name: "home_power_monitor_temp",
    help: "Current temperature of the home power feed in degrees C",
})

const freq = new client.Counter({
    name: "home_grid_freq",
    help: "Current grid frequency for home power feed in Hertz (Hz)",
})

const freeram = new client.Counter({
    name: "home_power_monitor_free_ram",
    help: "Power monitor free RAM in bytes (b)",
})

const scraperVersion = new client.Counter({
    name: "energy_scraper_info",
    help: "Energy scraper version information",
    labelNames: [ 'version' , 'hostname', 'buildId' ]
})

const wCounter = new client.Counter({
    name: "home_current_power_counter",
    help: "Current total home power usage in Watts (W).",
    labelNames: ['exporting']
});

const CT1Counter = new client.Counter({
    name: "home_current_1_counter",
    help: "Current amperage (current) on leg 1 of the home power feed in Amps (A).",
    labelNames: ['exporting']
});

const CT2Counter = new client.Counter({
    name: "home_current_2_counter",
    help: "Current amperage (current) on leg 2 of the home power feed in Amps (A).",
    labelNames: ['exporting']
});

const totICounter = new client.Counter({
    name: "home_total_current_counter",
    help: "Total amperage (current) for the home in Amps (A)",
    labelNames: ['exporting']
});

const solarTotI = new client.Counter({
    name: "solar_total_current",
    help: "Total amperage (current) for solar in in Amps (A)"
});

const solarV = new client.Counter({
    name: "solar_voltage",
    help: "Current voltage of the solar power feed in Volts (V)."
});

const solarW = new client.Counter({
    name: "solar_current_power",
    help: "Current total home power usage in Watts (W)."
});

const solarCT1 = new client.Counter({
    name: "solar_current_1",
    help: "Current amperage (current) on leg 1 of the solar power feed in Amps (A)."
});

const solarCT2 = new client.Counter({
    name: "solar_current_2",
    help: "Current amperage (current) on leg 2 of the solar power feed in Amps (A)."
});

const FundPow = new client.Gauge({
    name: "home_fundamental_power",
    help: "Current fundamental power in Watts (W)",
})

const HarPow = new client.Gauge({
    name: "home_harmonic_power",
    help: "Current harmonic power Watts (W)",
})

const ReactPow = new client.Gauge({
    name: "home_reactive_power",
    help: "Current reactive power in volt-amperes reactive (VAR)",
})

const AppPow = new client.Gauge({
    name: "home_apparent_power",
    help: "Current apparent power in volt-amperes (VA)",
})

const PhaseA = new client.Counter({
    name: "home_phase_1",
    help: "Current phase angle on leg 1 of the home power feed in degrees (°)",
})

const PhaseC = new client.Counter({
    name: "home_phase_2",
    help: "Current phase angle on leg 2 of the home power feed in degrees (°)",
})

register.registerMetric(V1);
register.registerMetric(V2);
register.registerMetric(PF);
register.registerMetric(temp);
register.registerMetric(freq);
register.registerMetric(freeram);
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
    register.registerMetric(solarV);
    register.registerMetric(solarW);
    register.registerMetric(solarCT1);
    register.registerMetric(solarCT2);
    register.registerMetric(solarTotI);
}

if (vars.monitorExtended) {
    register.registerMetric(FundPow);
    register.registerMetric(HarPow);
    register.registerMetric(ReactPow);
    register.registerMetric(AppPow);
    register.registerMetric(PhaseA);
    register.registerMetric(PhaseC);
}

function setCounter(counter, message) {
    val = parseFloat(message);
    if (val < 0) {
        counter.inc({exporting: 'true'}, Math.abs(val));
    } else {
        counter.inc({exporting: 'false'}, Math.abs(val));
    }  
}

// start mqtt on start of the software
mqttReports();

async function mqttReports() {
    const client = mqtt.connect(mqttConnectString, {
        username: vars.mqttUserName,
        password: vars.mqttPass
    })
    
    try {
        client.on("connect", () => {
            var d = new Date();
            console.log("Getting metrics from MQTT server " + mqttConnectString + " at " + d.toISOString() + "; base topic: " + baseTopic);
        });

        await client.subscribe(topics);
        client.on('message', function (topic, message) {
            switch(topic) {
                case watts:
                    if (vars.useGaugesMains) W.set(parseFloat(message));
                    if (vars.useCountersMains) setCounter(wCounter, message);
                    break;
                case volts1:
                    V1.inc(parseFloat(message));
                    break;
                case volts2:
                    V2.inc(parseFloat(message));
                    break;
                case current1:
                    if (vars.useGaugesMains) CT1.set(parseFloat(message));
                    if (vars.useCountersMains) setCounter(CT1Counter, message);
                    break;
                case current2:
                    if (vars.useGaugesMains) CT2.set(parseFloat(message));
                    if (vars.useCountersMains) setCounter(CT2Counter, message);
                    break;
                case totalCurrent:
                    if (vars.useGaugesMains) totI.set(parseFloat(message));
                    if (vars.useCountersMains) setCounter(totICounter, message);
                    break;
                case solarVolts:
                    if (vars.monitorSolar) solarV.inc(Math.abs(parseFloat(message)));
                    break;
                case solarWatts:
                    if (vars.monitorSolar) solarW.inc(Math.abs(parseFloat(message)));
                    break;
                case solarTotalCurrent:
                    if (vars.monitorSolar) solarTotI.inc(Math.abs(parseFloat(message)));
                    break;
                case solarCurrent1:
                    if (vars.monitorSolar) solarCT1.inc(Math.abs(parseFloat(message)));
                    break;
                case solarCurrent2:
                    if (vars.monitorSolar) solarCT2.inc(Math.abs(parseFloat(message)));
                    break;
                case powerFactor:
                    PF.set(parseFloat(message));
                    break;
                case fundamentalPower:
                    if (vars.monitorExtended) FundPow.set(parseFloat(message));
                    break;
                case harmonicPower:
                    if (vars.monitorExtended) HarPow.set(parseFloat(message));
                    break;
                case reactivePower:
                    if (vars.monitorExtended) ReactPow.set(parseFloat(message));
                    break;
                case apparentPower:
                    if (vars.monitorExtended) AppPow.set(parseFloat(message));
                    break;
                case phase1:
                    if (vars.monitorExtended) PhaseA.inc(parseFloat(message));
                    break;
                case phase2:
                    if (vars.monitorExtended) PhaseC.inc(parseFloat(message));
                    break;
                case temperature:
                    temp.set(parseFloat(message));
                    break;
                case frequency:
                    freq.inc(parseFloat(message));
                    break;
                case ramfree:
                    freeram.inc(parseInt(message));
                    break;
            }
        })
    } catch (e) {
        console.log(e.stack);
    }
}

/* GET metrics page. */
router.get("/", async function(req, res, next) {
    try {
        scraperVersion.labels(vars.vers, vars.hostname, vars.azureBuildNumber).inc();
        res.set('Content-Type', register.contentType);
        res.send(register.metrics());
    } catch (e) {
        next(e);
    }  
});

module.exports = router;