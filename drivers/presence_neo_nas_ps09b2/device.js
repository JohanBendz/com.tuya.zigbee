'use strict';

const TuyaReadOnlySensor = require('../../lib/TuyaReadOnlySensor');

class NeoPresence extends TuyaReadOnlySensor {
  onBooleanReport(dp, value) {
    if (dp === 1) this.updateReading('alarm_generic', value);
  }

  onEnumReport(dp, raw) {
    if (raw <= 1) this.onBooleanReport(dp, raw === 1);
  }

  onValueReport(dp, raw) {
    if (raw === 0 || raw === 1) this.onBooleanReport(dp, raw === 1);
  }
}

module.exports = NeoPresence;
