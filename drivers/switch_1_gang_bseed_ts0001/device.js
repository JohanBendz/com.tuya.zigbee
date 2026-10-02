'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// Exact physical interview #1339: one standard OnOff relay on EP1.
// No unverified E000/E001 commands or startup power-state writes.
class BseedTs0001Device extends ZigBeeDevice {
  async onNodeInit() {
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
  }
}

module.exports = BseedTs0001Device;
