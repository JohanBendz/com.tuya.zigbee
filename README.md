# Tuya Zigbee for Homey

Actively maintained, community-driven support for Tuya-manufactured Zigbee devices connected directly to Homey, without a Tuya gateway.

Tuya hardware is sold under many different brands and model names. For that reason this app identifies compatibility primarily from the device's Zigbee identity and endpoint/cluster structure rather than from the retail name printed on the box.

## What this app does

- Pairs supported Tuya Zigbee devices directly with Homey.
- Provides Homey capabilities for sensors, plugs, switches, lights, remotes, curtains, thermostats, sirens and other supported device classes.
- Implements Tuya-specific Zigbee clusters and datapoints where standard Zigbee behaviour is not sufficient.
- Supports a large community-maintained set of Tuya manufacturer/product identities.

## Supported devices

The compatibility list has moved to **[SUPPORTED_DEVICES.md](SUPPORTED_DEVICES.md)** so it remains easy to find without turning the project README into a very large device database.

The driver manifests under `drivers/*/driver.compose.json` are the authoritative source for Homey pairing. The supported-device document is maintained as a human-readable buying and compatibility reference.

Because Tuya products are frequently rebranded, two products that look identical can expose different Zigbee identities, while the same Zigbee device can be sold under several brands.

## Reporting bugs

Please use GitHub Issues and include:

1. Homey model and firmware version.
2. Tuya Zigbee app version.
3. Retail brand/model when known.
4. Zigbee `manufacturerName` and `modelId` / `productId`.
5. What you expected to happen.
6. What actually happened.
7. Relevant logs or a Zigbee interview where applicable.

For unsupported devices, use the dedicated **New Device Request** issue template and include a full Zigbee interview.

## Development

The app uses Homey SDK 3, Homey Compose, `homey-zigbeedriver` and `zigbee-clusters`.

For current Homey development, Node.js 22 is recommended because Homey v12.9.0 and newer run apps on Node.js 22.

Common commands:

```bash
npm ci
npm test
npm run validate
npm run run
```

### Homey Compose

The source manifest lives in `.homeycompose/` and the driver compose files.

**Do not edit root `app.json` manually.** Homey Compose generates that file. It remains tracked in this repository as a generated baseline, so unrelated regenerated changes should not be mixed into normal pull requests.

### Repository structure

- `.homeycompose/` — app-level Compose metadata, capabilities and Flow cards.
- `drivers/` — Homey drivers and their pairing manifests.
- `lib/` — shared Tuya/Zigbee protocol helpers, custom clusters and datapoint definitions.
- `locales/` — translations.
- `SUPPORTED_DEVICES.md` — human-readable compatibility reference.
- `MAINTAINING.md` — maintainer notes, release workflow and architecture guidance.
- `README.txt` — Homey App Store long-form description.
- `.homeychangelog.json` — Homey release notes keyed by app version.

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a pull request.

Small, focused changes are strongly preferred. Device additions should include the Zigbee identity/interview that justifies the pairing manifest. Changes to shared Tuya datapoint or cluster code should explain which existing device families may be affected.

## License and credits

Released under the [MIT License](LICENSE).

Thanks to everyone who has contributed code, device interviews, testing and diagnostics over the years. Individual code contributors remain credited in the repository history and release history.

Tuya and the many retail brands represented by supported devices are trademarks of their respective owners. This is a community Homey integration and is not an official Tuya application.
