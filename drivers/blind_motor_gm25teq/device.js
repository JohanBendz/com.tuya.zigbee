'use strict';

const TuyaDevice = require('../../lib/TuyaSpecificClusterDevice');
require('../../lib/TuyaSpecificCluster');
const reportedDatapoints = require('../../lib/tuyaReportedDatapoints');

const directions = ['up', 'idle', 'down'];

class Gm25teqMotor extends TuyaDevice {
  async onNodeInit({ zclNode }) {
    const tuya = zclNode.endpoints[1].clusters.tuya;
    const onReport = frame => {
      for (const { dp, datatype, data } of reportedDatapoints(frame)) {
        if (dp === 1 && datatype === 4 && data.length === 1 && data[0] < directions.length) {
          this.setCapabilityValue('windowcoverings_state', directions[data[0]]).catch(this.error);
        }
        // DP8 is the target. Only DP9 reports the measured travel position.
        if (dp === 9 && datatype === 2 && data.length === 4) {
          const raw = data.readUInt32BE();
          if (raw <= 100) this.setCapabilityValue('windowcoverings_set', (100 - raw) / 100).catch(this.error);
        }
      }
    };
    tuya.on('reporting', onReport);
    tuya.on('response', onReport);

    this.registerCapabilityListener('windowcoverings_state', async state => {
      const raw = directions.indexOf(state);
      if (raw < 0) throw new RangeError('Unknown blind movement');
      return this.writeEnum(1, raw);
    });
    this.registerCapabilityListener('windowcoverings_set', async opened => {
      if (!Number.isFinite(opened) || opened < 0 || opened > 1) throw new RangeError('Expected a position from 0 to 1');
      return this.writeData32(8, 100 - Math.round(opened * 100));
    });
  }
}

module.exports = Gm25teqMotor;
