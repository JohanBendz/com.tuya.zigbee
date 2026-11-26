'use strict';

const { CLUSTER } = require('zigbee-clusters');
const TemperatureBatteryDevice = require('../temperature_probe_owon_ths317/device');

class Th01Sensor extends TemperatureBatteryDevice {
  async onNodeInit() {
    await super.onNodeInit();
    this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
      endpoint: 1,
      reportParser(raw) {
        return Number.isInteger(raw) && raw >= 0 && raw <= 10000 ? raw / 100 : null;
      },
      reportOpts: { configureAttributeReporting: { minInterval: 30, maxInterval: 3600, minChange: 100 } },
    });
  }
}

module.exports = Th01Sensor;
