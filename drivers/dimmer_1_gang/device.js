'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class dimmer_1_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.enableDebug();
        debug(true);
        this.printNode();

        this.registerCapability('onoff', CLUSTER.ON_OFF);
        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);

    }

    onDeleted(){
		this.log("1 Gang Dimmer removed")
	}

}

module.exports = dimmer_1_gang;