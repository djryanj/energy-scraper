# CircuitSetup Split Single Phase Energy Monitor Prometheus Exporter

A containerized Prometheus exporter for the [CircuitSetup Split Single Phase Real Time Whole House Energy Meter](https://circuitsetup.us/index.php/product/split-single-phase-real-time-whole-house-energy-meter-kit-programmed-esp32-2-cts-abs-box/) written in Node.js by [Ryan Jacobs](https://github.com/djryanj). It subscribes to MQTT topics published by the monitor and exposes a `/metrics` endpoint for Prometheus.

This project is compatible with EmonESP-style MQTT publishing and is intended to replace direct scraping from EmonCMS when Prometheus is the time-series backend.

## Running

For local development, use Node.js 24 or newer.

The minimum useful runtime configuration is an MQTT broker host and a base MQTT topic.

```bash
docker run --env MQTT_HOST=<your-mqtt-hostname-or-ip> --env MQTT_TOPIC=<your-mqtt-base-topic> -p 3000:3000 ghcr.io/djryanj/energy-scraper:latest
```

## Dev Container

This repo includes a VS Code devcontainer in [.devcontainer/devcontainer.json](.devcontainer/devcontainer.json).

Use VS Code's Reopen in Container action to start a Node 24 development environment with port 3000 forwarded. The container runs `npm install` after creation.

Once the container is ready, start the app with `npm run dev`.

Run the automated test suite with `npm test`.

Print a terminal coverage summary with `npm run test:coverage`.

Use `npm run test:watch` while iterating locally.

## Repository Files

- [CHANGELOG.md](CHANGELOG.md) tracks notable releases and points to Release Please as the long-term source of generated release history.
- [CONTRIBUTING.md](CONTRIBUTING.md) describes contribution expectations and validation commands.
- [SECURITY.md](SECURITY.md) explains how to report security issues.
- [AI_NOTICE.md](AI_NOTICE.md) describes expectations for AI-assisted changes.
- [.github/CODEOWNERS](.github/CODEOWNERS) defines repository ownership for review routing.
- [renovate.json](renovate.json) configures automated dependency updates for npm, GitHub Actions, and container base images.

## GitHub Automation

This repo now includes GitHub Actions workflows for CI, PR containers, release creation, and release container publishing.

### Continuous Integration

- `CI` runs on pull requests and pushes to `main`.
- It regenerates a clean `package-lock.json`, installs dependencies with `npm ci`, runs `npm run check`, and runs the test suite with coverage.

### Pull Request Containers

- `PR Container` builds a multi-architecture image for non-draft pull requests.
- For pull requests opened from branches in the same repository, it pushes the image to GitHub Container Registry as `ghcr.io/<owner>/energy-scraper:pr-<number>` and `ghcr.io/<owner>/energy-scraper:pr-<number>-<sha>`.
- For pull requests opened from forks, it still performs the build but skips the push for safety.
- `Cleanup PR Container` deletes the PR container versions after the pull request is merged.

### Releases

- `Release Please` runs on pushes to `main` and maintains a release PR plus GitHub Releases.
- Releases are driven by Conventional Commits so the generated changelog and version bump are correct.
- When a GitHub Release is published, `Release Container` builds and pushes the final multi-architecture image to GitHub Container Registry.
- Release container tags include the exact GitHub release tag, the plain version without the `v` prefix, the `major.minor` line, the `major` line, and `latest`.
- The container build workflows bake `RELEASE_VERSION`, `GIT_REF`, and `GIT_SHA` into the image so runtime metadata reflects the actual GitHub release or PR build.

### Release Procedure

Preferred path:
Use this for normal releases. It keeps `package.json`, `package-lock.json`, the Release Please manifest, the GitHub Release, and the container tags aligned automatically.

1. Merge feature and fix branches into `main` using Conventional Commit messages.
2. Wait for the `Release Please` workflow to open or update the release PR.
3. Review the release PR. It will include the version bump and changelog updates.
4. Merge the release PR into `main`.
5. Release Please will create and publish the GitHub Release.
6. The `Release Container` workflow will build and publish the multi-arch image for that release.

Manual fallback:
Use this only when you need to force a specific version bump yourself.

1. Choose the next version:
   - `npm run release:bump:patch`
   - `npm run release:bump:minor`
   - `npm run release:bump:major`
2. Review the resulting changes in `package.json`, `package-lock.json`, and `.release-please-manifest.json`.
3. Commit the version bump and merge it to `main`.
4. From a clean `main` checkout with GitHub CLI authenticated, create the tag and GitHub release draft:
   - `npm run release:draft`
   - or `npm run release:draft -- v0.4.0` to force a specific tag name
5. Publish the GitHub release draft.
6. The `Release Container` workflow will publish the final container image for that release tag.

## Configuration

Configuration is done through environment variables only.

### Configurable Environment Variables

| Variable           | Required | Description                                                                                                                    | Default       |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `MQTT_HOST`        | Yes      | IP address or hostname of the MQTT broker. A scheme such as `mqtt://` or `mqtts://` is allowed.                                | `192.168.1.1` |
| `MQTT_TOPIC`       | Yes      | Base topic for the energy monitor messages. The app normalizes this to a clean base path and strips a trailing `#` if present. | `prometheus/` |
| `MQTT_PORT`        | No       | TCP port for the MQTT broker if not already included in `MQTT_HOST`.                                                           | `1883`        |
| `PORT`             | No       | Internal HTTP listen port.                                                                                                     | `3000`        |
| `MQTT_USERNAME`    | No       | MQTT username.                                                                                                                 | unset         |
| `MQTT_PASSWORD`    | No       | MQTT password.                                                                                                                 | unset         |
| `MONITOR_SOLAR`    | No       | Enable solar-side metrics.                                                                                                     | `false`       |
| `MAINS_GAUGES`     | No       | Publish current-value metrics for mains power and current.                                                                     | `true`        |
| `MAINS_COUNTERS`   | No       | Publish cumulative counter variants for mains power and current.                                                               | `false`       |
| `MONITOR_EXTENDED` | No       | Enable extended monitor metrics such as power factor, temperature, and phase angles.                                           | `false`       |

### Informational Environment Variables

| Variable          | Description                                                                                                           | Default                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `GIT_SHA`         | Short or full git commit SHA to expose in the app and metrics. The GitHub container workflows set this automatically. | local git short SHA or `missingGitSha` |
| `GIT_REF`         | Git ref associated with the running build, such as a branch name, tag name, or PR identifier.                         | `NODE_ENV` or `local`                  |
| `RELEASE_VERSION` | Release identifier to expose in the UI and metrics. For release builds this should match the GitHub Release tag.      | `package.json` version                 |
| `BUILDNUMBER`     | Optional build number override for UI metadata. GitHub Actions run number is used automatically when available.       | `local`                                |

## Network

The app exposes `tcp/3000` by default. Change the `PORT` environment variable if you want a different internal port.

## Endpoints

### Default

`/` provides a lightweight status page with build and configuration metadata.

### Health

`/healthz` returns `200 OK` with `ok` when the app process is running.

### Prometheus

`/metrics` exposes Prometheus-compatible metrics. In addition to Node.js runtime metrics, the scraper exports energy-monitor metrics such as:

- `home_voltage_1`
- `home_voltage_2`
- `home_current_power`
- `home_current_power_counter`
- `home_total_current`
- `home_grid_freq`
- `home_power_factor`
- `home_power_monitor_temp`
- `solar_current_power`
- `solar_total_current`
- `energy_scraper_info{version="<version>",hostname="<hostname>",gitSha="<gitSha>",gitRef="<gitRef>",releaseVersion="<releaseVersion>"}`

Extended metrics are only emitted when `MONITOR_EXTENDED=true`, and solar metrics are only emitted when `MONITOR_SOLAR=true`.

## MQTT Topic Mapping

The scraper subscribes to the base topic plus suffixes such as:

- `grid_house_watts/state`
- `house_l1_volts/state`
- `house_l2_volts/state`
- `house_l1_amps/state`
- `house_l2_amps/state`
- `grid_house_amps/state`
- `freq/state`
- `pf/state`
- `temp/state`
- `freeram/state`

When solar monitoring is enabled it also subscribes to:

- `total_solar_watts/state`
- `total_solar_amps/state`
- `solar_l1_amps/state`
- `solar_l2_amps/state`
- `solar_volts/state`

## Prometheus Config

Here is a sample Prometheus scrape config:

```yaml
- job_name: energy_monitor
  scrape_interval: 5s
  static_configs:
    - targets:
        - <hostname>
```
