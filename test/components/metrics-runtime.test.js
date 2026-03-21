const test = require("node:test");
const assert = require("node:assert/strict");

const metricsRuntime = require("../../components/metrics-runtime");
const vars = require("../../components/vars");

test("metrics runtime records MQTT payloads and emits info metrics", async () => {
  const config = vars.createConfig({
    MQTT_TOPIC: "home-energy",
    MONITOR_SOLAR: "true",
    MAINS_GAUGES: "true",
    MAINS_COUNTERS: "true",
    MONITOR_EXTENDED: "true",
    GIT_REF: "main",
    GIT_SHA: "abcdef123456",
    RELEASE_VERSION: "1.2.3",
  });
  const runtime = metricsRuntime.createMetricsRuntime(config);
  const topics = runtime.topicMap;

  runtime.handleMessage(topics.watts, Buffer.from("-42.5"));
  runtime.handleMessage(topics.voltage1, Buffer.from("120.7"));
  runtime.handleMessage(topics.solarCurrentPower, Buffer.from("812.1"));
  runtime.handleMessage(topics.gridFrequency, Buffer.from("59.9"));
  runtime.handleMessage(topics.temperature, Buffer.from("41.3"));
  runtime.setInfoMetric();

  const body = await runtime.metrics();

  assert.match(body, /home_current_power\{exporting="true"\} 42.5/);
  assert.match(
    body,
    /home_current_power_counter\{exporting="true"\} 42.5/,
  );
  assert.match(body, /home_voltage_1 120.7/);
  assert.match(body, /solar_current_power 812.1/);
  assert.match(body, /home_grid_freq 59.9/);
  assert.match(body, /home_power_monitor_temp 41.3/);
  assert.match(
    body,
    /energy_scraper_info\{version="1.2.3-main-abcdef1",hostname=/,
  );
});

test("metrics runtime builds ESPHome topic paths when configured", () => {
  const config = vars.createConfig({
    MQTT_TOPIC: "prometheus/emonesp",
    MQTT_TOPIC_LAYOUT: "esphome",
    MQTT_DEVICE_NAME: "energy-meter",
  });
  const runtime = metricsRuntime.createMetricsRuntime(config);

  assert.equal(
    runtime.topicMap.watts,
    "prometheus/emonesp/sensor/energy-meter_grid_house_watts/state",
  );
  assert.equal(
    runtime.topicMap.voltage1,
    "prometheus/emonesp/sensor/energy-meter_house_l1_volts/state",
  );
  assert.equal(
    runtime.topicMap.solarTotalCurrent,
    "prometheus/emonesp/sensor/energy-meter_total_solar_amps/state",
  );
});

test("metrics runtime records ESPHome-layout MQTT payloads", async () => {
  const config = vars.createConfig({
    MQTT_TOPIC: "prometheus/emonesp",
    MQTT_TOPIC_LAYOUT: "esphome",
    MQTT_DEVICE_NAME: "energy-meter",
    MONITOR_SOLAR: "true",
    MAINS_GAUGES: "true",
    MAINS_COUNTERS: "true",
  });
  const runtime = metricsRuntime.createMetricsRuntime(config);

  runtime.handleMessage(
    runtime.topicMap.watts,
    Buffer.from("2557.8"),
  );
  runtime.handleMessage(
    runtime.topicMap.totalCurrent,
    Buffer.from("43.73"),
  );
  runtime.handleMessage(
    runtime.topicMap.solarTotalCurrent,
    Buffer.from("4.32"),
  );

  const body = await runtime.metrics();

  assert.match(body, /home_current_power\{exporting="false"\} 2557.8/);
  assert.match(body, /home_total_current\{exporting="false"\} 43.73/);
  assert.match(body, /solar_total_current 4.32/);
});
