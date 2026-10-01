'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class HobeianWaterLeakSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      this.error('HOBEIAN ZG-222Z: endpoint 1 not available');
      return;
    }

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        },
      ]).catch(this.error);
    }

    endpoint.clusters[CLUSTER.IAS_ZONE.NAME]
      .onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNotification(payload);
      };

    endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

    // Populate the initial IAS state when the sleepy device is awake.
    endpoint.clusters[CLUSTER.IAS_ZONE.NAME]
      .readAttributes(['zoneStatus'])
      .then(({ zoneStatus }) => {
        if (zoneStatus) this.applyZoneStatus(zoneStatus);
      })
      .catch(error => this.log('Initial IAS status read skipped/failed:', error.message));
  }

  onIASZoneStatusChangeNotification({ zoneStatus }) {
    this.applyZoneStatus(zoneStatus);
  }

  applyZoneStatus(zoneStatus) {
    this.log('ZG-222Z IAS status:', zoneStatus);
    this.setCapabilityValue('alarm_water', Boolean(zoneStatus.alarm1)).catch(this.error);
    this.setCapabilityValue('alarm_tamper', Boolean(zoneStatus.tamper)).catch(this.error);
    this.setCapabilityValue('alarm_battery', Boolean(zoneStatus.battery)).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(rawBatteryPercentage) {
    const batteryPercentage = rawBatteryPercentage / 2;
    this.log('ZG-222Z battery level (%):', batteryPercentage);
    this.setCapabilityValue('measure_battery', batteryPercentage).catch(this.error);

    if (batteryPercentage < 20) {
      this.setCapabilityValue('alarm_battery', true).catch(this.error);
    }
  }

  onDeleted() {
    this.log('HOBEIAN ZG-222Z removed');
  }

}

module.exports = HobeianWaterLeakSensor;
