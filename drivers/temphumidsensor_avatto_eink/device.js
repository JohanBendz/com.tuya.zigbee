'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
require('../../lib/TuyaSpecificCluster');
const reportedDatapoints = require('../../lib/tuyaReportedDatapoints');

class AvattoEinkSensor extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const tuya = zclNode.endpoints[1].clusters.tuya;
    const onReport = frame => {
      for (const { dp, datatype, data } of reportedDatapoints(frame)) {
        if (datatype !== 2 || data.length !== 4) continue;
        const raw = data.readInt32BE();
        if (dp === 1 && raw >= -2731 && raw <= 32767) {
          this.updateReading('measure_temperature', raw / 10);
        } else if (raw >= 0 && raw <= 100) {
          if (dp === 2) this.updateReading('measure_humidity', raw);
          if (dp === 4) this.updateReading('measure_battery', raw);
        }
      }
    };
    tuya.on('reporting', onReport);
    tuya.on('response', onReport);
  }

  updateReading(capability, value) {
    if (this.getCapabilityValue(capability) !== value) {
      this.setCapabilityValue(capability, value).catch(this.error);
    }
  }
}

module.exports = AvattoEinkSensor;
