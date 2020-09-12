'use strict';

const Homey = require('homey');

// Enable zigbee-cluster logging
const { Util } = require('homey-zigbeedriver');
Util.debugZigbeeClusters(true);

class tuyazigbee extends Homey.App {
	
	onInit() {
		this.log('Tuya Zigbee app is running...');
	}
	
}

module.exports = tuyazigbee;