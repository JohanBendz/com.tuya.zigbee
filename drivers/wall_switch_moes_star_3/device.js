'use strict';

const TuyaSharedEndpointDevice = require('../../lib/TuyaSharedEndpointDevice');
const reportedDatapoints = require('../../lib/tuyaReportedDatapoints');

const channels = new Map([[undefined, 1], ['secondGang', 2], ['thirdGang', 3]]);

class MoesStarSwitch extends TuyaSharedEndpointDevice {
  async onNodeInit({ zclNode }) {
    const channel = channels.get(this.getData().subDeviceId);
    if (!channel) throw new Error('Unknown MOES relay channel');
    const tuya = zclNode.endpoints[1].clusters.tuya;
    const onReport = frame => {
      for (const { dp, datatype, data } of reportedDatapoints(frame)) {
        if (dp === channel && datatype === 1 && data.length === 1 && data[0] <= 1) {
          this.setCapabilityValue('onoff', data[0] === 1).catch(this.error);
        }
      }
    };
    this.listenForReports(tuya, onReport);
    this.registerCapabilityListener('onoff', async value => {
      if (typeof value !== 'boolean') throw new TypeError('Expected an on/off value');
      return this.writeBool(channel, value);
    });
  }
}

module.exports = MoesStarSwitch;
