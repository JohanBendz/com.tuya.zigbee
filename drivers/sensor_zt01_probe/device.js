'use strict';

const TuyaReadOnlySensor = require('../../lib/TuyaReadOnlySensor');
const batteryLevels = ['low', 'medium', 'high'];

class Zt01Probe extends TuyaReadOnlySensor {
  onValueReport(dp, raw) {
    // ZT01 measuring ranges in tenths of a degree, separately for each sensor.
    if (dp === 1 && raw >= -99 && raw <= 600) this.updateReading('measure_temperature', raw / 10);
    if (dp === 38 && raw >= -400 && raw <= 1200) this.updateReading('measure_temperature.probe', raw / 10);
    if (dp === 2 && raw >= 0 && raw <= 100) this.updateReading('measure_humidity', raw);
  }

  onEnumReport(dp, raw) {
    if (dp === 3 && raw < batteryLevels.length) this.updateReading('battery_level_state', batteryLevels[raw]);
  }
}

module.exports = Zt01Probe;
