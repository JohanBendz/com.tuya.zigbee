'use strict';

const { Driver } = require('homey');
const { ZigBeeDriver } = require('homey-zigbeedriver');

class SRZSSwitchDriver extends ZigBeeDriver {

    async onInit() {
        super.onInit();
        this.log('SR-ZS Switch driver has been initialized');
    }

}

module.exports = SRZSSwitchDriver; 