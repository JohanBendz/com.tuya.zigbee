'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class doorwindowsensor extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.enableDebug();
		debug(true);
		this.printNode();

		// alarm_contact
      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNoficiation(payload);
      }

  }
  
  onIASZoneStatusChangeNoficiation({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_contact', zoneStatus.alarm1);
    this.setCapabilityValue('alarm_battery', zoneStatus.battery);
  }

	onDeleted(){
		this.log("Door/Window Sensor removed")
	}

}

module.exports = doorwindowsensor;