'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// Exact physical interview #1401: TS0726, not TS0004. Four independent
// standard OnOff endpoints, without mandatory E000/E001 or startup writes.
const SUBDEVICE_ENDPOINTS = Object.freeze({
  secondSwitch: 2,
  thirdSwitch: 3,
  fourthSwitch: 4,
});

class BseedTs0726Device extends ZigBeeDevice {
  async onNodeInit() {
    const { subDeviceId } = this.getData() || {};
    let endpoint = 1;
    if (subDeviceId !== undefined && subDeviceId !== null) {
      if (!Object.prototype.hasOwnProperty.call(SUBDEVICE_ENDPOINTS, subDeviceId)) {
        throw new Error('Unknown TS0726 subdevice: ' + subDeviceId);
      }
      endpoint = SUBDEVICE_ENDPOINTS[subDeviceId];
    }
    this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint });
  }
}

module.exports = BseedTs0726Device;
