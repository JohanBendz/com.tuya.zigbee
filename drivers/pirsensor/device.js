'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class pirsensor extends ZigBeeDevice {

	async onNodeInit({zclNode}) {

		// alarm_motion
		const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
			if (endpointId === 1 && clusterId === 1280) {
				const zoneStatus = (JSON.parse(JSON.stringify(frame)).data[3]);
				console.log("parsed JSON: ", zoneStatus);
				if (zoneStatus === 1){
					this.setCapabilityValue('alarm_motion', true)
					.catch(err => this.error('Error: could not set alarm_motion capability value', err));
					} else {
					this.setCapabilityValue('alarm_motion', false)
						.catch(err => this.error('Error: could not set alarm_motion capability value', err));
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
			])
			.catch(err => this.error('Error: configureAttributeReporting failed', err));
			
		}

		// measure_battery / alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
		.on('attr.batteryPercentageRemaining', (batteryPercentage) => {
			this.log('Battery Percentage Remaining: ', batteryPercentage/2);
			this.setCapabilityValue('measure_battery', batteryPercentage/2);
			this.setCapabilityValue('alarm_battery', (batteryPercentage/2 < batteryThreshold) ? true : false)
		});
	
	}

	onDeleted(){
		this.log("pirsensor removed")
	}

}

module.exports = pirsensor;
