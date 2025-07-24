'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class dimmer_2_gang extends ZigbeeDevice {

    async onInit({zclNode}) {

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', 'genOnOff', {
            endpoint: subDeviceId === 'secondDimmer' ? 2 : 1,
        });

        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
            endpoint: subDeviceId === 'secondDimmer' ? 2 : 1,
        });

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    onDeleted(){
		this.log("2 Gang Dimmer removed")
	}

}

module.exports = dimmer_2_gang;
