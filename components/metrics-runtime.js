const client = require("prom-client");
const mqtt = require("mqtt");

const vars = require("./vars");

function createMetricsRuntime(
  config = vars,
  dependencies = { clientLib: client, mqttLib: mqtt },
) {
  const { clientLib, mqttLib } = dependencies;
  const registry = new clientLib.Registry();

  clientLib.collectDefaultMetrics({ register: registry });

  const metrics = {
    voltage1: new clientLib.Gauge({
      name: "home_voltage_1",
      help: "Current voltage on leg 1 of the home power feed in volts.",
      registers: [registry],
    }),
    voltage2: new clientLib.Gauge({
      name: "home_voltage_2",
      help: "Current voltage on leg 2 of the home power feed in volts.",
      registers: [registry],
    }),
    gridFrequency: new clientLib.Gauge({
      name: "home_grid_freq",
      help: "Current grid frequency for the home power feed in hertz.",
      registers: [registry],
    }),
    scraperInfo: new clientLib.Gauge({
      name: "energy_scraper_info",
      help: "Energy scraper version information.",
      labelNames: ["version", "hostname", "gitSha", "gitRef", "releaseVersion"],
      registers: [registry],
    }),
    powerFactor: new clientLib.Gauge({
      name: "home_power_factor",
      help: "Current power factor of the home power feed.",
      registers: [registry],
    }),
    fundamentalPower: new clientLib.Gauge({
      name: "home_fundamental_power",
      help: "Current fundamental power in watts.",
      registers: [registry],
    }),
    harmonicPower: new clientLib.Gauge({
      name: "home_harmonic_power",
      help: "Current harmonic power in watts.",
      registers: [registry],
    }),
    reactivePower: new clientLib.Gauge({
      name: "home_reactive_power",
      help: "Current reactive power in volt-amperes reactive.",
      registers: [registry],
    }),
    apparentPower: new clientLib.Gauge({
      name: "home_apparent_power",
      help: "Current apparent power in volt-amperes.",
      registers: [registry],
    }),
    phase1: new clientLib.Gauge({
      name: "home_phase_1",
      help: "Current phase angle on leg 1 of the home power feed in degrees.",
      registers: [registry],
    }),
    phase2: new clientLib.Gauge({
      name: "home_phase_2",
      help: "Current phase angle on leg 2 of the home power feed in degrees.",
      registers: [registry],
    }),
    temperature: new clientLib.Gauge({
      name: "home_power_monitor_temp",
      help: "Current power monitor temperature in degrees Celsius.",
      registers: [registry],
    }),
    freeRam: new clientLib.Gauge({
      name: "home_power_monitor_free_ram",
      help: "Current power monitor free RAM in bytes.",
      registers: [registry],
    }),
  };

  if (config.useGaugesMains) {
    metrics.currentPower = new clientLib.Gauge({
      name: "home_current_power",
      help: "Current total home power usage in watts.",
      labelNames: ["exporting"],
      registers: [registry],
    });
    metrics.current1 = new clientLib.Gauge({
      name: "home_current_1",
      help: "Current amperage on leg 1 of the home power feed in amps.",
      labelNames: ["exporting"],
      registers: [registry],
    });
    metrics.current2 = new clientLib.Gauge({
      name: "home_current_2",
      help: "Current amperage on leg 2 of the home power feed in amps.",
      labelNames: ["exporting"],
      registers: [registry],
    });
    metrics.totalCurrent = new clientLib.Gauge({
      name: "home_total_current",
      help: "Total amperage for the home in amps.",
      labelNames: ["exporting"],
      registers: [registry],
    });
  }

  if (config.useCountersMains) {
    metrics.currentPowerCounter = new clientLib.Counter({
      name: "home_current_power_counter",
      help: "Absolute cumulative home power usage in watts.",
      labelNames: ["exporting"],
      registers: [registry],
    });
    metrics.current1Counter = new clientLib.Counter({
      name: "home_current_1_counter",
      help: "Absolute cumulative amperage on leg 1 of the home power feed in amps.",
      labelNames: ["exporting"],
      registers: [registry],
    });
    metrics.current2Counter = new clientLib.Counter({
      name: "home_current_2_counter",
      help: "Absolute cumulative amperage on leg 2 of the home power feed in amps.",
      labelNames: ["exporting"],
      registers: [registry],
    });
    metrics.totalCurrentCounter = new clientLib.Counter({
      name: "home_total_current_counter",
      help: "Absolute cumulative total amperage for the home in amps.",
      labelNames: ["exporting"],
      registers: [registry],
    });
  }

  if (config.monitorSolar) {
    metrics.solarCurrentPower = new clientLib.Gauge({
      name: "solar_current_power",
      help: "Current total solar power output in watts.",
      registers: [registry],
    });
    metrics.solarCurrent1 = new clientLib.Gauge({
      name: "solar_current_1",
      help: "Current amperage on leg 1 of the solar power feed in amps.",
      registers: [registry],
    });
    metrics.solarCurrent2 = new clientLib.Gauge({
      name: "solar_current_2",
      help: "Current amperage on leg 2 of the solar power feed in amps.",
      registers: [registry],
    });
    metrics.solarTotalCurrent = new clientLib.Gauge({
      name: "solar_total_current",
      help: "Total solar feed amperage output in amps.",
      registers: [registry],
    });
    metrics.solarVoltage = new clientLib.Gauge({
      name: "solar_voltage",
      help: "Current solar voltage in volts.",
      registers: [registry],
    });
  }

  const topicMap = buildTopicMap(config.mqttTopic);
  let mqttClient;

  function start() {
    if (mqttClient) {
      return mqttClient;
    }

    mqttClient = mqttLib.connect(config.mqttUrl, {
      username: config.mqttUserName || undefined,
      password: config.mqttPass || undefined,
    });

    mqttClient.on("connect", () => {
      console.log(
        `Getting metrics from MQTT server ${config.mqttUrl} at ${new Date().toISOString()}; base topic: ${config.mqttTopic}`,
      );

      mqttClient.subscribe(Object.values(topicMap), (error) => {
        if (error) {
          console.error("Failed to subscribe to MQTT topics", error);
        }
      });
    });

    mqttClient.on("message", (topic, payload) => {
      handleMessage(topic, payload);
    });

    mqttClient.on("error", (error) => {
      console.error("MQTT client error", error);
    });

    return mqttClient;
  }

  function stop() {
    if (!mqttClient) {
      return;
    }

    mqttClient.end(true);
    mqttClient = undefined;
  }

  function handleMessage(topic, payload) {
    const message = payload.toString();

    switch (topic) {
      case topicMap.watts:
        if (metrics.currentPower) {
          setDirectionalGauge(metrics.currentPower, message);
        }
        if (metrics.currentPowerCounter) {
          incrementDirectionalCounter(metrics.currentPowerCounter, message);
        }
        break;
      case topicMap.voltage1:
        setGauge(metrics.voltage1, message);
        break;
      case topicMap.voltage2:
        setGauge(metrics.voltage2, message);
        break;
      case topicMap.current1:
        if (metrics.current1) {
          setDirectionalGauge(metrics.current1, message);
        }
        if (metrics.current1Counter) {
          incrementDirectionalCounter(metrics.current1Counter, message);
        }
        break;
      case topicMap.current2:
        if (metrics.current2) {
          setDirectionalGauge(metrics.current2, message);
        }
        if (metrics.current2Counter) {
          incrementDirectionalCounter(metrics.current2Counter, message);
        }
        break;
      case topicMap.totalCurrent:
        if (metrics.totalCurrent) {
          setDirectionalGauge(metrics.totalCurrent, message);
        }
        if (metrics.totalCurrentCounter) {
          incrementDirectionalCounter(metrics.totalCurrentCounter, message);
        }
        break;
      case topicMap.solarCurrentPower:
        if (metrics.solarCurrentPower) {
          setGauge(metrics.solarCurrentPower, message, { absolute: true });
        }
        break;
      case topicMap.solarTotalCurrent:
        if (metrics.solarTotalCurrent) {
          setGauge(metrics.solarTotalCurrent, message, { absolute: true });
        }
        break;
      case topicMap.solarCurrent1:
        if (metrics.solarCurrent1) {
          setGauge(metrics.solarCurrent1, message, { absolute: true });
        }
        break;
      case topicMap.solarCurrent2:
        if (metrics.solarCurrent2) {
          setGauge(metrics.solarCurrent2, message, { absolute: true });
        }
        break;
      case topicMap.solarVoltage:
        if (metrics.solarVoltage) {
          setGauge(metrics.solarVoltage, message, { absolute: true });
        }
        break;
      case topicMap.gridFrequency:
        setGauge(metrics.gridFrequency, message, { absolute: true });
        break;
      case topicMap.powerFactor:
        setGauge(metrics.powerFactor, message);
        break;
      case topicMap.fundamentalPower:
        setGauge(metrics.fundamentalPower, message);
        break;
      case topicMap.harmonicPower:
        setGauge(metrics.harmonicPower, message);
        break;
      case topicMap.reactivePower:
        setGauge(metrics.reactivePower, message);
        break;
      case topicMap.apparentPower:
        setGauge(metrics.apparentPower, message);
        break;
      case topicMap.phase1:
        setGauge(metrics.phase1, message);
        break;
      case topicMap.phase2:
        setGauge(metrics.phase2, message);
        break;
      case topicMap.temperature:
        setGauge(metrics.temperature, message);
        break;
      case topicMap.freeRam:
        setGauge(metrics.freeRam, message, { absolute: true });
        break;
      default:
        break;
    }
  }

  function setInfoMetric() {
    metrics.scraperInfo.reset();
    metrics.scraperInfo
      .labels(
        config.vers,
        config.hostname,
        config.gitSha,
        config.gitRef,
        config.releaseVersion,
      )
      .set(1);
  }

  function metricsText() {
    return registry.metrics();
  }

  return {
    registry,
    topicMap,
    start,
    stop,
    handleMessage,
    setInfoMetric,
    metrics: metricsText,
  };
}

