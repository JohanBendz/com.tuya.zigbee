"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { CLUSTER } = require("zigbee-clusters");

class zemismart_6gang extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability("onoff", CLUSTER.ON_OFF, {
            endpoint:
                subDeviceId === "secondSwitch"
                    ? 2
                    : subDeviceId === "thirdSwitch"
                    ? 3
                    : 1,
        });

        if (!this.isSubDevice()) {
            await zclNode.endpoints[1].clusters.basic
                .readAttributes(
                    "manufacturerName",
                    "zclVersion",
                    "appVersion",
                    "modelId",
                    "powerSource",
                    "attributeReportingStatus"
                )
                .catch((err) => {
                    this.error("Error when reading device attributes ", err);
                });
        }
    }

    onDeleted() {
        this.log("Zemismart 6gang, channel ", subDeviceId, " removed");
    }
}

module.exports = zemismart_6gang;
