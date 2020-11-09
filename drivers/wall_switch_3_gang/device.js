'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class wall_switch_3_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.enableDebug();
        debug(true);
        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'secondSwitch' ? 2 : subDeviceId === 'thirdSwitch' ? 3 : 1,
        });

    }

    onDeleted(){
		this.log("3 Gang Wall Switch, channel ", subDeviceId, " removed")
	}

}

module.exports = wall_switch_3_gang;