'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class doublepowerpoint extends ZigBeeDriver {
    async onNodeInit({ zclNode }) {
        const { subDeviceId } = this.getData();
      }
}

module.exports = doublepowerpoint;