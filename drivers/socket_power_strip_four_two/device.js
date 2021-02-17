'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class socket_power_strip_four_two extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'usb' ? 5 : subDeviceId === 'socket2' ? 2 : subDeviceId === 'socket3' ? 3 : subDeviceId === 'socket4' ? 4 : 1,
        });

  }

	onDeleted(){
		this.log("Power Strip removed")
	}

}

module.exports = socket_power_strip_four_two;