'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class MoesDualOutputPlug extends ZigBeeDevice {
  async onNodeInit() {
    const endpoint = this.getData().subDeviceId === 'socketTwo' ? 2 : 1;
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint,
      getOpts: { getOnStart: true, getOnOnline: true },
      reportOpts: { configureAttributeReporting: { minInterval: 1, maxInterval: 600, minChange: 1 } },
    });
  }
}

module.exports = MoesDualOutputPlug;
