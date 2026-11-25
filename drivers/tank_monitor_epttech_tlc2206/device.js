'use strict';

const TuyaReadOnlySensor = require('../../lib/TuyaReadOnlySensor');
const states = ['normal', 'low', 'high'];

class EpttechTankMonitor extends TuyaReadOnlySensor {
  async onNodeInit(args) {
    this.pending = new Map();
    await super.onNodeInit(args);
  }

  onEnumReport(dp, raw) {
    if (dp === 1 && raw < states.length) this.updateReading('tank_state', states[raw]);
  }

  onValueReport(dp, raw) {
    if (dp === 2 && raw >= 0 && raw <= 400) this.updateReading('liquid_level', raw);
    if (dp === 22 && raw >= 0 && raw <= 100) this.updateReading('liquid_level_fill', raw);
  }

  // The unit reports continuously. Keep only the newest reading while a
  // Homey update is pending, independent for each of the three capabilities.
  async updateReading(id, value) {
    if (this.pending.has(id)) {
      this.pending.set(id, value);
      return;
    }
    if (this.getCapabilityValue(id) === value) return;
    this.pending.set(id, value);
    try {
      do {
        value = this.pending.get(id);
        try {
          await this.setCapabilityValue(id, value);
        } catch (error) {
          this.error('Tank capability update failed', id, error);
        }
      } while (this.pending.get(id) !== value);
    } finally {
      this.pending.delete(id);
    }
  }
}

module.exports = EpttechTankMonitor;
