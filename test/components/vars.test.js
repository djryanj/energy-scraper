const test = require("node:test");
const assert = require("node:assert/strict");

const vars = require("../../components/vars");

const fakeFs = {
  readFileSync(path) {
    if (path === ".git/HEAD") {
      return "ref: refs/heads/main\n";
    }

    if (path === ".git/refs/heads/main") {
      return "abcdef1234567890\n";
    }

    throw new Error(`Unexpected path: ${path}`);
  },
};

const fakeOs = {
  hostname() {
    return "test-host";
  },
};

test("createConfig normalizes MQTT settings and runtime metadata", () => {
  const config = vars.createConfig(
    {
      PORT: "3001",
      MQTT_HOST: "broker.local",
      MQTT_PORT: "1884",
      MQTT_TOPIC: "home-energy/#",
      MONITOR_SOLAR: "true",
      MAINS_GAUGES: "false",
      MAINS_COUNTERS: "true",
      MONITOR_EXTENDED: "yes",
      GIT_REF: "main",
      RELEASE_VERSION: "1.2.3",
    },
    {
      fsModule: fakeFs,
      osModule: fakeOs,
      packageVersion: "0.3.1",
    },
  );

  assert.equal(config.port, 3001);
  assert.equal(config.mqttTopic, "home-energy/");
  assert.equal(config.mqttUrl, "mqtt://broker.local:1884");
  assert.equal(config.monitorSolar, true);
  assert.equal(config.useGaugesMains, false);
  assert.equal(config.useCountersMains, true);
  assert.equal(config.monitorExtended, true);
  assert.equal(config.gitSha, "abcdef1");
  assert.equal(config.gitRef, "main");
  assert.equal(config.releaseVersion, "1.2.3");
  assert.equal(config.hostname, "test-host");
});

test("createConfig supports ESPHome MQTT topic layout", () => {
  const config = vars.createConfig({
    MQTT_TOPIC: "prometheus/emonesp",
    MQTT_TOPIC_LAYOUT: "esphome",
    MQTT_DEVICE_NAME: "energy-meter",
  });

  assert.equal(config.mqttTopic, "prometheus/emonesp/");
  assert.equal(config.mqttTopicLayout, "esphome");
  assert.equal(config.mqttDeviceName, "energy-meter");
});

test("parseBoolean rejects invalid boolean values", () => {
  assert.throws(() => vars.parseBoolean("sometimes"), /Invalid boolean value/);
});

test("normalizeMqttTopic removes wildcards and preserves a single trailing slash", () => {
  assert.equal(vars.normalizeMqttTopic("prometheus/#"), "prometheus/");
  assert.equal(vars.normalizeMqttTopic("home/energy/"), "home/energy/");
});

test("parseMqttTopicLayout rejects invalid layout values", () => {
  assert.throws(
    () => vars.parseMqttTopicLayout("unknown"),
    /Invalid MQTT topic layout/,
  );
});
