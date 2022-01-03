'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class outdoorplug extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 15000,
				getOnOnline: true,
	    }
    });

  }

	onDeleted(){
		this.log("Outdoor plug removed")
	}

}

module.exports = outdoorplug;