/*
* vars.js
* provides some functions for getting variables that should be globally available
*
*/
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();
const npm_vers = require('../package.json').version

// set these vars if you need to
const mqttHost = "mqtt://" + (process.env.MQTT_HOST || "192.168.1.1")
const mqttPort = process.env.MQTT_PORT || "1883";
const mqttUserName = process.env.MQTT_USERNAME || null;
const mqttPass = process.env.MQTT_PASSWORD || null;
const mqttTopic = process.env.MQTT_TOPIC || "prometheus/#";
const monitorSolar = process.env.MONITOR_SOLAR || false;
const useGaugesMains = process.env.MAINS_GAUGES || true;
const useCountersMains = process.env.MAINS_COUNTERS || false;
const monitorExtended = process.env.MONITOR_EXTENDED || false;

function getLocalGit() {
    try {
        const rev = fs.readFileSync('.git/HEAD').toString();
        if (rev.indexOf(':') === -1) {
            return rev;
        } else {
            return fs.readFileSync('.git/' + rev.substring(5, rev.length - 1)).toString().substring(0, 7);
        }
    } catch (e) {
        return "missingBuildId";
    }
}

// when running in a docker container, pass in the BUILDID which will
// be equal to the short git commit ID. The .git folder is explicitly
// dockerignore'd, so the relevant information will not otherwise be
// available inside the container.

if (process.env.BUILDID) {
    var gitCommit = (process.env.BUILDID).toString().substring(0, 7);
} else {
    var gitCommit = getLocalGit();
}

const azureBuildNumber = process.env.BUILDNUMBER || "local";
const environment = process.env.SOURCEBRANCHNAME || "local";
const vers = npm_vers + "-" + environment + "-" + gitCommit;

module.exports = {
    azureBuildNumber : azureBuildNumber,
    vers : vers,
    hostname : hostname,
    mqttHost : mqttHost,
    mqttPort : mqttPort,
    mqttPass : mqttPass,
    mqttUserName : mqttUserName,
    mqttTopic : mqttTopic,
    monitorSolar : monitorSolar,
    useGaugesMains, useGaugesMains,
    useCountersMains : useCountersMains,
    monitorExtended : monitorExtended,
}