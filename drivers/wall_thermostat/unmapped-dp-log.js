'use strict';

// Unmapped datapoints must not be assigned a generic meaning across different
// Tuya thermostat fingerprints. Log the first observation and each value change;
// summarize repeated identical reports rather than logging every Zigbee frame.
const REPEAT_LOG_INTERVAL_MS = 60 * 1000;

class UnmappedDpLogLimiter {
  constructor(log, now = () => Date.now()) {
    this.log = log;
    this.now = now;
    this.recent = new Map();
  }

  record(dp, value) {
    // Raw DP payloads may arrive as fresh Buffer objects containing the same
    // bytes. Compare their contents instead of object identity.
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
