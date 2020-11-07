'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class switch_1_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.enableDebug();
        debug(true);
        this.printNode();

        this.registerCapability('onoff', CLUSTER.ON_OFF);

    }

    onDeleted(){
		this.log("1 Gang Switch removed")
	}

}

module.exports = switch_1_gang;