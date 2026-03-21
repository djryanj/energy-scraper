const test = require("node:test");
const assert = require("node:assert/strict");

process.env.MQTT_TOPIC = "test-energy";
process.env.MONITOR_SOLAR = "true";
process.env.MAINS_COUNTERS = "true";
process.env.MONITOR_EXTENDED = "true";
process.env.GIT_REF = "main";
process.env.RELEASE_VERSION = "0.3.1";

const app = require("../../components/app");
const metricsRuntime = require("../../components/metrics-runtime");
const vars = require("../../components/vars");
const { withServer } = require("../helpers/http");

function resetRuntime() {
  metricsRuntime.resetForTests(vars.createConfig(process.env));
}

test.afterEach(() => {
  resetRuntime();
});

test("GET / renders the runtime metadata page", async () => {
  resetRuntime();

  await withServer(app, async (baseUrl) => {
    const response = await fetch(baseUrl);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Energy Scraper/);
    assert.match(body, /MQTT-backed Prometheus exporter/);
    assert.match(body, /\/metrics/);
  });
});

test("GET /healthz returns ok", async () => {
  resetRuntime();

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/healthz`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(body, "ok");
  });
});

test("GET /metrics returns Prometheus metrics from the MQTT runtime", async () => {
  resetRuntime();

  const topics = metricsRuntime.getTopicMap();
  metricsRuntime.handleMessage(topics.watts, Buffer.from("14.2"));
  metricsRuntime.handleMessage(topics.voltage1, Buffer.from("121.4"));
  metricsRuntime.handleMessage(topics.solarCurrentPower, Buffer.from("875.5"));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/metrics`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/plain/);
    assert.match(body, /home_current_power\{exporting="false"\} 14.2/);
    assert.match(body, /home_voltage_1 121.4/);
    assert.match(body, /solar_current_power 875.5/);
    assert.match(body, /energy_scraper_info\{/);
  });
});

test("missing routes return the error page with a 404 status", async () => {
  resetRuntime();

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/does-not-exist`);
    const body = await response.text();

    assert.equal(response.status, 404);
    assert.match(body, /Not Found/);
  });
});
