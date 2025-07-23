'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class switch_3_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'secondSwitch' ? 2 : subDeviceId === 'thirdSwitch' ? 3 : 1,
        });

        if (!this.isSubDevice()) {
            await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
            .catch(err => {
                this.error('Error when reading device attributes ', err);
            });
        }

    }

    onDeleted(){
		this.log("3 Gang Switch, channel ", subDeviceId, " removed")
	}

}

module.exports = switch_3_gang;