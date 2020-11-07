'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class switch_2_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.enableDebug();
        debug(true);
        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'secondSwitch' ? 2 : 1,
        });

    }

    onDeleted(){
		this.log("2 Gang Switch, channel ", subDeviceId, " removed")
	}

}

module.exports = switch_2_gang;