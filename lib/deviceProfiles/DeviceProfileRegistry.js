'use strict';

function ensureStringArray(value, fieldName, profileId) {
    const values = Array.isArray(value) ? value : [value];

    if (!values.length || values.some(item => typeof item !== 'string' || item.length === 0)) {
        throw new TypeError(`Invalid ${fieldName} in device profile "${profileId}"`);
    }

    return values;
}

function createMatchKey(manufacturerName, productId) {
    return `${manufacturerName}\u0000${productId}`;
}

class DeviceProfileRegistry {

    constructor(profiles = []) {
        this._profiles = new Map();
        this._matches = new Map();

        profiles.forEach(profile => this.register(profile));
    }

    register(profile) {
        if (!profile || typeof profile !== 'object') {
            throw new TypeError('Device profile must be an object');
        }

        const {
            id,
            deviceType,
            protocol,
            capabilities,
            matchers,
        } = profile;

        if (typeof id !== 'string' || id.length === 0) {
            throw new TypeError('Device profile is missing a valid id');
        }

        if (this._profiles.has(id)) {
            throw new Error(`Duplicate device profile id "${id}"`);
        }

        if (typeof deviceType !== 'string' || deviceType.length === 0) {
            throw new TypeError(`Device profile "${id}" is missing a valid deviceType`);
        }

        if (typeof protocol !== 'string' || protocol.length === 0) {
            throw new TypeError(`Device profile "${id}" is missing a valid protocol`);
        }

        if (!Array.isArray(capabilities) || capabilities.some(capability => typeof capability !== 'string')) {
            throw new TypeError(`Device profile "${id}" has invalid capabilities`);
        }

        if (!Array.isArray(matchers) || matchers.length === 0) {
            throw new TypeError(`Device profile "${id}" must contain at least one matcher`);
        }

        const normalizedProfile = {
            ...profile,
            capabilities: [...capabilities],
            matchers: matchers.map(matcher => ({
                manufacturerName: ensureStringArray(matcher.manufacturerName, 'manufacturerName', id),
                productId: ensureStringArray(matcher.productId, 'productId', id),
            })),
        };

        for (const matcher of normalizedProfile.matchers) {
            for (const manufacturerName of matcher.manufacturerName) {
                for (const productId of matcher.productId) {
                    const matchKey = createMatchKey(manufacturerName, productId);
                    const existingProfile = this._matches.get(matchKey);

                    if (existingProfile) {
                        throw new Error(
                            `Device profile collision for ${manufacturerName}/${productId}: `
                            + `"${existingProfile.id}" and "${id}"`,
                        );
                    }

                    this._matches.set(matchKey, normalizedProfile);
                }
            }
        }

        this._profiles.set(id, normalizedProfile);
        return normalizedProfile;
    }

    resolve({ manufacturerName, productId }) {
        if (typeof manufacturerName !== 'string' || typeof productId !== 'string') {
            return null;
        }

        return this._matches.get(createMatchKey(manufacturerName, productId)) || null;
    }

    get(id) {
        return this._profiles.get(id) || null;
    }

    list({ deviceType, status } = {}) {
        return [...this._profiles.values()].filter(profile => {
            if (deviceType && profile.deviceType !== deviceType) return false;
            if (status && profile.status !== status) return false;
            return true;
        });
    }

    get size() {
        return this._profiles.size;
    }

    get matchCount() {
        return this._matches.size;
    }

}

module.exports = DeviceProfileRegistry;
