'use strict';

const TuyaSharedEndpointDevice = require('../../lib/TuyaSharedEndpointDevice');
const reportedDatapoints = require('../../lib/tuyaReportedDatapoints');

const channels = new Map([
  [undefined, { power: 1, brightness: 2 }],
  ['secondGang', { power: 7, brightness: 8 }],
]);

class AvattoDualDimmer extends TuyaSharedEndpointDevice {
  async onNodeInit({ zclNode }) {
    const channel = channels.get(this.getData().subDeviceId);
    if (!channel) throw new Error('Unknown AVATTO dimmer channel');
    this.listenForReports(zclNode.endpoints[1].clusters.tuya, frame => {
      for (const { dp, datatype, data } of reportedDatapoints(frame)) {
        if (dp === channel.power && datatype === 1 && data.length === 1 && data[0] <= 1) {
          this.setCapabilityValue('onoff', data[0] === 1).catch(this.error);
        }
        if (dp === channel.brightness && datatype === 2 && data.length === 4) {
          const raw = data.readUInt32BE();
          if (raw <= 1000) this.setCapabilityValue('dim', raw / 1000).catch(this.error);
        }
      }
    });
    this.registerCapabilityListener('onoff', async value => {
      if (typeof value !== 'boolean') throw new TypeError('Expected an on/off value');
      return this.writeBool(channel.power, value);
    });
    this.registerCapabilityListener('dim', async value => {
      if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Expected a dim level from 0 to 1');
      return this.writeData32(channel.brightness, Math.round(value * 1000));
    });
  }
}

module.exports = AvattoDualDimmer;
