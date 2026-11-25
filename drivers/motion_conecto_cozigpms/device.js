'use strict';

const TuyaReadOnlySensor = require('../../lib/TuyaReadOnlySensor');

class ConectoMotion extends TuyaReadOnlySensor {
  onBooleanReport(dp, value) {
    if (dp === 1) this.updateReading('alarm_motion', !value);
  }

  onEnumReport(dp, raw) {
    if (dp === 1 && raw <= 1) this.updateReading('alarm_motion', raw === 0);
  }

  onValueReport(dp, raw) {
    if (dp === 1 && (raw === 0 || raw === 1)) this.onEnumReport(dp, raw);
    if (dp === 101 && raw >= 0) this.updateReading('measure_luminance', raw);
  }
}

module.exports = ConectoMotion;
