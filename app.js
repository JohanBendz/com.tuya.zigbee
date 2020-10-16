'use strict';

const Homey = require('homey');

class tuyazigbee extends Homey.App {
	
	onInit() {
		this.log('Tuya Zigbee app is running...');
	}
	
}

module.exports = tuyazigbee;