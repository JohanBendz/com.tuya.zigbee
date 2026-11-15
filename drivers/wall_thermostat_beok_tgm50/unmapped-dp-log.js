'use strict';

// Same 60-second rate limit as drivers/wall_thermostat/unmapped-dp-log.js.
// Copied here so this profile does not import the BHT-002 driver.
const REPEAT_LOG_INTERVAL_MS = 60 * 1000;

class UnmappedDpLogLimiter {
  constructor(log, now = () => Date.now()) {
    this.log = log;
    this.now = now;
    this.recent = new Map();
  }

  record(dp, value) {
    const signature = Buffer.isBuffer(value)
      ? `buffer:${value.toString('hex')}`
      : `${typeof value}:${String(value)}`;
    const timestamp = this.now();
    const previous = this.recent.get(dp);

    if (
      previous
      && previous.signature === signature
      && timestamp >= previous.lastLoggedAt
      && timestamp - previous.lastLoggedAt < REPEAT_LOG_INTERVAL_MS
    ) {
      previous.suppressed += 1;
      return;
    }

    if (previous?.suppressed) {
      this.log(
        'Suppressed repeated unmapped Tuya DP reports',
        dp,
        previous.suppressed,
        'previous value:',
        previous.value
      );
    }

    this.log('processReporting', dp, value);
    this.recent.set(dp, {
      signature,
      value,
      lastLoggedAt: timestamp,
      suppressed: 0,
    });
  }
}

module.exports = UnmappedDpLogLimiter;
