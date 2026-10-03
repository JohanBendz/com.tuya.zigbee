'use strict';

// #1298: shared standard-cluster subset ONLY. HOBEIAN announces EF00 on EP1,
// but no private datapoint mapping is implemented without physical evidence.
// The exact _TZE200_pay2byax/TS0601 profile reuses this ZCL runtime without EF00.
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { illuminanceMeasuredValueToLux } = require('../illuminance_sensor/measurements');

class ContactIlluminanceSensor extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const endpoint = zclNode.endpoints[1];
    const ias = endpoint.clusters[CLUSTER.IAS_ZONE.NAME];

    // Homey handles IAS CIE addressing during pairing; keep an enrollment
    // response callback for devices/firmware that forward an enroll request.
    ias.onZoneEnrollRequest = () => {
      Promise.resolve().then(() => ias.zoneEnrollResponse({
        enrollResponseCode: 0, zoneId: 0,
      })).catch(error => this.error('IAS enroll response:', error));
    };

    ias.onZoneStatusChangeNotification = ({ zoneStatus } = {}) => {
      this.onContactStatus(zoneStatus);
    };

    // Some firmware reports zoneStatus as a ZCL attribute instead of command.
    // Ignore non-decoded payloads rather than changing an existing alarm.
    ias.on('attr.zoneStatus', this.onContactStatus.bind(this));

    endpoint.clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onIlluminanceMeasured.bind(this));
    endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryReported.bind(this));

    // These are sleepy end devices. Optional first-pair reporting negotiation
    // must never prevent initialization; there are no unsolicited reads.
    if (this.isFirstInit()) {
      for (const config of [
        { endpointId: 1, cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue', minInterval: 30, maxInterval: 3600, minChange: 100 },
        { endpointId: 1, cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining', minInterval: 3600,
          maxInterval: 21600, minChange: 2 },
      ]) {
        await this.configureAttributeReporting([config])
          .catch(error => this.log('Optional contact/lux reporting skipped:', error.message));
      }
    }
  }

  onContactStatus(status) {
    if (typeof status?.alarm1 === 'boolean') {
      this.setCapabilityValue('alarm_contact', status.alarm1).catch(this.error);
    }
    if (typeof status?.battery === 'boolean') {
      this.setCapabilityValue('alarm_battery', status.battery).catch(this.error);
    }
  }

  onIlluminanceMeasured(value) {
    // Use the ZCL logarithmic encoding as a starting hypothesis.
    // Verify actual manufacturer lux calibration independently in public Test.
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) return;
    const lux = illuminanceMeasuredValueToLux(value);
    if (lux === null || !Number.isFinite(lux)) return;
    this.setCapabilityValue('measure_luminance', Math.round(lux * 100) / 100)
      .catch(this.error);
  }

  onBatteryReported(value) {
    // ZCL batteryPercentageRemaining is half-percent, 0xff is unavailable.
    if (!Number.isInteger(value) || value < 0 || value > 200) return;
    const pct = value / 2;
    this.setCapabilityValue('measure_battery', pct).catch(this.error);
    this.setCapabilityValue('alarm_battery', pct < 20).catch(this.error);
  }
}

module.exports = ContactIlluminanceSensor;
