'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class smart_switch extends ZigbeeDevice {

    async onInit({zclNode}) {

        this.printNode();

        this.registerCapability('onoff', 'genOnOff');

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    onDeleted(){
		this.log("Smart Switch removed")
	}

}

module.exports = smart_switch;
