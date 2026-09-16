'use strict';

const DeviceProfileRegistry = require('./DeviceProfileRegistry');
const lightProfiles = require('./lightProfiles');
const {
    findBasicCluster,
    readZigbeeIdentity,
    resolveZigbeeProfile,
} = require('./ZigbeeProfileResolver');

const registry = new DeviceProfileRegistry(lightProfiles);

module.exports = {
    DeviceProfileRegistry,
    lightProfiles,
    registry,
    findBasicCluster,
    readZigbeeIdentity,
    resolveZigbeeProfile,
};
