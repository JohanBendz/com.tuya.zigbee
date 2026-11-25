'use strict';

const TuyaRadiatorDevice = require('../../lib/TuyaRadiatorDevice');

class NedisZbhtr20wt extends TuyaRadiatorDevice {
  get targetProfile() { return { targetDp: 103, minimum: 5, maximum: 30 }; }

  async onNodeInit(args) {
    await super.onNodeInit(args);
    this.registerCapabilityListener('onoff', async enabled => {
      if (typeof enabled !== 'boolean') throw new TypeError('Expected a heating enable value');
      return this.writeBool(101, enabled);
    });
  }

  onValueReport(dp, raw) {
    if (dp === 102 && raw >= -2731 && raw < 32767) this.updateReading('measure_temperature', raw / 10);
  }

  onByteReport(dp, datatype, raw) {
    if (raw > 1) return;
    if (dp === 101 && datatype === 1) this.updateReading('onoff', raw === 1);
    if (dp === 3 && datatype === 4) this.updateReading('thermostat_heating', raw === 1);
    if (dp === 105 && (datatype === 1 || datatype === 5)) this.updateReading('alarm_battery', raw === 1);
  }
}

module.exports = NedisZbhtr20wt;
