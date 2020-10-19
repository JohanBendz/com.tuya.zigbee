'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class smartplug extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.enableDebug();
		debug(true);
		this.printNode();

    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        getOpts: {
          getOnStart: true,
          pollInterval: 3600,
        },
      });
    }

    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', CLUSTER.METERING, {
        getOpts: {
          getOnStart: true,
        },
      });
    }

    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', CLUSTER.METERING, {
        getOpts: {
          getOnStart: true,
        },
      });
    }

  }

	onDeleted(){
		this.log("Smart Plug removed")
	}

}

module.exports = smartplug;