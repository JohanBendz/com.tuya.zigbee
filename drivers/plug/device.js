'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class plug extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

    this.printNode();
	debug(true);

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 15000,
				getOnOnline: true,
	    }
    });

  }

	onDeleted(){
		this.log("Plug removed")
	}

}

module.exports = plug;