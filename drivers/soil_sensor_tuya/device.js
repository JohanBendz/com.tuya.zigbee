'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

class TuyaSoilSensor extends TuyaSpecificClusterDevice {

    async onNodeInit({ zclNode }) {
        
        this.printNode();

        // Handle incoming reports from the device
        zclNode.endpoints[1].clusters.tuya.bind('report', this.onReport.bind(this));

        // Handler for Soil Moisture
        this.registerCapabilityListener('soil_moisture', async (value) => {
            return this.writeData32(3, value);
        });

        // Handler for Temperature
        this.registerCapabilityListener('measure_temperature', async (value) => {
            return this.writeData32(5, value);
        });

        // Handler for Temperature Unit
        this.registerCapabilityListener('temperature_unit', async (value) => {
            // convert value to the corresponding enum
            const valMap = {'C': 0, 'F': 1};
            return this.writeEnum(9,valMap[value]);
        });

        // Handler for Battery Alarm
        this.registerCapabilityListener('alarm_battery', async (value) => {
            // convert value to the corresponding enum
            const valMap = {'Normal': 0, 'Low': 1};
            return this.writeEnum(14,valMap[value]);
        });

        // Handler for Battery
        this.registerCapabilityListener('measure_battery', async (value) => {
            return this.writeData32(15, value);
        });

        await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });
    }

    // Parse incoming reports from the device
    onReport(name, data) {
        switch (data.dp) {
            case 3:
                // Soil moisture report
                this.setCapabilityValue('soil_moisture', data.value);
                break;
            case 5:
                // Temperature report
                this.setCapabilityValue('measure_temperature', data.value);
                break;
            case 14:
                // Battery state report
                this.setCapabilityValue('alarm_battery', data.value === 1);
                break;
            case 15:
                // Battery level report
                this.setCapabilityValue('measure_battery', data.value);
                break;
            default:
                this.log(`Unhandled datapoint: ${data.dp}`);
        }
    }

    onDeleted() {
        this.log("Soil Sensor removed");
    }
}

module.exports = TuyaSoilSensor;

