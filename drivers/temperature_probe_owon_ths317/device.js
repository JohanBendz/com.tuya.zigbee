'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class OwonProbe extends ZigBeeDevice {
  async onNodeInit() {
    this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
      endpoint: 1,
      reportParser(raw) {
        return Number.isInteger(raw) && raw >= -27315 && raw <= 32767 ? raw / 100 : null;
      },
      reportOpts: { configureAttributeReporting: { minInterval: 30, maxInterval: 3600, minChange: 10 } },
    });
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      endpoint: 1,
      reportParser(raw) {
        return Number.isInteger(raw) && raw >= 0 && raw <= 200 ? raw / 2 : null;
      },
      reportOpts: { configureAttributeReporting: { minInterval: 3600, maxInterval: 21600, minChange: 2 } },
    });
  }
}

module.exports = OwonProbe;
