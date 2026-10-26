'use strict';

// #1013 / #1143 / #868: exact standard IAS Zone contact profiles, independent
// Zigbee manufacturer/model pairing, with Poll Control optional per interview.
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class StandardIASContact extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const endpoint = zclNode.endpoints[1];
    const ias = endpoint.clusters[CLUSTER.IAS_ZONE.NAME];

    // Modern Homey enrolls IAS automatically. Respond to a forwarded request
    // for compatibility; do not send unsolicited startup or sleepy-device reads.
    ias.onZoneEnrollRequest = () => {
      Promise.resolve()
        .then(() => ias.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 0 }))
        .catch(error => this.error('IAS contact enrollment response failed:', error));
    };
    ias.onZoneStatusChangeNotification = ({ zoneStatus } = {}) => {
      // Some devices send partial status frames. Never clear alarms based on
      // an absent bit (the historical external false-close regression).
      if (typeof zoneStatus?.alarm1 === 'boolean') {
        this.setCapabilityValue('alarm_contact', zoneStatus.alarm1).catch(this.error);
      }
      if (typeof zoneStatus?.battery === 'boolean') {
        this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
      }
    };

    // Standard Power Configuration batteryPercentageRemaining is half-percent.
    // 0xff means unknown; do not overwrite a valid Homey battery measurement.
    endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME]
      .on('attr.batteryPercentageRemaining', value => {
        if (!Number.isInteger(value) || value < 0 || value > 200) return;
        this.setCapabilityValue('measure_battery', value / 2).catch(this.error);
      });

    // All three interviews already advertise/report standard Power1; no
    // mandatory PollControl32 actions, vendor DP, or wake-time writes are added.
  }
}

module.exports = StandardIASContact;
