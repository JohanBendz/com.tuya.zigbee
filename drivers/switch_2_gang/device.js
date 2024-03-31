'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes } = require('zigbee-clusters');

Cluster.addCluster(TuyaOnOffCluster); // Assuming TuyaOnOffCluster is used

class switch_2_gang extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
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
            // Register 'onoff' capability for both endpoints
            this.registerCapability('onoff', CLUSTER.ON_OFF, {
                endpoint: 1,
            });
            this.registerCapability('onoff', CLUSTER.ON_OFF, {
                endpoint: 2,
            });

            // Register 'indicator_mode' capability and handle accordingly
            // You can reuse the logic from wall_switch_1_gang for indicator mode handling
            // Read indicator mode attribute and set it in settings, handle settings changes
        } catch (err) {
            this.error('Error registering capability: ', err);
        }
    }

    onDeleted() {
        const { subDeviceId } = this.getData();
        this.log("2 Gang Switch, channel ", subDeviceId, " removed");
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        let parsedValue = 0;

        // Handle indicator mode setting changes
        if (changedKeys.includes('indicator_mode')) {
            parsedValue = parseInt(newSettings.indicator_mode);
            // Write indicator mode attribute to the respective endpoint based on the setting
            // You can reuse the logic from wall_switch_1_gang
        }
    }

}

module.exports = switch_2_gang;
