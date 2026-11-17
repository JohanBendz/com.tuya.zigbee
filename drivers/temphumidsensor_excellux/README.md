# Excellux NTCHT02 physical support

Exact fingerprint: manufacturer `NTCHT02`, model `Excellux`. Physical test unit: ZG-106NTH, firmware `2026062212`, one CR2450. Issue: https://github.com/JohanBendz/com.tuya.zigbee/issues/1461

- Existing primary `measure_temperature` remains the external probe. `measure_temperature.internal` adds the independent onboard channel. Existing humidity, battery and low-battery capabilities/IDs remain.
- Reuse the existing standard sensor's formatting, probe/humidity offsets and low-battery logic. No shared runtime or global cluster registration is changed.
- Passive initialization: no reads, binds, reporting configuration or sampling write on pairing/restart. The tested local app succeeded with this approach; it does not establish the root cause of other pairing failures. Existing bindings on previously paired devices are not removed.
- Pair: hold the button for 5 seconds until flashing, release, then wait for pairing.
- Advanced setting sampling interval: 5–1200 seconds in steps of 5. The displayed default 60 is not sent until explicitly changed. Wake the sensor before saving. Sampling is not guaranteed transmission cadence. Confirmation shows the latest DP101 actually received, not an assumed acknowledgement of a send.
- EF00 is output/client in the interview. A driver-local handleFrame wrapper decodes incoming datapoints without falsely declaring it input/server or registering a global Tuya cluster. Only explicit sampling changes send a Tuya dataRequest on endpoint 1.

Mapping matches upstream Zigbee2MQTT's explicit NTCHT02 definition:
https://www.zigbee2mqtt.io/devices/ZG-106NTH.html
https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts

DP1 probe /10; DP5 onboard /100; DP4 battery percent; DP118 humidity /100; DP101 sampling seconds. Malformed frames and invalid/out-of-range values are ignored. Raw radio-frame fixtures contain no device/network addresses.

## Physical evidence and limits

A separate local SDK3 app running this protocol on the same unit received both temperatures, humidity, battery, and a DP101=5 confirmation after an initial DP101=600. Standard live temperature reports agree with DP1. Probe-only ice test: 2.9°C; heating/cooling: approximately 22.5–56°C during the first cycle. No earlier multi-degree/possible scaling drops were reproduced during that initial run; this does not prove they are permanently fixed. Local app updates/reinstalls resumed reporting without re-pairing.

This upstream adaptation has automated tests, including actual pinned zigbee-clusters report decoding and captured physical Tuya frames. It has **not** been installed over the running local app, and full Homey reboot, fresh pairing and long-term physical acceptance of this exact upstream branch remain pending. Keep the pull request in draft until acceptance with a maintainer-approved test build.

Original outline artwork follows the owner's reference image and approved preview. Icon interiors are transparent, not white, so monochrome masks retain the outline. PNG product images use the repository's required 75×75 and 500×500 dimensions.
