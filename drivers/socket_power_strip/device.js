'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class socket_power_strip extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.printNode();

/* 		const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
      		this.log("frame data! endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
    	}; */

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'socket2' ? 2 : subDeviceId === 'socket3' ? 3 : 1,
        });

		await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
		.catch(err => {
			this.error('Error when reading device attributes ', err);
		});

  }

	onDeleted(){
		this.log("Power Strip removed")
	}

}

module.exports = socket_power_strip;