# Contributing to Tuya Zigbee for Homey

Thanks for helping improve the app. Tuya hardware has many white-label variants, so good device identity and test information are especially important.

## Before opening an issue

- Search existing issues for the same `manufacturerName` and `modelId` / `productId`.
- Confirm that Homey and the Tuya Zigbee app are up to date.
- For an unsupported device, use the dedicated **New Device Request** template.
- Use the Homey Zigbee Developer Tools to capture a full device interview when relevant.

## Bug reports

Please include:

- Homey model and firmware version.
- Tuya Zigbee app version.
- Retail brand/model when known.
- Zigbee `manufacturerName` and `modelId` / `productId`.
- Steps to reproduce.
- Expected and actual behaviour.
- Relevant logs, diagnostics or Zigbee interview.

## Pull requests

Keep pull requests small and focused.

- Base work on the repository's current default branch unless a maintainer asks otherwise.
- Prefer one device/fix per PR.
- Explain why the change is needed and which device identities are affected.
- Do not hand-edit root `app.json`; edit Homey Compose sources instead.
- Avoid unrelated formatting or generated-file churn.
- Do not enable global Zigbee debug logging or datapoint sniffers in release code.
- If shared code under `lib/` changes, describe which existing driver families may be affected.

Before submitting:

```bash
npm ci
npm test
npm run validate
```

Real-device testing is strongly preferred for Zigbee behaviour changes.

## Adding a device

A retail product name is not sufficient evidence that two Tuya devices behave the same.

Provide:

1. `manufacturerName`
2. `modelId` / `productId`
3. endpoint/cluster interview
4. relevant Tuya datapoints where applicable
5. retail brand/model or purchase link when available

Reuse an existing driver only when the pairing contract and behaviour are compatible.

See [MAINTAINING.md](MAINTAINING.md) for repository architecture and release guidance.
