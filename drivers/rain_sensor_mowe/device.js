'use strict';

// #1288 / original physical interview #473: MOWE MW815R is standard IAS rain,
// not the solar RB-SRAIN01 EF00/DP105 rain sensor.
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class MoweRainSensor extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const endpoint = zclNode.endpoints[1];
    const iasZone = endpoint.clusters[CLUSTER.IAS_ZONE.NAME];

    // Homey sets the IAS CIE address during joining. Reply if the sensor
    // subsequently requests enrollment; do not poll a sleepy device on init.
    iasZone.onZoneEnrollRequest = () => {
      Promise.resolve(iasZone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 0 }))
        .catch(error => this.error('MOWE IAS enrollment response failed:', error));
    };

    iasZone.onZoneStatusChangeNotification = ({ zoneStatus }) => {
      if (typeof zoneStatus?.alarm1 === 'boolean') {
        this.setCapabilityValue('alarm_water', zoneStatus.alarm1).catch(this.error);
      }
      if (typeof zoneStatus?.battery === 'boolean') {
        this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
      }
    };

    // Standard ZCL battery percentage is encoded in half-percent units;
    // 0xff and other invalid/unavailable samples must not overwrite Homey.
    endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', value => {
        if (Number.isInteger(value) && value >= 0 && value <= 200) {
          this.setCapabilityValue('measure_battery', value / 2).catch(this.error);
        }
      });
  }
}

module.exports = MoweRainSensor;
