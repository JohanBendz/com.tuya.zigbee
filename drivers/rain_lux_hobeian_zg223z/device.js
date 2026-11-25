'use strict';

const TuyaReadOnlySensor = require('../../lib/TuyaReadOnlySensor');

class Zg223zRain extends TuyaReadOnlySensor {
  // Each measurement has a single authoritative report source on this profile.
  onEnumReport(dp, raw) {
    if (dp === 1 && raw <= 1) this.updateReading('alarm_water', raw === 1);
  }

  onValueReport(dp, raw) {
    if (dp === 102 && raw >= 0) this.updateReading('measure_luminance', raw);
    if (dp === 104 && raw >= 0 && raw <= 100) this.updateReading('measure_battery', raw);
  }
}

module.exports = Zg223zRain;
