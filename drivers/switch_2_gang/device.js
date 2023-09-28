'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class switch_2_gang extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();
        debug(true);

        if (!this.isSubDevice()) {
            await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
            .catch(err => {
                this.error('Error when reading device attributes ', err);
            });
        }

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        try {
            if (subDeviceId === 'firstSwitch') {
                this.registerCapability('onoff', CLUSTER.ON_OFF, {
                    name: 'Knapp 1',
                    endpoint: 1,
                });
            } else if (subDeviceId === 'secondSwitch') {
                this.registerCapability('onoff', CLUSTER.ON_OFF, {
                    name: 'Knapp 2',
                    endpoint: 2,
                });
            }
        } catch (err) {
            this.error('Error registering capability: ', err);
        }

    }

    onDeleted(){
        const { subDeviceId } = this.getData();
        this.log("2 Gang Switch, channel ", subDeviceId, " removed");
    }

}

module.exports = switch_2_gang;