'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class socket_power_strip_four extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.enableDebug();
		debug(true);
		this.printNode();

/* 		const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
      		this.log("frame data! endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
    	}; */

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'usb' ? 7 : subDeviceId === 'socket2' ? 2 : subDeviceId === 'socket3' ? 3 : subDeviceId === 'socket4' ? 4 : 1,
        });

  }

	onDeleted(){
		this.log("Power Strip removed")
	}

}

module.exports = socket_power_strip_four;