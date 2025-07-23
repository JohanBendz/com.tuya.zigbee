'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class floodsensor extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.printNode();

		// alarm_contact
      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNotification(payload);
      }

  }
  
  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_water', zoneStatus.alarm1).catch(this.error);
    this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
  }

	onDeleted(){
		this.log("Flood Sensor removed")
	}

}

module.exports = floodsensor;
