'use strict';
const { BoundCluster } = require('zigbee-clusters');
class IASZoneBoundCluster extends BoundCluster {
    constructor({
        onZoneStatusChangeNotification,
    }) {
        super();
        this._onZoneStatusChangeNotification = onZoneStatusChangeNotification;
    }
    zoneStatusChangeNotification(payload) {
        if (typeof this._onZoneStatusChangeNotification === 'function') {
        this._onZoneStatusChangeNotification(payload);
        }
    }
    static get COMMANDS() {
        return {
          ...super.COMMANDS,
          zoneEnrollResponse: {
            id: 0,
            args: {
              enrollResponseCode: ZCLDataTypes.enum16({
                success: 0, // 0x00 Success | Success
                notSupported: 1, // 0x01 Not supported | This specific Zone type is not known to the CIE and is not supported.
                noEnrollPermit: 2, // 0x02 No enroll permit | CIE does not permit new zones to enroll at this time.
                tooManyZones: 3, // 0x03 Too many zones | CIE reached its limit of number of enrolled zones
              }),
              zoneID: ZCLDataTypes.uint16,
            },
          },
        };
    }
}
module.exports = IASZoneBoundCluster;