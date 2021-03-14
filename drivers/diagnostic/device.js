'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class diagnostic extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

      this.printNode();
   
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