'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

const DEFAULT_ONOFF_DURATION = 1000

// Data point and data types definitions
const dataPoints = {
  batteryLevel: 101,
};

const dataTypes = {
  value: 2, // 4 byte value
};

class IrrigationController extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF);

    this.registerCapabilityListener("onoff", async (value, options) => {
      this.log("Irrigation controller value " + value);
      this.log("Irrigation controller options " + options.duration);
      if (value && options.duration != undefined) {
        await zclNode.endpoints[1].clusters['onOff'].setOn();
        await new Promise(resolve => setTimeout(resolve, options.duration));
        await zclNode.endpoints[1].clusters['onOff'].setOff();
      } else if (value && options.duration === undefined) {
        await zclNode.endpoints[1].clusters['onOff'].setOn();
      } else if (!value && options.duration === undefined) {
        await zclNode.endpoints[1].clusters['onOff'].setOff();
      }

        // Handle Tuya-specific responses
        zclNode.endpoints[1].clusters.tuya.on("response", (response) => {
          this.handleTuyaResponse(response);
      });

    });
  
  }

    handleTuyaResponse(response) {
      const dp = response.dp;
      const value = this.getDataValue(response);

      // Handle battery level data point
      if (dp === dataPoints.batteryLevel) {
          this.log("Irrigation controller battery Level: ", value);
          this.updateBatteryLevel(value);
      }
   }

    getDataValue(dpValue) {
      // Interpret the value based on data type
      if (dpValue.datatype === dataTypes.value) {
          return dpValue.data[0]; 
      }
    }
  
    updateBatteryLevel(value) {
      // Convert and update battery level
      const batteryLevel = value; 
      this.setCapabilityValue('measure_battery', batteryLevel).catch(this.error);

      // Get the battery low threshold setting or use default
      const batteryThreshold = this.getSetting('batteryThreshold') || 20;

    // Update the alarm_battery capability based on the threshold
    this.setCapabilityValue('alarm_battery', batteryLevel < batteryThreshold).catch(this.error);
  }

  async onDeleted() {
    this.log('Smart irrigation controller removed');
  }

}

module.exports = IrrigationController;