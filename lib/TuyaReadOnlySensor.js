'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
require('./TuyaSpecificCluster');
const updateReportedValue = require('./updateReportedValue');
const reportedDatapoints = require('./tuyaReportedDatapoints');

class TuyaReadOnlySensor extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const tuya = zclNode.endpoints[1].clusters.tuya;
    const onReport = frame => {
      for (const { dp, datatype, data } of reportedDatapoints(frame)) {
        if (datatype === 1 && data.length === 1 && data[0] <= 1) this.onBooleanReport?.(dp, data[0] === 1);
        if (datatype === 2 && data.length === 4) this.onValueReport(dp, data.readInt32BE());
        if (datatype === 4 && data.length === 1) this.onEnumReport(dp, data[0]);
      }
    };
    tuya.on('reporting', onReport);
    tuya.on('response', onReport);
  }

  updateReading(id, value) {
    updateReportedValue(this, id, value);
  }
}

module.exports = TuyaReadOnlySensor;
