const test = require("node:test");
const assert = require("node:assert/strict");

const app = require("../../components/app");
const metricsRuntime = require("../../components/metrics-runtime");
const vars = require("../../components/vars");
const { withServer } = require("../helpers/http");

const shouldRun = process.env.RUN_REAL_MQTT_TEST === "1";

function createLiveConfig() {
  return vars.createConfig({
    ...process.env,
    MQTT_HOST: process.env.MQTT_HOST || "broker.example.invalid",
    MQTT_TOPIC: process.env.MQTT_TOPIC || "prometheus/emonesp",
    MQTT_TOPIC_LAYOUT: process.env.MQTT_TOPIC_LAYOUT || "esphome",
    MQTT_DEVICE_NAME: process.env.MQTT_DEVICE_NAME || "energy-meter",
    MONITOR_SOLAR: process.env.MONITOR_SOLAR || "true",
    MAINS_GAUGES: process.env.MAINS_GAUGES || "true",
    MAINS_COUNTERS: process.env.MAINS_COUNTERS || "false",
  });
}

async function fetchMetricsUntil(baseUrl, predicate, timeoutMs = 20000) {
  const startedAt = Date.now();
  let lastBody = "";

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${baseUrl}/metrics`);
    assert.equal(response.status, 200);

    lastBody = await response.text();

    if (predicate(lastBody)) {
      return lastBody;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Timed out waiting for live MQTT metrics. Last response:\n${lastBody}`,
  );
}

function getMetricValue(metricsBody, metricName) {
  const match = metricsBody.match(
    new RegExp(`^${metricName} (-?\\d+(?:\\.\\d+)?)$`, "m"),
  );

  return match ? Number.parseFloat(match[1]) : null;
}

function getDirectionalMetricValue(metricsBody, metricName) {
  const matches = [...metricsBody.matchAll(
    new RegExp(
      `^${metricName}\\{exporting="(?:true|false)"\\} (-?\\d+(?:\\.\\d+)?)$`,
      "gm",
    ),
  )];

  if (matches.length === 0) {
    return null;
  }

  return Math.max(
    ...matches.map((match) => Number.parseFloat(match[1])),
  );
}

test(
  "live MQTT integration exposes metrics from the broker",
  { skip: !shouldRun },
  async (t) => {
    const config = createLiveConfig();

    if (config.mqttHost === "broker.example.invalid") {
      throw new Error(
        "Set MQTT_HOST to a reachable broker before running the live MQTT integration test.",
      );
    }

    metricsRuntime.resetForTests(config);
    metricsRuntime.start();

    t.after(() => {
      metricsRuntime.stop();
    });

    await withServer(app, async (baseUrl) => {
      const body = await fetchMetricsUntil(
        baseUrl,
        (metricsBody) =>
          getMetricValue(metricsBody, "home_voltage_1") > 0 &&
          getMetricValue(metricsBody, "home_voltage_2") > 0 &&
          getDirectionalMetricValue(metricsBody, "home_current_power") > 0 &&
          getMetricValue(metricsBody, "home_grid_freq") > 0 &&
          getMetricValue(metricsBody, "solar_total_current") !== null,
      );

      assert(getMetricValue(body, "home_voltage_1") > 0);
      assert(getMetricValue(body, "home_voltage_2") > 0);
      assert(getDirectionalMetricValue(body, "home_current_power") > 0);
      assert(getMetricValue(body, "home_grid_freq") > 0);
      assert.notEqual(getMetricValue(body, "solar_total_current"), null);
      assert.match(body, /energy_scraper_info\{/);
    });
  },
);