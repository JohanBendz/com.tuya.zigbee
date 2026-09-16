'use strict';

const assert = require('assert');

const DeviceProfileRegistry = require('../lib/deviceProfiles/DeviceProfileRegistry');
const lightProfiles = require('../lib/deviceProfiles/lightProfiles');
const {
    ensureProfileCapabilities,
} = require('../lib/deviceProfiles/DeviceProfileCapabilities');
const {
    findBasicCluster,
    readZigbeeIdentity,
    resolveZigbeeProfile,
} = require('../lib/deviceProfiles/ZigbeeProfileResolver');

const tests = [];

function testCase(name, fn) {
    tests.push({ name, fn });
}

testCase('loads all legacy light profiles without collisions', () => {
    const registry = new DeviceProfileRegistry(lightProfiles);

    assert.strictEqual(registry.size, 15);
    assert.strictEqual(registry.matchCount, 45);
});

testCase('resolves a color light by manufacturerName and productId', () => {
    const registry = new DeviceProfileRegistry(lightProfiles);
    const profile = registry.resolve({
        manufacturerName: '_TZ3000_dbou1ap4',
        productId: 'TS0505A',
    });

    assert(profile);
    assert.strictEqual(profile.sourceDriver, 'rgb_bulb_E27');
    assert(profile.capabilities.includes('light_hue'));
    assert(profile.capabilities.includes('light_saturation'));
});

testCase('manufacturerName is required because Tuya reuses productId across behaviours', () => {
    const registry = new DeviceProfileRegistry(lightProfiles);

    const colorProfile = registry.resolve({
        manufacturerName: '_TZ3000_8uaoilu9',
        productId: 'TS0502A',
    });

    const whiteProfile = registry.resolve({
        manufacturerName: '_TZ3000_49qchf10',
        productId: 'TS0502A',
    });

    assert(colorProfile);
    assert(whiteProfile);
    assert(colorProfile.capabilities.includes('light_hue'));
    assert(!whiteProfile.capabilities.includes('light_hue'));
});

testCase('returns null for an unknown device identity', () => {
    const registry = new DeviceProfileRegistry(lightProfiles);

    assert.strictEqual(registry.resolve({
        manufacturerName: '_TZ3000_unknown',
        productId: 'TS9999',
    }), null);
});

testCase('rejects exact identity collisions between profiles', () => {
    const profile = {
        id: 'first',
        deviceType: 'light',
        protocol: 'zcl-light',
        capabilities: ['onoff'],
        matchers: [{
            manufacturerName: ['_TZ3000_collision'],
            productId: ['TS0505A'],
        }],
    };

    const conflictingProfile = {
        ...profile,
        id: 'second',
    };

    assert.throws(
        () => new DeviceProfileRegistry([profile, conflictingProfile]),
        /Device profile collision/,
    );
});

testCase('adds only profile capabilities that are missing on the Homey device', async () => {
    const capabilities = new Set(['onoff', 'dim']);
    const added = [];

    const device = {
        hasCapability: capability => capabilities.has(capability),
        addCapability: async capability => {
            capabilities.add(capability);
            added.push(capability);
        },
    };

    const addedCapabilities = await ensureProfileCapabilities(device, {
        capabilities: [
            'onoff',
            'dim',
            'light_hue',
            'light_saturation',
            'light_temperature',
            'light_mode',
        ],
    });

    assert.deepStrictEqual(addedCapabilities, [
        'light_hue',
        'light_saturation',
        'light_temperature',
        'light_mode',
    ]);
    assert.deepStrictEqual(added, addedCapabilities);
});

testCase('finds the Basic cluster independently of endpoint number', () => {
    const basicCluster = {};
    const result = findBasicCluster({
        endpoints: {
            11: { clusters: { basic: basicCluster } },
            1: { clusters: { onOff: {} } },
        },
    });

    assert.deepStrictEqual(result, {
        endpointId: 11,
        cluster: basicCluster,
    });
});

testCase('reads Zigbee identity from the Basic cluster', async () => {
    const identity = await readZigbeeIdentity({
        endpoints: {
            3: {
                clusters: {
                    basic: {
                        readAttributes: async () => ({
                            manufacturerName: '_TZ3000_test',
                            modelId: 'TS0505A',
                        }),
                    },
                },
            },
        },
    });

    assert.deepStrictEqual(identity, {
        manufacturerName: '_TZ3000_test',
        productId: 'TS0505A',
        basicClusterEndpoint: 3,
    });
});

testCase('resolves a profile directly from a zclNode', async () => {
    const registry = new DeviceProfileRegistry(lightProfiles);
    const result = await resolveZigbeeProfile({
        registry,
        zclNode: {
            endpoints: {
                1: {
                    clusters: {
                        basic: {
                            readAttributes: async () => ({
                                manufacturerName: '_TZ3000_49qchf10',
                                modelId: 'TS0502A',
                            }),
                        },
                    },
                },
            },
        },
    });

    assert(result.profile);
    assert.strictEqual(result.profile.sourceDriver, 'tunable_bulb_E27');
});

(async () => {
    let failures = 0;

    for (const currentTest of tests) {
        try {
            await currentTest.fn();
            console.log(`✓ ${currentTest.name}`);
        } catch (error) {
            failures += 1;
            console.error(`✗ ${currentTest.name}`);
            console.error(error);
        }
    }

    if (failures > 0) {
        process.exitCode = 1;
        return;
    }

    console.log(`\n${tests.length} type-based device profile tests passed.`);
})();
