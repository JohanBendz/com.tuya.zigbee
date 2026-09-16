'use strict';

async function ensureProfileCapabilities(device, profile) {
    if (!device || typeof device.hasCapability !== 'function' || typeof device.addCapability !== 'function') {
        throw new TypeError('A Homey Device instance is required');
    }

    if (!profile || !Array.isArray(profile.capabilities)) {
        throw new TypeError('A device profile with capabilities is required');
    }

    const addedCapabilities = [];

    for (const capability of profile.capabilities) {
        if (device.hasCapability(capability)) continue;

        await device.addCapability(capability);
        addedCapabilities.push(capability);
    }

    return addedCapabilities;
}

module.exports = {
    ensureProfileCapabilities,
};