function buildTopicMap(baseTopic) {
  return {
    watts: `${baseTopic}grid_house_watts/state`,
    voltage1: `${baseTopic}house_l1_volts/state`,
    voltage2: `${baseTopic}house_l2_volts/state`,
    current1: `${baseTopic}house_l1_amps/state`,
    current2: `${baseTopic}house_l2_amps/state`,
    totalCurrent: `${baseTopic}grid_house_amps/state`,
    solarCurrentPower: `${baseTopic}total_solar_watts/state`,
    solarCurrent1: `${baseTopic}solar_l1_amps/state`,
    solarCurrent2: `${baseTopic}solar_l2_amps/state`,
    solarTotalCurrent: `${baseTopic}total_solar_amps/state`,
    solarVoltage: `${baseTopic}solar_volts/state`,
    gridFrequency: `${baseTopic}freq/state`,
    powerFactor: `${baseTopic}pf/state`,
    fundamentalPower: `${baseTopic}fund_pow/state`,
    harmonicPower: `${baseTopic}har_pow/state`,
    reactivePower: `${baseTopic}react_pow/state`,
    apparentPower: `${baseTopic}app_pow/state`,
    phase1: `${baseTopic}phase_a/state`,
    phase2: `${baseTopic}phase_c/state`,
    temperature: `${baseTopic}temp/state`,
    freeRam: `${baseTopic}freeram/state`,
  };
}

