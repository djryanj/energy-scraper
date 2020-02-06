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

const solarV = new client.Counter({
    name: "solar_voltage",
    help: "Current voltage of the solar power feed in Volts (V)."
});

const solarW = new client.Counter({
    name: "solar_current_power_meter",
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

const solarTotI = new client.Counter({
    name: "solar_total_current",
    help: "Total amperage (current) for solar in in Amps (A)"
});

const wCounter = new client.Counter({
    name: "home_current_power_counter",
    help: "Current total home power usage in Watts (W)."
});

const CT1Counter = new client.Counter({
    name: "home_current_1_counter",
    help: "Current amperage (current) on leg 1 of the home power feed in Amps (A)."
});

const CT2Counter = new client.Counter({
    name: "home_current_2_counter",
    help: "Current amperage (current) on leg 2 of the home power feed in Amps (A)."
});

const totICounter = new client.Counter({
    name: "home_total_current_counter",
    help: "Total amperage (current) for the home in Amps (A)"
});

const PF = new client.Gauge({
    name: "home_power_factor",
    help: "Power factor of the home power feed.",
})

const temp = new client.Counter({
    name: "home_power_monitor_temp",
    help: "Current temperature of the home power feed in degrees C",
})

const freq = new client.Counter({
    name: "home_grid_freq",
    help: "Current grid frequency for home power feed in Hertz (Hz)",
})

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

const freeram = new client.Counter({
    name: "home_power_monitor_free_ram",
    help: "Power monitor free RAM in bytes (b)",
})

const scraperVersion = new client.Counter({
    name: "energy_scraper_info",
    help: "Energy scraper version information",
    labelNames: [ 'version' , 'hostname', 'buildId' ]
})

register.registerMetric(V1);
register.registerMetric(V2);
register.registerMetric(W);
register.registerMetric(CT1);
register.registerMetric(CT2);
register.registerMetric(totI);
register.registerMetric(solarV);
register.registerMetric(solarW);
register.registerMetric(solarCT1);
register.registerMetric(solarCT2);
register.registerMetric(solarTotI);
register.registerMetric(wCounter);
register.registerMetric(CT1Counter);
register.registerMetric(CT2Counter);
register.registerMetric(totICounter);
register.registerMetric(PF);
register.registerMetric(temp);
register.registerMetric(freq);
register.registerMetric(FundPow);
register.registerMetric(HarPow);
register.registerMetric(ReactPow);
register.registerMetric(AppPow);
register.registerMetric(PhaseA);
register.registerMetric(PhaseC);
register.registerMetric(freeram);
register.registerMetric(scraperVersion);

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
                    W.set(parseFloat(message));
                    wCounter.set(abs(parseFloat(message)));
                    break;
                case volts1:
                    V1.set(parseFloat(message));
                    break;
                case volts2:
                    V2.set(parseFloat(message));
                    break;
                case current1:
                    CT1.set(parseFloat(message));
                    CT1Counter.set(abs(parseFloat(message)));
                    break;
                case current2:
                    CT2.set(parseFloat(message));
                    CT2Counter.set(abs(parseFloat(message)));
                    break;
                case totalCurrent:
                    totI.set(parseFloat(message));
                    totICounter.set(abs(parseFloat(message)));
                    break;
                case solarVolts:
                    solarV.set(parseFloat(message))
                    break;
                case solarWatts:
                    solarW.set(parseFloat(message))
                    break;
                case solarTotalCurrent:
                    solarTotI.set(parseFloat(message))
                    break;
                case solarCurrent1:
                    solarCT1.set(parseFloat(message))
                    break;
                case solarCurrent2:
                    solarCT2.set(parseFloat(message))
                    break;
                case powerFactor:
                    PF.set(parseFloat(message));
                    break;
                case fundamentalPower:
                    FundPow.set(parseFloat(message));
                    break;
                case harmonicPower:
                    HarPow.set(parseFloat(message));
                    break;
                case reactivePower:
                    ReactPow.set(parseFloat(message));
                    break;
                case phase1:
                    PhaseA.set(parseFloat(message));
                    break;
                case phase2:
                    PhaseC.set(parseFloat(message));
                    break;
                case temperature:
                    temp.set(parseFloat(message));
                    break;
                case frequency:
                    freq.set(parseFloat(message));
                    break;
                case ramfree:
                    freeram.set(parseInt(message));
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
        scraperVersion.labels(vars.vers, vars.hostname, vars.azureBuildNumber).set(1);
        res.set('Content-Type', register.contentType);
        res.send(register.metrics());
    } catch (e) {
        next(e);
    }  
});

module.exports = router;