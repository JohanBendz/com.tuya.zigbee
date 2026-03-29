'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const Homey = require("homey");

class ThermostaticRadiatorValveDriver extends ZigBeeDriver {

    async onInit() {
    }
}

module.exports = ThermostaticRadiatorValveDriver;
