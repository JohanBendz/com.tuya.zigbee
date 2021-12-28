'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class relay_board_4_channel extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        let options = {};

        switch (subDeviceId){
            case 'secondSwitch':
                options.endpoint = 2;
                break;
            case 'thirdSwitch':
                options.endpoint = 3;
                break;
            case 'fourthSwitch':
                options.endpoint = 4;
                break;
            default:
                options.endpoint = 1;
                break;
        }

        this.registerCapability('onoff', CLUSTER.ON_OFF, options);

    }

    onDeleted(){
		this.log("4 Channel Relay Board, channel ", subDeviceId, " removed")
	}

}

module.exports = relay_board_4_channel;