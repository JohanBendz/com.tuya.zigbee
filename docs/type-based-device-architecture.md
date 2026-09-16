# Type-based device architecture

## Goal

Stop scaling the app by adding one Homey driver for every physical Tuya product.

New devices should instead be added as profiles under a small set of functional
Homey drivers, for example:

- Light
- Switch
- Socket
- Remote
- Sensor
- Thermostat
- Curtain
- Siren
- Irrigation

The Homey driver represents what the device *is*. A device profile represents
how a specific Tuya model behaves.

## Migration rule

Existing drivers and already paired devices are not migrated as part of this
architecture change.

The rollout is intentionally additive:

1. Keep all existing drivers unchanged.
2. Add new type-based drivers only for newly supported devices.
3. Let the new architecture prove itself in production.
4. Deprecate legacy drivers from pairing only when the corresponding type
   driver is known to be safe.
5. Existing paired devices remain on their original driver.

This avoids breaking installed devices, capability order, settings or Flows.

## Architecture

```text
Homey Zigbee matching
        |
        v
Functional driver (Light, Switch, Sensor, ...)
        |
        v
Zigbee identity resolver
        |
        v
DeviceProfileRegistry
        |
        +--> protocol family
        +--> capabilities
        +--> Tuya datapoints / ZCL mappings
        +--> quirks
        +--> settings defaults
        +--> diagnostics
        |
        v
Shared device implementation
```

Homey still owns Zigbee pairing. The app does not replace Homey's Zigbee
matching. The type driver must therefore still declare the Zigbee identities
and endpoint/cluster footprint that Homey needs for pairing.

After pairing, the app resolves the exact behaviour profile.

## Identity

A Tuya `productId` / Basic-cluster `modelId` is not unique enough to select
behaviour.

The current app already proves this. `TS0502A` is used by both tunable-white
lights and an RGB floor light.

The minimum profile key is therefore:

```text
manufacturerName + productId
```

The registry supports matcher groups so Homey's current array matching can be
represented without repeating the full profile.

When required, the profile model can later be extended with an endpoint/cluster
signature. That should be used only where the manufacturer/product identity is
not sufficient.

## Profile shape

Example:

```js
{
    id: 'light-example',
    deviceType: 'light',
    protocol: 'zcl-light',
    status: 'active',

    capabilities: [
        'onoff',
        'dim',
        'light_temperature',
    ],

    matchers: [{
        manufacturerName: ['_TZ3000_example'],
        productId: ['TS0502A'],
    }],

    quirks: {},
}
```

The profile is data. Protocol implementation belongs in shared code.

## Current proof set

The first reference set contains the 15 existing light drivers that use
`TuyaZigBeeLightDevice`.

They compile to 45 exact manufacturer/product matches without collisions.

These profiles have:

```text
status: legacy-reference
```

and are not connected to a new Homey driver. They therefore cannot change
current pairing behaviour.

The reference set exists to prove that the profile model can represent the
current app before the first live type-based device is added.

## Capabilities

A type driver should define only the capabilities that are guaranteed for the
whole type/family.

Profile-specific capabilities are added before the shared device implementation
registers its capability listeners.

The current helper only adds missing capabilities.

It deliberately does **not** automatically remove capabilities. Removing a
capability from an installed Homey device can break existing Flows and must be
handled as an explicit migration.

## Protocol families

A functional type does not imply one protocol implementation.

For example, `Switch` may eventually contain separate protocol families:

```text
Switch
  +-- standard-zcl
  +-- multi-endpoint-zcl
  +-- tuya-dp
```

The user-facing model can still be "Switch", while the implementation selects
the correct protocol family from the profile.

This is important for Tuya because devices that look identical to a user may
represent channels either as Zigbee endpoints or as Tuya datapoints.

## First live implementation

The first live type driver should be `Light`.

The existing light code is already close to the target architecture because the
current device-specific classes contain almost no implementation and delegate
to `TuyaZigBeeLightDevice`.

The first *newly supported* light should therefore be added as:

1. A matcher in the Light driver's Zigbee manifest.
2. An `active` light profile.
3. No new device-specific `device.js`.
4. No new physical-product driver.

Only after this works on real hardware should existing light drivers be hidden
from new pairing.

## Next extensions

After the Light path is proven:

1. Add endpoint/cluster fingerprints to profiles.
2. Add Tuya datapoint mappings to profiles.
3. Add diagnostics for unknown profiles and unknown datapoints.
4. Introduce Switch as the first mixed-protocol type.
5. Introduce Remote using BoundClusters where possible.
6. Gradually turn repeated device-specific JavaScript into declarative profile
   data.

## Design rule

A new physical Tuya product should not create a new Homey driver unless its
Homey pairing contract or protocol architecture cannot be represented safely by
an existing functional type/family.
