
# CircuitSetup Split Single Phase Energy Monitor Prometheus Exporter

A containerized Prometheus exporter/data scraper for the [CircuitSetup Split Single Phase Real Time Whole House Energy Meter](https://circuitsetup.us/index.php/product/split-single-phase-real-time-whole-house-energy-meter-kit-programmed-esp32-2-cts-abs-box/) written in Node.js by [Ryan Jacobs](https://github.com/djryanj). It subscribes to the MQTT topics published by the Energy Meter and provides a ``/metrics`` HTTP endpoint with for Prometheus to scrape.

**Note**: This software should be compatible with any meter running the [OpenEnergyMonitor](https://openenergymonitor.org/) project's [EmonESP](https://github.com/openenergymonitor/EmonESP) software and publishing data to an MQTT broker, although it only subscribes to specific MQTT topics. Since its purpose is to scrape data into a time-series database (in this case, [Prometheus](https://prometheus.io/)), it can replace [EmonCMS](https://emoncms.org/), which is the solution that EmonESP is really designed to communicate with.

# Running

You will need to define at least the environment variable ``MQTT_SERVER`` and ``MQTT_TOPIC`` (``MQTT_USERNAME``,  ``MQTT_PASSWORD``, and ``MQTT_PORT`` may also be required, depending on your MQTT configuration) in order for the container to be useful. You will also need to ensure that port 3000 is available to the container. Further configuration information is available below.

``docker run --env MQTT_HOST=<your-mqtt-hostname-or-ip> --env MQTT_TOPIC=<your-mqtt-base-topic> -p 3000:3000 djryanj/energy-scraper:latest``

## Configuration

Configuration is done via environment variables only.

### Configurable Environment Variables

The following environment variables directly affect the operation of the scraper. Two are required to be set (provided that the defaults aren't sufficient); the rest are optional depending on what features you want to do (and the configuration required for them).

| Variable | Required | Description | Default |
|--|--|--|--|
|``MQTT_HOST`` | Yes| IP or hostname of the MQTT server that the energy monitor is publishing to. **NOTE:** At this time, providing a self-signed certificate file for TLS communications is not supported. If your MQTT server uses PKI from a well-known certificate authority such as letsencrypt (be sure that the WHOLE chain is sent), it should work. However, at this time, cert behaviour is untested. | 192.168.1.1 |
| ``MQTT_TOPIC`` | Yes | Base topic to subscribe to for energy moitor MQTT data. See [MQTT](#mqtt) section for more information. | prometheus/#
|``MQTT_PORT``| No | TCP port that your MQTT broker is listening on. | 1883|
|``PORT`` | No |The port that the container listens on (internally). Be sure to change the port Docker forwards if you change this. | 3000
|``MQTT_USERNAME`` | No | If you need to supply a username for your MQTT server, set it here. | null/unset (works for anonymous servers)
| ``MQTT_PASSWORD`` | No | If you need to supply a password for your MQTT server, set it here. **IMPORTANT!** This will be visible in the logs and if you get container information from the Docker host. You could provide this via Docker secrets. | null/unset (works for anonymous servers)


### Informational Environment Variables

The following environment variables provide information into the scraper but do not affect operation beyond the cosmetic (they are exported with metrics and are visible on the browseable home page). None of these are required.

| Variable | Description | Default |
|--|--|--|
| ``BUILDID`` | The BUILDID is intended to be passed in from an automation pipeline such as Azure DevOps and should be equivalent to the git hash (this was mostly used during development; a future release may hide this for production builds). The BUILDID can be read from the local .git directory, but that is not present in the Docker container. |missingBuildId (when nothing is passed to Docker or the .git directory is not present locally); otherwise the 7-character git hash representing the commit used to build the image.
| ``BUILDNUMBER`` | The BUILDNUMBER is intended to be passed in from an automation pipeline such as Azure DevOps and should be equivalent to the automated build number, e.g. 20190910.1. | local
| ``SOURCEBRANCHNAME`` | The SOURCEBRANCHNAME is intended to be passed in from an automation pipeline such as Azure DevOps and should be equivalent to the git branch that the container was built from, e.g. master. | local

## Network

Exposes port tcp/3000 by default. Change the ``PORT`` environment variable if you want to change it. Leverage something like [jwilder/nginx-proxy](https://hub.docker.com/r/jwilder/nginx-proxy/) to automatically forward a hostname from the Docker host's port 80 or 443 to this container.  

# Endpoints

## Default
There is a default cosmetic endpoint at ``/`` (e.g. http://docker-host:3000/) that will respond if the scraper is up. No data is available on that page except for build information.

## Prometheus
Prometheus expects an endpoint at ``/metrics``, which is where it is. In addition to the custom metrics provided by this scraper, there are node.js-specific metrics exported as well that are not presented here. You can browse the endpoint if you wish.

All metrics are prefixed by ``home_`` (except one). The list of metrics is below (including the prefix for clarity).

### Metrics

|Metric|Description|MQTT Topic from Energy Meter * |
|--|--|--|
|``home_voltage_1``| Current voltage on leg 1 of the home power feed in Volts (V).| V1|
|``home_voltage_2``| Current voltage on leg 2 of the home power feed in Volts (V).| V2|
|``home_current_power``| Current total home power usage in Watts (W)| W|
|``home_current_1``| Current amperage (current) on leg 1 of the home power feed in Amps (A).| CT1|
|``home_current_2``| Current amperage (current) on leg 2 of the home power feed in Amps (A).| CT2 |
|``home_total_current``| Total amperage (current) for the home in Amps (A).| totI | 
|``home_power_factor``| Power factor of the home power feed.| PF | 
|``home_power_monitor_temp``| Current temperature of the home power feed in degrees C| temp | 
|``home_grid_freq``| Current grid frequency for home power feed in Hertz (Hz)| freq | 
|``home_power_monitor_free_ram``| Power monitor free RAM in bytes (b)| freeram | 
|``energy_scraper_info{version="<version>",hostname="<hostname>",buildId="<buildId>"}``| Version and other information. |

*Note: The MQTT topics represented here as published by the Energy Meter are prefaced by the MQTT Base Topic entered into the EmonESP interface, e.g. ``emon/emonesp``

## MQTT

When configured to do so (and I hope that it is otherwise why are you here), the Energy Monitor will publish its data to a base topic and a series of other topics. This is configurable within either the EmonESP's configuration web page or by hard coding it into the [code](https://github.com/CircuitSetup/Split-Single-Phase-Energy-Meter) and compiling your own firmware. This scraper will only read the topics identified in the [metrics](#metrics) section above.

This scraper does not publish any data of its own.

# Prometheus Config

Here is a sample config block for Prometheus:

```
- job_name: energy_monitor
  scrape_interval: 5s
  static_configs:
  - targets:
    - <hostname>
```
