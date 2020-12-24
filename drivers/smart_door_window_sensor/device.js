'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

debug(true);

class smart_door_window_sensor extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.printNode();

		await this.configureAttributeReporting([
			{
				endpointId: 1,
				cluster: CLUSTER.IAS_ZONE,
				attributeName: 'zoneStatus',
				minInterval: 65535,
				maxInterval: 0,
				minChange: 1,
			},{
				endpointId: 1,
				cluster: CLUSTER.POWER_CONFIGURATION,
				attributeName: 'batteryPercentageRemaining',
				minInterval: 65535,
				maxInterval: 0,
				minChange: 1,
			}
		]);

		// alarm_contact & alarm_tamper
		zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
		.on('attr.zoneStatus', this.onZoneStatusAttributeReport.bind(this));

		// measure_battery // alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
		.on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

	}

	onZoneStatusAttributeReport(status) {
		this.log("Contact status: ", status.alarm1);
		this.log("Tamper status: ", status.tamper);
		this.setCapabilityValue('alarm_contact', status.alarm1);
		this.setCapabilityValue('alarm_tamper', status.tamper);
	}

	onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;
		this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
		this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2);
		this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false)
	}

  onDeleted(){
		this.log("Smart Door/Window Sensor removed")
	}

}

module.exports = smart_door_window_sensor;
