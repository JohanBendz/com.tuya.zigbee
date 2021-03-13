'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class diagnostic extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();
		debug(true);
    
    const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
        this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
        this.log("Frame JSON data:", frame.toJSON());
    };

    }

    onDeleted(){
		this.log("Diagnostic device has been removed")
	}

}

module.exports = diagnostic;