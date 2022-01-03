'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class smart_switch extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        this.registerCapability('onoff', CLUSTER.ON_OFF);

    }

    onDeleted(){
		this.log("Smart Switch removed")
	}

}

module.exports = smart_switch;