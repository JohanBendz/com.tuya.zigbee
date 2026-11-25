'use strict';

const TuyaReadOnlySensor = require('../../lib/TuyaReadOnlySensor');

class BedOccupancySensor extends TuyaReadOnlySensor {
  onEnumReport(dp, raw) {
    if (dp === 1 && raw <= 1) this.updateReading('alarm_generic', raw === 0);
  }

  onValueReport(dp, raw) {
    if (dp === 4 && raw >= 0 && raw <= 100) this.updateReading('measure_battery', raw);
  }
}

module.exports = BedOccupancySensor;
