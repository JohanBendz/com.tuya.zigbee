'use strict';

const Homey = require('homey');

class tuyazigbee extends Homey.App {
	
	onInit() {
		this.log('Tuya Zigbee app is running...');

		this.homey.flow.getActionCard('start_effect').registerRunListener(async (args, state) => {
			this.log("ACTION TRIGGERED");
			await args.christmas_lights_device.StartEffect(args);
			return true
		})
	}
	
}

module.exports = tuyazigbee;