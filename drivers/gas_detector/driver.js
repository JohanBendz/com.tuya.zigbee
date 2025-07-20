/**
 * ZigBee Gas Detector Driver
 * File: driver.js
 * Version: 1.0.0 
 */

'use strict';

const { Driver } = require('homey');

class GasSensorDriver extends Driver {

    async onInit() {
        this.log('ZigBee Gas Detector Driver ready');
    }

    async onPairListDevices() {
        this.log('Gas detector pairing initiated');
        return [];
    }

}

module.exports = GasSensorDriver;