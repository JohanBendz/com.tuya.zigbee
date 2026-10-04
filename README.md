# Tuya Zigbee for Homey

Connect supported Tuya-manufactured Zigbee devices directly to Homey, without a Tuya gateway. Use sensors, plugs, switches, lights, remotes, curtains and other supported devices in your home automation and Flows.

Tuya devices are sold under many retail brands. Products that look identical can use different Zigbee identities, so compatibility depends on the device's manufacturer and model identifiers rather than its retail name alone.

## Supported devices

See [SUPPORTED_DEVICES.md](SUPPORTED_DEVICES.md) for the compatibility list. Follow the pairing instructions for the matching device in Homey.

## Support and device requests

Please report bugs and request additional devices through [GitHub Issues](https://github.com/JohanBendz/com.tuya.zigbee/issues).

For a bug report, include:

1. Homey model and firmware version.
2. Tuya Zigbee app version.
3. Device brand/model and Zigbee `manufacturerName` and `modelId`, where available.
4. Steps to reproduce, expected behaviour and actual behaviour.
5. Relevant diagnostics or a Zigbee interview.

For an unsupported device, use the New Device Request template and include a full Zigbee interview. The [Homey Developer Tools](https://tools.developer.homey.app/tools/zigbee) can be used to obtain it.

## Contributing

Code contributions, device interviews and feedback are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development instructions and [MAINTAINING.md](MAINTAINING.md) for technical and release guidance.

## License

Released under the [MIT License](LICENSE). This is a community integration and is not an official Tuya application. Tuya and the retail brands represented by supported devices are trademarks of their respective owners.
