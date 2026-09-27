---
name: Tuya Zigbee - New Device Request
about: Request support for a Tuya Zigbee device that is not currently supported
title: "Device Request - [device] - [manufacturerName] / [modelId]"
labels: New Device
assignees: ''

---

## Before submitting

- Search open and closed issues for the same `manufacturerName` and `modelId` / `productId`.
- You need physical access to the device so behaviour can be verified.
- Pair the device as a generic Zigbee device when necessary and capture a full Zigbee interview.

## Retail device information

- Brand:
- Product name:
- Model number:
- Purchase/product link:
- Short description:

## Zigbee identity

- `manufacturerName`:
- `modelId` / `productId`:

## Zigbee interview

Paste the complete Homey Zigbee interview below.

```json

```

## Observed behaviour

Describe what works or does not work when paired as a generic Zigbee device, including any relevant datapoints/logs.

## Additional context

Add photos, manuals, Zigbee2MQTT/Home Assistant references or other protocol information if available.

### How to capture an interview

1. Pair the device with Homey.
2. Open Homey Developer Tools and select **Zigbee**.
3. Find the device in the nodes table.
4. Run **Interview** while the device is online/awake.
5. Copy the resulting JSON and paste it above.

For battery-powered sleepy devices, keep the device awake while interviewing when the manufacturer provides a wake-up procedure.
