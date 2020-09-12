'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class doorwindowsensor extends ZigBeeDevice {

	async onNodeInit({zclNode}) {

		// alarm_contact
 		const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
			if (endpointId === 1 && clusterId === 1280) {
        	console.log("raw: ", frame);
			const sensorStatus = (JSON.parse(JSON.stringify(frame)).data[3]);
			console.log("parsed JSON: ", sensorStatus);
			if (sensorStatus === 1){
				this.setCapabilityValue('alarm_contact', true)
				.catch(err => this.error('Error: could not set alarm_contact capability value', err));
				} else {
				this.setCapabilityValue('alarm_contact', false)
					.catch(err => this.error('Error: could not set alarm_contact capability value', err));
				}
			}
		};

		if (this.isFirstInit()){
			// measure_battery
			await this.configureAttributeReporting([
				{
				endpointId: 1,
				cluster: CLUSTER.POWER_CONFIGURATION,
				attributeName: 'batteryPercentageRemaining',
				minInterval: 60,
				maxInterval: 3600,
				minChange: 1,
				}
			]);
		}

		// measure_battery / alarm_battery
			await zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
			.on('attr.batteryPercentageRemaining', (batteryPercentage) => {
				this.log('Battery Percentage Remaining: ', batteryPercentage/2);
				this.setCapabilityValue('measure_battery', batteryPercentage/2);
				this.setCapabilityValue('alarm_battery', (batteryPercentage/2 < batteryThreshold) ? true : false)
			});

	}  
}

module.exports = doorwindowsensor;