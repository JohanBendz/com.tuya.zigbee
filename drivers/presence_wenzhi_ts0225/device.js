'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const updateReportedValue = require('../../lib/updateReportedValue');
const { CLUSTER } = require('zigbee-clusters');

class WenzhiPresence extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    const zone = zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME];
    const onStatus = status => {
      if (typeof status?.alarm1 === 'boolean') {
        updateReportedValue(this, 'alarm_generic', status.alarm1);
      }
    };
    zone.onZoneEnrollRequest = () => zone.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 0 }).catch(this.error);
    zone.onZoneStatusChangeNotification = ({ zoneStatus } = {}) => onStatus(zoneStatus);
    zone.on('attr.zoneStatus', onStatus);
  }
}

module.exports = WenzhiPresence;
