'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { illuminanceMeasuredValueToLux } = require('./measurements');

class IlluminanceSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    const endpoint = zclNode.endpoints[1];

    endpoint.clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));

    endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

    // These TS0222 units are sleepy battery devices. Configure reporting only
    // on first initialization and keep failures non-fatal; physical reports
    // remain sufficient to update Homey when the device wakes.
    if (this.isFirstInit()) {
      const reporting = [
        {
          endpointId: 1,
          cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 10,
          maxInterval: 3600,
          minChange: 5,
        },
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 21600,
          minChange: 2,
        },
      ];

      for (const entry of reporting) {
        await this.configureAttributeReporting([entry])
          .catch(error => this.log('Optional TS0222 reporting configuration skipped:', error.message));
      }
    }
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    const lux = illuminanceMeasuredValueToLux(measuredValue);
    if (lux === null) {
      this.log('Ignoring invalid TS0222 illuminance value:', measuredValue);
      return;
    }

    const roundedLux = Math.round(lux * 100) / 100;
    this.log('TS0222 illuminance (lux):', roundedLux);
    this.setCapabilityValue('measure_luminance', roundedLux).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const percentage = Math.max(0, Math.min(100, batteryPercentageRemaining / 2));
    this.log('TS0222 battery (%):', percentage);
    this.setCapabilityValue('measure_battery', percentage).catch(this.error);
    this.setCapabilityValue('alarm_battery', percentage < 20).catch(this.error);
  }

  onDeleted() {
    this.log('Illuminance Sensor removed');
  }

}

module.exports = IlluminanceSensor;
