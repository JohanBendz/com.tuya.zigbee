'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class plug extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.enableDebug();
		debug(true);
		this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
//        pollInterval: 3600,
	  },
      reportOpts: {
        configureAttributeReporting: {
          minInterval: 0,
          maxInterval: 36000,
          minChange: 1,
        },
      },
    });

  }

	onDeleted(){
		this.log("Plug removed")
	}

}

module.exports = plug;