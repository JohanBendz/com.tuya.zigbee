'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const Homey = require("homey");

class ThermostaticRadiatorValveDriver extends ZigBeeDriver {

    async onInit() {
        this.log('Thermostatic Radiator Valve Driver initialized');
    }
}

module.exports = ThermostaticRadiatorValveDriver;
