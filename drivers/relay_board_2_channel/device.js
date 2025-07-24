'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class relay_board_2_channel extends ZigbeeDevice {

    async onInit({zclNode}) {

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        let options = {};

        switch (subDeviceId){
            case 'secondSwitch':
                options.endpoint = 2;
                break;
            default:
                options.endpoint = 1;
                break;
        }

        this.registerCapability('onoff', 'genOnOff', options);

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    onDeleted(){
		this.log("2 Channel Relay Board, channel ", subDeviceId, " removed")
	}

}

module.exports = relay_board_2_channel;
