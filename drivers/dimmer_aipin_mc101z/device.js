'use strict';

const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
require('../../lib/TuyaSpecificCluster');
const reportedDatapoints = require('../../lib/tuyaReportedDatapoints');

class AipinPwmDimmer extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    const tuya = zclNode.endpoints[1].clusters.tuya;
    const onReport = frame => {
      for (const { dp, datatype, data } of reportedDatapoints(frame)) {
        if (dp === 1 && datatype === 1 && data.length === 1 && data[0] <= 1) {
          this.setCapabilityValue('onoff', data[0] === 1).catch(this.error);
        }
        if (dp === 3 && datatype === 2 && data.length === 4) {
          const raw = data.readUInt32BE();
          if (raw <= 1000) this.setCapabilityValue('dim', raw / 1000).catch(this.error);
        }
      }
    };
    tuya.on('reporting', onReport);
    tuya.on('response', onReport);
    this.registerCapabilityListener('onoff', async value => {
      if (typeof value !== 'boolean') throw new TypeError('Expected an on/off value');
      return this.writeBool(1, value);
    });
    this.registerCapabilityListener('dim', async value => {
      if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Expected a dim level from 0 to 1');
      return this.writeData32(3, Math.round(value * 1000));
    });
  }
}

module.exports = AipinPwmDimmer;
