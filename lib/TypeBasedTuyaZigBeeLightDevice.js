'use strict';

const TuyaZigBeeLightDevice = require('./TuyaZigBeeLightDevice');
const {
    registry,
    ensureProfileCapabilities,
    resolveZigbeeProfile,
} = require('./deviceProfiles');

class TypeBasedTuyaZigBeeLightDevice extends TuyaZigBeeLightDevice {

    async onNodeInit({ zclNode }) {
        const { identity, profile } = await resolveZigbeeProfile({
            zclNode,
            registry,
        });

        if (!profile) {
            throw new Error(
                `Unsupported light profile: ${identity.manufacturerName}/${identity.productId}`,
            );
        }

        if (profile.deviceType !== 'light') {
            throw new Error(
                `Invalid device profile type "${profile.deviceType}" for Light driver`,
            );
        }

        if (profile.status !== 'active') {
            throw new Error(
                `Device profile "${profile.id}" is not active for type-based pairing`,
            );
        }

        this.deviceProfile = profile;
        this.deviceIdentity = identity;

        const addedCapabilities = await ensureProfileCapabilities(this, profile);

        this.log(
            `Resolved Light profile "${profile.id}" for `
            + `${identity.manufacturerName}/${identity.productId}`,
        );

        if (addedCapabilities.length > 0) {
            this.log('Added profile capabilities:', addedCapabilities);
        }

        await super.onNodeInit({ zclNode });
    }

    getDeviceProfile() {
        return this.deviceProfile || null;
    }

    getDeviceIdentity() {
        return this.deviceIdentity || null;
    }

}

module.exports = TypeBasedTuyaZigBeeLightDevice;
