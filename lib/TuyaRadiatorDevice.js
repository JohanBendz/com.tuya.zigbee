'use strict';

const TuyaDevice = require('./TuyaSpecificClusterDevice');
require('./TuyaSpecificCluster');
const reportedDatapoints = require('./tuyaReportedDatapoints');

class TuyaRadiatorDevice extends TuyaDevice {
  async onNodeInit({ zclNode }) {
    const { targetDp, minimum, maximum } = this.targetProfile;
    this.registerCapabilityListener('target_temperature', async degrees => {
      if (!Number.isFinite(degrees) || degrees < minimum || degrees > maximum || !Number.isInteger(degrees * 2)) {
        throw new RangeError('Target must be in range and use half-degree steps');
      }
      return this.writeData32(targetDp, Math.round(degrees * 10));
    });
    const tuya = zclNode.endpoints[1].clusters.tuya;
    const onReport = frame => {
      for (const { dp, datatype, data } of reportedDatapoints(frame)) {
        if (datatype === 2 && data.length === 4) {
          const raw = data.readInt32BE();
          if (dp === targetDp) {
            if (raw >= minimum * 10 && raw <= maximum * 10) this.updateReading('target_temperature', raw / 10);
          } else {
            this.onValueReport(dp, raw);
          }
        } else if (data.length === 1) {
          this.onByteReport(dp, datatype, data[0]);
        }
      }
    };
    tuya.on('reporting', onReport);
    tuya.on('response', onReport);
  }

  updateReading(capability, value) {
    if (this.getCapabilityValue(capability) !== value) this.setCapabilityValue(capability, value).catch(this.error);
  }
}

module.exports = TuyaRadiatorDevice;
