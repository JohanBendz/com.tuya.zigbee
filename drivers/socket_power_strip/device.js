'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class socket_power_strip extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.enableDebug();
		debug(true);
		this.printNode();

      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        getOpts: {
          getOnStart: true
        },
      });

  }

	onDeleted(){
		this.log("Power Strip removed")
	}

}

module.exports = socket_power_strip;