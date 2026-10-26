'use strict';

// #1481: ONLY standard IAS Zone + Illuminance Measurement + Power Configuration.
// The two exact manufacturer/product profiles are independent of the existing
// EF00-based motion_sensor_2. No Zigbee vendor datapoints are presumed.
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { illuminanceMeasuredValueToLux } = require('../illuminance_sensor/measurements');

class StandardMotionIlluminance extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const ep = zclNode.endpoints[1];
    const ias = ep.clusters[CLUSTER.IAS_ZONE.NAME];

    // Homey usually handles IAS enrollment itself. Only respond if requested.
    ias.onZoneEnrollRequest = () => {
      Promise.resolve().then(() => ias.zoneEnrollResponse({
        enrollResponseCode: 0, zoneId: 0,
      })).catch(error => this.error('IAS motion enrollment:', error));
    };
    ias.onZoneStatusChangeNotification = ({ zoneStatus } = {}) => {
      this.onZoneStatus(zoneStatus);
    };
    ias.on('attr.zoneStatus', this.onZoneStatus.bind(this));

    ep.clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onIlluminance.bind(this));
    ep.clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBattery.bind(this));

    // The devices sleep between events; a rejected optional reporting setup
    // must not block subsequent status notifications or a restored app.
    if (this.isFirstInit()) {
      for (const config of [
        { endpointId: 1, cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue', minInterval: 30, maxInterval: 3600,
          minChange: 100 },
        { endpointId: 1, cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining', minInterval: 3600,
          maxInterval: 21600, minChange: 2 },
      ]) {
        await this.configureAttributeReporting([config])
          .catch(error => this.log('Optional IAS motion/lux reporting skipped:', error.message));
      }
    }
  }

  onZoneStatus(status) {
    // Do NOT infer motion clear from an omitted alarm1 in partial IAS reports.
    if (typeof status?.alarm1 === 'boolean') {
      this.setCapabilityValue('alarm_motion', status.alarm1).catch(this.error);
    }
    if (typeof status?.battery === 'boolean') {
      this.setCapabilityValue('alarm_battery', status.battery).catch(this.error);
    }
  }

  onIlluminance(value) {
    // Standard Zigbee logarithmic encoding; real lux scale is a public Test gate.
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) return;
    const lux = illuminanceMeasuredValueToLux(value);
    if (lux === null || !Number.isFinite(lux)) return;
    this.setCapabilityValue('measure_luminance', Math.round(lux * 100) / 100)
      .catch(this.error);
  }

  onBattery(value) {
    // Zigbee batteryPercentageRemaining is in half-percent, 0xff unavailable.
    if (!Number.isInteger(value) || value < 0 || value > 200) return;
    const percentage = value / 2;
    this.setCapabilityValue('measure_battery', percentage).catch(this.error);
    this.setCapabilityValue('alarm_battery', percentage < 20).catch(this.error);
  }
}

module.exports = StandardMotionIlluminance;
