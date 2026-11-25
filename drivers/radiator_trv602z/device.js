'use strict';

const TuyaRadiatorDevice = require('../../lib/TuyaRadiatorDevice');

class Trv602z extends TuyaRadiatorDevice {
  get targetProfile() { return { targetDp: 4, minimum: 5, maximum: 35 }; }

  onByteReport(dp, datatype, raw) {
    if (dp === 3 && (datatype === 4 || datatype === 1) && raw <= 1) {
      this.updateReading('thermostat_heating', raw === 1);
    }
  }

  onValueReport(dp, raw) {
    if (dp === 5 && raw >= -2731 && raw < 32767) this.updateReading('measure_temperature', raw / 10);
    if (dp === 6 && raw >= 0 && raw <= 100) this.updateReading('measure_battery', raw);
    if (dp === 114 && raw >= 0 && raw <= 1000) this.updateReading('measure_valve_opening', raw / 10);
  }
}

module.exports = Trv602z;
