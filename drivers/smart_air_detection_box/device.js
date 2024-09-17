"use strict";

const { Cluster } = require("zigbee-clusters");
const TuyaSpecificCluster = require("../../lib/TuyaSpecificCluster");
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

// Data Points for TS0601 (_TZE200_yvx5lh6k)
const dataPoints = {
    tsCO2: 2,
    tsTemperature: 18,
    tsHumidity: 19,
    tsFormaldehyde: 21,
    tsVOC: 22
};

const dataTypes = {
    raw: 0,
    bool: 1,
    value: 2,
    string: 3,
    enum: 4,
    bitmap: 5,
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    let value = 0;

    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }

    return value;
};

const getDataValue = (dpValue) => {
    switch (dpValue.datatype) {
        case dataTypes.raw:
            return dpValue.data;
        case dataTypes.bool:
            return dpValue.data[0] === 1;
        case dataTypes.value:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(
                dpValue.data
            );
        case dataTypes.string:
            let dataString = "";
            for (let i = 0; i < dpValue.data.length; ++i) {
                dataString += String.fromCharCode(dpValue.data[i]);
            }
            return dataString;
        case dataTypes.enum:
            return dpValue.data[0];
        case dataTypes.bitmap:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(
                dpValue.data
            );
    }
};

class SmartAirDetectionBox extends TuyaSpecificClusterDevice {
    async onNodeInit({ zclNode }) {
        this.printNode();

        zclNode.endpoints[1].clusters.tuya.on("response", (value) =>
            this.handleDataPoint(value)
        );
    }

    async handleDataPoint(data) {
        const dp = data.dp;
        const value = getDataValue(data);

        switch (dp) {
            case dataPoints.tsFormaldehyde:
                // Formaldehyde data point
                this.log("Formaldehyde: ", value);
                this.setCapabilityValue("measure_formaldehyde", value);
                break;
            case dataPoints.tsVOC:
                // VOC data point
                this.log("VOC: ", value);
                this.setCapabilityValue("measure_voc", value);
                break;
            case dataPoints.tsCO2:
                // CO2 data point
                this.log("CO2: ", value);
                this.setCapabilityValue("measure_co2", value);
                break;
            case dataPoints.tsTemperature:
                // Temperature data point
                const temperatureValue = value / 10.0;
                this.log("Temperature: ", temperatureValue);
                this.setCapabilityValue("measure_temperature", temperatureValue);
                break;
            case dataPoints.tsHumidity:
                // Humidity data point
                const humidityValue = value / 10.0;
                this.log("Humidity: ", humidityValue);
                this.setCapabilityValue("measure_humidity", humidityValue);
                break;
            // Add additional cases as necessary
            default:
                this.log("Unhandled Data Point (dp, value):", dp, value);
        }
    }

    onDeleted() {
        this.log("Smart Air Detection Box removed");
    }
}

module.exports = SmartAirDetectionBox;
