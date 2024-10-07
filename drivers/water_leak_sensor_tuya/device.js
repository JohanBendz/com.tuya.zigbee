'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

class TuyaWaterLeakSensor extends TuyaSpecificClusterDevice {

    async onNodeInit({ zclNode }) {
        
        this.printNode();

        // Listen for water leaks
        this.log('Setting up listeners for endpoint 1, tuya cluster...');
        zclNode.endpoints[1].clusters.tuya.on('response', this.onReport.bind(this));
        zclNode.endpoints[1].clusters.tuya.on('reporting', this.onReport.bind(this));
        this.log('Listeners has been set up.');

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

        // Periodically read battery status every hour
        this.batteryInterval = setInterval(async () => {
            try {
                await zclNode.endpoints[1].clusters.tuya.read({ dp: 14 });
                await zclNode.endpoints[1].clusters.tuya.read({ dp: 15 });
            } catch (err) {
                this.error('Error when reading battery status', err);
            }
        }, 3600000);  // 3600000 ms is 1 hour

    }

    // Handle datapoint events
    onReport(data) {
        this.log('Received a response or report:', data);

        if (data.dp === 15) {
            // Set the value of the 'measure_battery' capability.
            this.setCapabilityValue('measure_battery', data.data.readUInt32BE(0));
        } else if (data.dp === 14) {
            // Set the value of the 'alarm_battery' capability.
            this.setCapabilityValue('alarm_battery', data.data.readUInt8(0) !== 0);
        }
        
        if (data.dp === 101) { 
            // Set the value of the 'alarm_water' capability
            this.log('Received a response or report for dp 101, updating capability...');
            this.setCapabilityValue('alarm_water', data.data.readUInt8(0) === 1);
            this.log('Capability has been updated.');
        }
    }
    
    onDeleted() {
        this.log("Water Leak Sensor removed");
    }

    onUninit() {
        clearInterval(this.batteryInterval);
    }

}

module.exports = TuyaWaterLeakSensor;

