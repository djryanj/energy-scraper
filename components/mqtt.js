/**
 * Implements MQTT export functionality of scraper metrics
 */

var mqtt = require('async-mqtt')
const vars = require("./vars");

const mqttConnectString = vars.mqttHost + ":" + vars.mqttPort;
const baseTopic = vars.mqttTopic;
const topics = [
    baseTopic+'/W',
    baseTopic+'/V1',
    baseTopic+'/V2',
    baseTopic+'/CT1',
    baseTopic+'/CT2',
    baseTopic+'/totI',
    baseTopic+'/PF',
    baseTopic+'/temp',
    baseTopic+'/freq',
    baseTopic+'/freeram',
]


var results = {};

const mqttReports = async () => {
    const client = await mqtt.connect(mqttConnectString, {
        username: vars.mqttUserName,
        password: vars.mqttPass
    })
    
    const mqttResults = {};
    try {
        client.on("connect", () => {
            var d = new Date();
            console.log("Getting metrics from MQTT server " + mqttConnectString + " at " + d.toISOString() + "; base topic: " + baseTopic);
        });

        await client.subscribe(topics);
        client.on('message', function (topic, message) {
            mqttResults[topic.toString()] = message.toString();
            return returnResults(mqttResults);
        })
        setTimeout(function() {
            client.end()
        }, 1200)
    } catch (e) {
        console.log(e.stack);
    }
}

function returnResults(mqttResults) {
    results = mqttResults;
}
 
module.exports = mqttReports, results;