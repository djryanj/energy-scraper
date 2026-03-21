const fs = require("fs");
const os = require("os");

const packageVersion = require("../package.json").version;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function parseInteger(value, fallback, { min, max } = {}) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  if (min !== undefined && parsedValue < min) {
    throw new Error(`Value must be >= ${min}: ${value}`);
  }

  if (max !== undefined && parsedValue > max) {
    throw new Error(`Value must be <= ${max}: ${value}`);
  }

  return parsedValue;
}

function normalizeMqttTopic(value, fallback = "prometheus") {
  const topic = (value || fallback)
    .trim()
    .replace(/#$/u, "")
    .replace(/\/+$/u, "");

  if (!topic) {
    return `${fallback}/`;
  }

  return `${topic}/`;
}

function getLocalGit(fsModule = fs) {
  try {
    const rev = fsModule.readFileSync(".git/HEAD", "utf8").trim();

    if (!rev.includes(":")) {
      return rev.substring(0, 7);
    }

    const gitRef = rev.substring(5);
    return fsModule
      .readFileSync(`.git/${gitRef}`, "utf8")
      .trim()
      .substring(0, 7);
  } catch {
    return "missingGitSha";
  }
}

function toShortGitSha(value) {
  return String(value || "")
    .trim()
    .substring(0, 7);
}

function buildMqttUrl(host, port) {
  const trimmedHost = host.trim();
  const hasProtocol = /^[a-z]+:\/\//iu.test(trimmedHost);
  const mqttUrl = new URL(hasProtocol ? trimmedHost : `mqtt://${trimmedHost}`);

  if (!mqttUrl.port) {
    mqttUrl.port = String(port);
  }

  return mqttUrl.toString().replace(/\/$/u, "");
}

function createConfig(
  env = process.env,
  dependencies = { fsModule: fs, osModule: os, packageVersion },
) {
  const {
    fsModule,
    osModule,
    packageVersion: version = packageVersion,
  } = dependencies;
  const hostname = osModule.hostname();
  const port = parseInteger(env.PORT, 3000, { min: 1, max: 65535 });
  const mqttHost = (env.MQTT_HOST || "192.168.1.1").trim();
  const mqttPort = parseInteger(env.MQTT_PORT, 1883, { min: 1, max: 65535 });
  const mqttUserName = env.MQTT_USERNAME || null;
  const mqttPass = env.MQTT_PASSWORD || null;
  const mqttTopic = normalizeMqttTopic(env.MQTT_TOPIC, "prometheus");
  const monitorSolar = parseBoolean(env.MONITOR_SOLAR, false);
  const useGaugesMains = parseBoolean(env.MAINS_GAUGES, true);
  const useCountersMains = parseBoolean(env.MAINS_COUNTERS, false);
  const monitorExtended = parseBoolean(env.MONITOR_EXTENDED, false);
  const gitSha = env.GIT_SHA
    ? toShortGitSha(env.GIT_SHA)
    : env.GITHUB_SHA
      ? toShortGitSha(env.GITHUB_SHA)
      : env.BUILDID
        ? toShortGitSha(env.BUILDID)
        : getLocalGit(fsModule);
  const gitRef =
    env.GIT_REF ||
    env.GITHUB_REF_NAME ||
    env.SOURCEBRANCHNAME ||
    env.NODE_ENV ||
    "local";
  const releaseVersion =
    env.RELEASE_VERSION ||
    (env.GITHUB_REF_TYPE === "tag" && env.GITHUB_REF_NAME
      ? env.GITHUB_REF_NAME
      : version);
  const buildNumber = env.GITHUB_RUN_NUMBER || env.BUILDNUMBER || "local";
  const vers = `${releaseVersion}-${gitRef}-${gitSha}`;
  const mqttUrl = buildMqttUrl(mqttHost, mqttPort);

  return {
    hostname,
    port,
    mqttHost,
    mqttPort,
    mqttUrl,
    mqttUserName,
    mqttPass,
    mqttTopic,
    monitorSolar,
    useGaugesMains,
    useCountersMains,
    monitorExtended,
    gitSha,
    gitRef,
    releaseVersion,
    buildNumber,
    vers,
    toPublicConfig() {
      return {
        port,
        mqttUrl,
        mqttTopic,
        monitorSolar,
        useGaugesMains,
        useCountersMains,
        monitorExtended,
        hostname,
        gitSha,
        gitRef,
        releaseVersion,
        buildNumber,
        vers,
      };
    },
  };
}

const config = createConfig();

module.exports = {
  ...config,
  parseBoolean,
  parseInteger,
  normalizeMqttTopic,
  buildMqttUrl,
  toShortGitSha,
  createConfig,
  getLocalGit,
};
