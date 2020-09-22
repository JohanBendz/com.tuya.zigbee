'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class MyZigBeeDevice extends ZigBeeDevice {

	onMeshInit() {
		this.log('MyZigBeeDevice has been inited');
	}

}

module.exports = MyZigBeeDevice;
