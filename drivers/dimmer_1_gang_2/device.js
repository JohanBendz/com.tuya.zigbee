"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { debug, CLUSTER } = require("zigbee-clusters");

class dimmer_1_gang_2 extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNodeDetails(zclNode);

        try {
            this.registerDeviceCapabilities();
            await this.readAndLogDeviceAttributes(zclNode);
        } catch (err) {
            this.error("Error during initialization: ", err);
        }
    }

    printNodeDetails(zclNode) {
        this.log("Initializing node with the following details:");
        this.log("Manufacturer:", zclNode.endpoints[1].clusters.basic.attributes.manufacturerName);
        this.log("Model ID:", zclNode.endpoints[1].clusters.basic.attributes.modelId);
    }

    registerDeviceCapabilities() {
        this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });
        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, { endpoint: 1 });
        this.log("Capabilities for onoff and dim registered for endpoint 1.");
    }

    async readAndLogDeviceAttributes(zclNode) {
        const attributes = [
            'manufacturerName', 
            'zclVersion', 
            'appVersion', 
            'modelId', 
            'powerSource', 
            'attributeReportingStatus'
        ];

        try {
            const result = await zclNode.endpoints[1].clusters.basic.readAttributes([...attributes]);
            this.log("Device attributes read successfully:", result);

        } catch (err) {
            this.error('Failed to read device attributes: ', err);
        }
    }

    onDeleted() {
        this.log("1 Gang Dimmer removed successfully.");
    }
}

module.exports = dimmer_1_gang_2;
