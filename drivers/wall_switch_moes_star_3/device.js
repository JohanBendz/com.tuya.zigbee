'use strict';

const TuyaDevice = require('../../lib/TuyaSpecificClusterDevice');
require('../../lib/TuyaSpecificCluster');
const reportedDatapoints = require('../../lib/tuyaReportedDatapoints');

// All three Homey tiles share one Zigbee endpoint and transaction sequence.
const transactions = new WeakMap();
const channels = new Map([[undefined, 1], ['secondGang', 2], ['thirdGang', 3]]);

class MoesStarSwitch extends TuyaDevice {
  get transactionID() { return transactions.get(this.zclNode) || 0; }
  set transactionID(next) { transactions.set(this.zclNode, next % 256); }

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
    this.detachReports?.();
    tuya.on('reporting', onReport);
    tuya.on('response', onReport);
    this.detachReports = () => {
      tuya.removeListener('reporting', onReport);
      tuya.removeListener('response', onReport);
    };
    this.registerCapabilityListener('onoff', async value => {
      if (typeof value !== 'boolean') throw new TypeError('Expected an on/off value');
      return this.writeBool(channel, value);
    });
  }

  onDeleted() {
    // The default ZigBeeDevice cleanup removes listeners owned by sibling tiles.
    this.detachReports?.();
  }
}

module.exports = MoesStarSwitch;
