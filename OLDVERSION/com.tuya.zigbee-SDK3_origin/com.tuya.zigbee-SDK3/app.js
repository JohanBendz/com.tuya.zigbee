'use strict';

const Homey = require('homey');
const { debug } = require('zigbee-clusters');
    debug(true);

class tuyazigbee extends Homey.App {
	
	onInit() {
		this.log('Tuya Zigbee app is running...');

		// Register the action card for christmas lights
		this.homey.flow.getActionCard('start_effect')
		.registerRunListener(async (args, state) => {
			this.log("Christmas Lights Action Card Triggered");
			await args.christmas_lights_device.StartEffect(args);
			return true
		})

		// Register the action card for setting window open status
		this.homey.flow.getActionCard('window_open_status_set')
		.registerRunListener(async ({ device, window_open_status }) => {
			this.log("Window is open Action Card Triggered");
			await device.setWindowOpen(window_open_status);
		});

		// Register the condition card for checking if the window is open
		this.homey.flow.getConditionCard('window_open_status_get')
		.registerRunListener(async ({ device }) => {
			this.log("Window is open Condition Card Triggered");
			return device.getWindowOpen();
		});

/* 		// Register the action card for setting window open status
		this.homey.flow.getActionCard('window_open_status_set_2')
		.registerRunListener(async ({ device, window_open_status }) => {
			this.log("Window is open Action Card Triggered");
			await device.setWindowOpen(window_open_status);
		});

		// Register the condition card for checking if the window is open
		this.homey.flow.getConditionCard('window_open_status_get_2')
		.registerRunListener(async ({ device }) => {
			this.log("Window is open Condition Card Triggered");
			return device.getWindowOpen();
		}); */
	}
	
}

module.exports = tuyazigbee;