'use strict';

const assert = require('assert');

const DeviceProfileRegistry = require('../lib/deviceProfiles/DeviceProfileRegistry');
const lightProfiles = require('../lib/deviceProfiles/lightProfiles');
const lightDriverManifest = require('../drivers/light/driver.compose.json');
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

testCase('loads legacy and active light profiles without collisions', () => {
    const registry = new DeviceProfileRegistry(lightProfiles);

    assert.strictEqual(registry.size, 16);
    assert.strictEqual(registry.matchCount, 46);
    assert.strictEqual(registry.list({ status: 'legacy-reference' }).length, 15);
    assert.strictEqual(registry.list({ status: 'active' }).length, 1);
});

testCase('resolves the first active type-based light profile', () => {
    const registry = new DeviceProfileRegistry(lightProfiles);
    const profile = registry.resolve({
        manufacturerName: '_TZ3210_bfwvfyx1',
        productId: 'TS0505B',
    });

    assert(profile);
    assert.strictEqual(profile.status, 'active');
    assert.strictEqual(profile.deviceType, 'light');
    assert.strictEqual(profile.sourceIssue, 1091);
    assert(profile.capabilities.includes('light_hue'));
    assert(profile.capabilities.includes('light_temperature'));
});

testCase('the Light driver manifest covers every active light profile', () => {
    const registry = new DeviceProfileRegistry(lightProfiles);
    const activeProfiles = registry.list({
        deviceType: 'light',
        status: 'active',
    });

    const manifestManufacturers = new Set(lightDriverManifest.zigbee.manufacturerName);
    const manifestProducts = new Set(lightDriverManifest.zigbee.productId);
    const manifestClusters = lightDriverManifest.zigbee.endpoints['1'].clusters;

    for (const profile of activeProfiles) {
        for (const matcher of profile.matchers) {
            matcher.manufacturerName.forEach(manufacturerName => {
                assert(
                    manifestManufacturers.has(manufacturerName),
                    `Light manifest is missing manufacturerName ${manufacturerName}`,
                );
            });

            matcher.productId.forEach(productId => {
                assert(
                    manifestProducts.has(productId),
                    `Light manifest is missing productId ${productId}`,
                );
            });
        }

        if (profile.endpointSignature && profile.endpointSignature.endpoint === 1) {
            manifestClusters.forEach(clusterId => {
                assert(
                    profile.endpointSignature.inputClusters.includes(clusterId),
                    `Profile ${profile.id} does not contain required cluster ${clusterId}`,
                );
            });
        }
    }
});

testCase('active Light profiles contain the static base capabilities', () => {
    const registry = new DeviceProfileRegistry(lightProfiles);
    const activeProfiles = registry.list({
        deviceType: 'light',
        status: 'active',
    });

    for (const profile of activeProfiles) {
        lightDriverManifest.capabilities.forEach(capability => {
            assert(
                profile.capabilities.includes(capability),
                `Profile ${profile.id} is missing base capability ${capability}`,
            );
        });
    }
});

testCase('resolves a legacy color light by manufacturerName and productId', () => {
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
                                manufacturerName: '_TZ3210_bfwvfyx1',
                                modelId: 'TS0505B',
                            }),
                        },
                    },
                },
            },
        },
    });

    assert(result.profile);
    assert.strictEqual(result.profile.status, 'active');
    assert.strictEqual(result.profile.sourceIssue, 1091);
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