function setGauge(gauge, rawValue, { absolute = false } = {}) {
  const value = Number.parseFloat(rawValue);

  if (!Number.isFinite(value)) {
    return;
  }

  gauge.set(absolute ? Math.abs(value) : value);
}

function setDirectionalGauge(gauge, rawValue) {
  const value = Number.parseFloat(rawValue);

  if (!Number.isFinite(value)) {
    return;
  }

  if (value < 0) {
    gauge.set({ exporting: "true" }, Math.abs(value));
    gauge.set({ exporting: "false" }, 0);
    return;
  }

  gauge.set({ exporting: "false" }, Math.abs(value));
  gauge.set({ exporting: "true" }, 0);
}

function incrementDirectionalCounter(counter, rawValue) {
  const value = Number.parseFloat(rawValue);

  if (!Number.isFinite(value)) {
    return;
  }

  if (value < 0) {
    counter.inc({ exporting: "true" }, Math.abs(value));
    counter.inc({ exporting: "false" }, 0);
    return;
  }

  counter.inc({ exporting: "false" }, Math.abs(value));
  counter.inc({ exporting: "true" }, 0);
}

let runtime = createMetricsRuntime(vars);

function resetForTests(config = vars, dependencies) {
  runtime.stop();
  runtime = createMetricsRuntime(config, dependencies);
  return runtime;
}

module.exports = {
  createMetricsRuntime,
  buildTopicMap,
  start() {
    return runtime.start();
  },
  stop() {
    return runtime.stop();
  },
  handleMessage(topic, payload) {
    return runtime.handleMessage(topic, payload);
  },
  setInfoMetric() {
    return runtime.setInfoMetric();
  },
  metrics() {
    return runtime.metrics();
  },
  getRegistry() {
    return runtime.registry;
  },
  getTopicMap() {
    return runtime.topicMap;
  },
  resetForTests,
  get contentType() {
    return runtime.registry.contentType;
  },
};
