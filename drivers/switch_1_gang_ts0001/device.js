'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// Only the standard EP1 OnOff common to the actual interviews (#1366, #1172,
// #1395, #674). No unverified relay power-on, switch-mode or vendor writes.
class Ts0001SingleGangDevice extends ZigBeeDevice {
  async onNodeInit() {
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
  }
}

module.exports = Ts0001SingleGangDevice;
