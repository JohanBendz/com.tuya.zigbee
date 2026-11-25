# Tuya multi-relay module profiles

Three opt-in standard OnOff profiles, with one Homey tile per relay and a shared
input-type setting on Relay 1. Existing drivers and shared Zigbee runtimes are
unchanged. There is no additional master device, metering, detached-input mode or
startup-policy setting. New profiles reuse the existing two-, three- and
four-channel OnOff implementations.

## Exact identities and evidence

| Channels | Product | Manufacturers | Evidence |
| --- | --- | --- | --- |
| 2 | TS0002 | `_TZ3000_criiahcg`, `_TZ3000_ywubfuvt`, `_TZ3000_wnzoyohq` | Upstream-derived candidates; physical acceptance pending |
| 3 | TS0003 | `_TZ3000_mhhxxjrs` | IH-S09 interviewed; pairing and input-type setting confirmed with this app |
| 3 | TS0003 | `_TZ3000_hbic3ka3`, `_TZ3000_iv4eq7eh` | Upstream-derived candidates; physical acceptance pending |
| 4 | TS0004 | `_TZ3000_knoj8lpk`, `_TZ3000_5ajpkyq6`, `_TZ3000_3n2minvf` | Upstream-derived candidates; physical acceptance pending |

`_TZ3000_zxrfobzw` / TS0002 already belongs to `switch_2_gang_ts0002` and is not
claimed again. No wildcard TS000x matching is added. Candidate identities are
based on the Tuya definitions in
https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts
and have not been independently interviewed here. These candidates can be split
from the verified-device contribution if separate interviews are required.

Product pictures are user-supplied family artwork, not evidence of Zigbee identity
or terminal functionality. The supplied 2/3-channel product pictures label the
spare terminal positions S4/L4; the 3-channel unit's original diagram labels those
positions NC. The images are preserved as supplied, not used as wiring guidance.

## Physical IH-S09 interview

- Manufacturer `_TZ3000_mhhxxjrs`, model TS0003, appVersion 74, hardware version 1.
- Router, mains powered; Homey Self-Hosted Server with Homey Bridge.
- Endpoint 1: profile 0x0104, device 0x0100; input clusters 0,3,4,5,6,0x0702,0x0B04,0xE000,0xE001; output 0x0019,0x000A.
- Endpoints 2 and 3: profile 0x0104, device 0x0100; input clusters 4,5,6; no output clusters.
- Endpoint 242: Green Power, output 0x0021.

Only the control subset is declared. Advertised measurement clusters produced no
usable response to a charging-laptop load in earlier bench testing; measurement
capabilities are not exposed. No network keys or account credentials are included.

## Shared input type

The three dedicated profiles use `TuyaRelayModuleInputType`. Relay 1 exposes
`Input type (all inputs)`; child devices explicitly have no settings. The wrapper
checks the actual manufacturer against its driver's exact allowlist and checks
TS0002/TS0003/TS0004 against the channel count before permitting configuration.

Endpoint 1, cluster 0xE001, attribute 0xD030, enum8:

| Mode | Value |
| --- | --- |
| Toggle switch | 0 |
| State-following switch | 1 |
| Momentary push button | 2 |

The setting is module-wide. Startup reads and synchronizes the existing mode,
without writing a default. `Keep current device setting` performs no write.
Changes read the previous value, write the selected mode and confirm readback.
Failures attempt to restore and confirm the previous mode; restoration failure is
reported explicitly. Requests are serialized. Unsupported values and failed
pre-write reads reject the change without configuration writes. Optional read
failures do not block inherited OnOff setup.

An existing pairing made before E001 was added may need re-pairing to obtain the
new endpoint contract. This is unrelated to changing an input-mode value.

## Physical acceptance and remaining checks

The physical 3-channel unit was freshly paired to the modified app. Exactly three
available tiles were created. The user confirmed the input-type setting works.
All tiles use `<N> Gang Relay Module â€” Relay <i>` defaults; Relay 1 controls the
first output, not the whole module. There is no automatic startup rename.

Earlier tests with a separate app verified independent OnOff endpoints, momentary
S1 toggling endpoint 1, and module-wide input configuration. Those earlier tests
are protocol evidence, not a substitute for this app's remaining acceptance:

- Independently switch all three outputs through the community app.
- Verify a physical input updates the corresponding community-app tile.
- Restart and confirm state synchronization without commanded switching.
- Obtain real interviews and physical acceptance for the other eight identities.

Coordinate any output commands and physical actions with the device owner; do not
infer present wiring from historical tests. The physical 2/4-channel variants are
not claimed as bench-tested.

## Automated validation

- New tests cover unique pairing, generated contracts, inherited endpoint mapping,
  every allowlisted identity, initialization without configuration writes,
  unsupported attributes, failed-readback rollback, restoration failures and
  queued writes during reinitialization, removal or shutdown.
- A real `zigbee-clusters` 2.4.1 wire fixture verifies E001/D030 enum8 encoding and
  decoding for all three modes.
- Homey Compose build, supported-device index and publish validation pass.
- Local development build installed and running on Homey Self-Hosted Server.
