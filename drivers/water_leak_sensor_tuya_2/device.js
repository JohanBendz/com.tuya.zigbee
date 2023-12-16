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

        await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });
    }

    // Handle datapoint events
    onReport(data) {
        this.log('Received a response or report:', data);
     
        if (data.dp === 4) {
            // Set the value of the 'measure_battery' capability.
            this.setCapabilityValue('measure_battery', data.data.readUInt32BE(0)).catch(this.error);;
            this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining < 20) ? true : false).catch(this.error);
        } else if (data.dp === 1) { 
            // Set the value of the 'alarm_water' capability
            this.log('Received a response or report for dp 1, updating capability...');
            this.setCapabilityValue('alarm_water', data.data.readUInt8(0) === 0);
            this.log('Capability has been updated.');
        }else{
            this.log('Received a response or report for dp ', data.dp, ' but we have nothing that handles that.');
        }

        
    }
    
    onDeleted() {
        this.log("Water Leak Sensor removed");
    }
}

module.exports = TuyaWaterLeakSensor;

