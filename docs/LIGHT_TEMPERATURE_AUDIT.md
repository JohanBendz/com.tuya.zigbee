# Color-temperature code audit — issue #1502

**Date:** 2026-10-01. **Baseline:** `develop-0.4` at `37e95b8` (before the audit). **Scope:** investigation and tests only; there is NO production code, pairing, manifest, dependency, Homey Store or release change in this audit. Do not classify this audit as adding a supported device or fixing existing CCT behavior.

## Triple check: source / physical evidence / SDK

1. **Actual app code:** `lib/TuyaZigBeeLightDevice.js` defines `MAX_COLORTEMPERATURE=254`; the color-temp capability set parser uses `round(x*254)`, report parser uses `1-m/254`, while `changeColorTemperature(x)` and the `light_mode=temperature` path use `round(254-x*254)`. `onEndDeviceAnnounce()` uses `1-m/254`. `changeColorTemperature` also sends proprietary `tuyaRgbMode({ enable: 0 })` before a standard Color Control `moveToColorTemperature` command. The executable test `test/light-temperature-audit.test.js` loads and invokes the real source through an isolated mock: it characterizes legacy behavior, NOT the desired fix.
2. **Impact search:** the following **15 existing** light-temperature profiles directly inherit the shared runtime without overriding these methods: `dimmable_led_strip`, `dimmable_recessed_led`, `rgb_bulb_E14`, `rgb_bulb_E27`, `rgb_ceiling_led_light`, `rgb_floor_led_light`, `rgb_led_light_bar`, `rgb_led_strip`, `rgb_mood_light`, `rgb_spot_GU10`, `rgb_spot_GardenLight`, `rgb_wall_led_light`, `tunable_bulb_E14`, `tunable_bulb_E27`, `tunable_spot_GU10`. Changing this shared file or removing all F0 handling affects existing paired device types.
3. **Independent physical records:** #113 TS0502A has actual `colorTemperatureMireds=255`; #271 TS0501A has `153`; #178, a **different EF00-capable TS0502B family**, explicitly reports `colorTempPhysicalMinMireds=153` and `colorTempPhysicalMaxMireds=500`. These are readings/interview attributes, not confirmation of each #113/#271 product's full physical range. Never silently use 153–500 for *every* Tuya lamp.
4. **Official Homey documentation:** Homey's `ZigBeeLightDevice.changeColorTemperature(temperature)` accepts a normalized 0–1 value. The official Light best practices require correct externally reported state and prohibit changing ON/OFF solely as a side effect of changing color/temperature. Sources: https://athombv.github.io/node-homey-zigbeedriver/ZigBeeLightDevice.html and https://apps.developer.homey.app/the-basics/devices/best-practices/lights. Homey's Zigbee documentation covers endpoint bindings/cluster input vs output: https://apps.developer.homey.app/wireless/zigbee.

### Reproducible legacy behavior (NOT expected future behavior)

| Code path in real runtime | Homey input 0 | Homey input 1 | Additional observation |
| --- | ---: | ---: | --- |
| Registered `light_temperature.setParser` | **0 mired** | **254 mired** | Direct fallback/individual-set mapping. |
| `changeColorTemperature` grouped path | **254 mired** | **0 mired** | Sends proprietary `tuyaRgbMode({enable:0})` first, then standard command. |
| `light_mode=temperature` | Uses `round(254 - storedHomeyValue*254)` | — | Also invokes vendor mode first. |
| Registered report parser / end-device announce | — | — | `1 - mired/254`; actual #113 reading **255** becomes approximately **-0.00394**; 500 becomes approximately **-0.9685**. |

The two set paths are *opposite* at both endpoints regardless of the precise temperature scale interpretation. A vendor mode command failure can prevent the standard command because the latter occurs after the awaited vendor command; this is a conditional code-path risk, **not verified failure for any specific #113/#271 device**. Source tests already assert vendor mode use for parts of the legacy light runtime in `test/repository.test.js`.

## Safe implementation path — still pending

- **Do not change `TuyaZigBeeLightDevice` globally as part of adding #113/#271.** In particular, don't simply replace constant 254 with 500: that leaves opposite set-parser/change paths, the report parser, `light_mode`, and `onEndDeviceAnnounce` inconsistent. Blindly deleting F0 might break existing RGB.
- Inspect the actual installed `homey-zigbeedriver@2.1.4` `ZigBeeLightDevice` code/contract before selecting an **isolated standard-CCT-only runtime candidate**; official documentation provides an appropriate reference, not automatic proof that every hardware variant supports identical limits.
- If implementing an isolated candidate, use exact `TS0502A` identities under #113 (four original physical interviews), separately exact `TS0501A` identities under #271 (four original physical interviews, including one in #273 comment). Never pair by a manufacturer-only wildcard or broaden unrelated RGB profiles. No invented RGB capabilities, unknown vendor settings or assumed min/max ranges.
- Physical acceptance **per fingerprint:** verify its exact Homey `ids` and read Color Control physical min/max if available, cold/warm direction and clamping, set/get/report round trip, on/off and dim/Level Control, local reporting, grouping/Flow actions, restart/power cycle, and whether vendor F0 is actually necessary before enabling it.
- Keep #178's EF00-capable TS0502B profiles outside the standard-only pilot. A later shared-runtime migration would require representative installed RGB, CCT, strip and spot regression coverage on actual Homey hardware.
- Characterization tests deliberately assert today's flawed mapping; when implementing a correction, replace those snapshots with behavior/acceptance assertions and resolve the three TODO tests intentionally.

**Decision gate:** #1502 is an independent technical blocker/tracking issue. #113/#271 remain OPEN and **not implemented** until a separately verified standard-CCT path is ready. `modernize-2026-issues` remains frozen on published 0.3.1 Test; `SDK3` remains Live 0.2.76.
