'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class DoorbellButton extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60,
          maxInterval: 21600,
          minChange: 1,
        },
      ]).catch(err => this.error('Failed to configure doorbell battery reporting', err));
    }

    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
      this.onIASZoneStatusChangeNotification(payload);
    };

    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
  }

  async onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay }) {
    this.log('Doorbell IASZoneStatusChangeNotification:', zoneStatus, extendedStatus, zoneId, delay);

    await this.setCapabilityValue('alarm_tamper', !!zoneStatus.tamper)
      .catch(err => this.error('Failed to update doorbell tamper alarm', err));
    await this.setCapabilityValue('alarm_battery', !!zoneStatus.battery)
      .catch(err => this.error('Failed to update doorbell battery alarm', err));

    if (zoneStatus.alarm1) {
      this.driver.pressTrigger
        .trigger(this, {}, {})
        .catch(err => this.error('Failed to trigger doorbell press Flow card', err));
    }
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryPercentage = Math.max(0, Math.min(100, batteryPercentageRemaining / 2));
    this.log('Doorbell battery percentage:', batteryPercentage);
    this.setCapabilityValue('measure_battery', batteryPercentage)
      .catch(err => this.error('Failed to update doorbell battery percentage', err));
  }

  onDeleted() {
    this.log('Doorbell Button removed');
  }

}

module.exports = DoorbellButton;
