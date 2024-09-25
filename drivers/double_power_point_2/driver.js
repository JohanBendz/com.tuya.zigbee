'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class doublepowerpoint2 extends ZigBeeDriver {
    async onNodeInit({ zclNode }) {
        const { subDeviceId } = this.getData();
      }
}

module.exports = doublepowerpoint2;