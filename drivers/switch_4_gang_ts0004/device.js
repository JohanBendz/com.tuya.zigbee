'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// An isolated four-channel implementation for two physically interviewed TS0004
// identities (#1035/#1368). The older relay_board_4_channel reads the Basic
// cluster for every child; this new profile needs no extra Zigbee reads or
// E000/E001 vendor writes to register four independent standard OnOff endpoints.
const SUBDEVICE_ENDPOINTS = Object.freeze({
  secondSwitch: 2,
  thirdSwitch: 3,
  fourthSwitch: 4,
});

class Ts0004FourGangSwitch extends ZigBeeDevice {
  async onNodeInit() {
    const { subDeviceId } = this.getData() || {};
    let endpoint = 1;
    if (subDeviceId !== undefined && subDeviceId !== null) {
      if (!Object.prototype.hasOwnProperty.call(SUBDEVICE_ENDPOINTS, subDeviceId)) {
        throw new Error('Unknown TS0004 subdevice: ' + subDeviceId);
      }
      endpoint = SUBDEVICE_ENDPOINTS[subDeviceId];
    }
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint });
  }
}

module.exports = Ts0004FourGangSwitch;
