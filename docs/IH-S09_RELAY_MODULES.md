# Tuya relay module compatibility bench

Local contribution branch based on upstream `develop-0.4.1` (4ba407b).
App ID remains `com.tuya.zigbee`; this is a locally modified development build,
not an official Store release. No upstream changes have been published.

## Scope and evidence

Three exact standard OnOff pairing profiles, with one tile per channel. There
is no additional master, metering, detached input, switch-mode setting or startup
policy setting. Existing drivers and shared runtimes are unchanged. Initialization
uses their existing read/bind/report behavior and does not impose relay states or
write vendor settings.

| Channels | Product | Manufacturers | Evidence |
| --- | --- | --- | --- |
| 2 | TS0002 | `_TZ3000_criiahcg`, `_TZ3000_ywubfuvt`, `_TZ3000_wnzoyohq` | Upstream-derived candidates; no local hardware interview or physical verification |
| 3 | TS0003 | `_TZ3000_mhhxxjrs` | IH-S09 locally interviewed and bench-tested using a separate app; this community-app runtime still needs physical acceptance |
| 3 | TS0003 | `_TZ3000_hbic3ka3`, `_TZ3000_iv4eq7eh` | Upstream-derived candidates; no local physical verification |
| 4 | TS0004 | `_TZ3000_knoj8lpk`, `_TZ3000_5ajpkyq6`, `_TZ3000_3n2minvf` | Upstream-derived candidates; no local hardware interview or physical verification |

`_TZ3000_zxrfobzw` / TS0002 already belongs to upstream's
`switch_2_gang_ts0002`; it is deliberately not duplicated.

Identity sources: the separate local app's exact allowlists, derived from
https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts
and the user's 3-channel Zigbee interview. Candidate identities should be split
from the physically verified contribution if the maintainer requires interviews
for every new pairing identity. Product pictures are user-supplied family artwork,
not proof of an identity or its terminal functionality.

## Interview summary for the physical IH-S09

- Manufacturer `_TZ3000_mhhxxjrs`, model TS0003, appVersion 74, hardware version 1.
- Router, mains powered; local Homey Self-Hosted Server plus Homey Bridge.
- Endpoint 1: profile 0x0104, device 0x0100; input 0,3,4,5,6,0x0702,0x0B04,0xE000,0xE001; output 0x0019,0x000A.
- Endpoints 2 and 3: profile 0x0104, device 0x0100; input 4,5,6; no output clusters.
- Endpoint 242: Green Power, output 0x0021.
- All three standard OnOff endpoints switched independently in prior bench tests.
- S1 momentary input toggled endpoint 1 and reported OnOff state.
- Advertised measurement clusters produced no usable response to a charging laptop load; measurement is not exposed here.

Only the standard control subset is declared in these profiles. Optional vendor,
measurement and Green Power clusters are not required for basic OnOff operation.
No Zigbee network key, login credentials or Homey device identifiers are included.

## Community-app physical acceptance

Pending after local installation:

1. User confirms safe power, loads and reset-button access; re-pairs the module.
2. Confirm exactly three relay tiles, mapped to endpoints 1, 2 and 3.
3. Confirm individual Homey controls and corresponding physical relay operation.
4. Confirm S1 physical input updates relay 1 in Homey.
5. Restart the app and verify state synchronization without commanded switching.
6. Record app version, observed behavior, failures and final output states here.

Switching and physical actions require coordination with the user. Do not infer
that historical bench wiring or load conditions are still current. An interview
alone does not establish output electrical ratings or input isolation.

## Local build validation — 2026-11-15

- Compose generation, supported-device index check and publish-level validation passed.
- Repository tests: 210 total, 207 passed, zero failed, three inherited TODOs.
- Six new checks cover unique pairing identities, generated manifest contracts,
  endpoint mapping and initialization through the actual inherited runtimes with
  optional Basic reads failing. No shared runtime was changed.
- Installed locally as `com.tuya.zigbee` 0.4.1 on the user's Homey Self-Hosted
  Server; app running, enabled, not crashed. All three new profiles visible via
  Homey's driver API. The previous custom app remains installed separately.
- No module reset, pairing or output commands issued during this preparation.
- Physical acceptance with this app is pending user-coordinated pairing.

## Pairing and naming — 2026-11-15

The user paired the physical TS0003 / `_TZ3000_mhhxxjrs` to this app.
Homey created exactly three available devices, one root and two children.
The root initially used the driver's name, `3 Gang Relay Module`; renamed via
Homey's device API to `Relay 1` at the user's request. Children are `Relay 2`
and `Relay 3`. Device IDs and Zigbee token were preserved. No relay commands
were sent. Independent switching and physical-button acceptance are still pending.

Homey's built-in Zigbee pairing uses the driver display name for the root tile.
The Add Device picker retains the descriptive module name, and pairing guidance
now explains renaming the first tile. There is no automatic startup rename.
