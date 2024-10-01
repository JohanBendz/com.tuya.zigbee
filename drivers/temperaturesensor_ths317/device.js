'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { V1_TEMPHUMID_SENSOR_DATA_POINTS } = require('../../lib/TuyaDataPoints');
const { getDataValue } = require('../../lib/TuyaHelpers');

// Register Tuya cluster with Zigbee
Cluster.addCluster(TuyaSpecificCluster);

class temperaturesensor_ths317 extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    super.onNodeInit({ zclNode });
    
    // Enable debug logging
    //this.enableDebug();

    this.printNode();

    // Initialize reporting settings from the device settings
    this.initializeReportingSettings();

    // Listen for Tuya cluster responses
    const tuyaCluster = this.zclNode.endpoints[1].clusters.tuya;
    if (tuyaCluster) {
      tuyaCluster.on("response", this.onTuyaClusterMessage.bind(this));
    } else {
      this.error('Tuya cluster not found on endpoint 1');
    }
  }

  initializeReportingSettings() {
    this.temperatureOffset = this.getSetting('temperature_offset')|| 0;
    this.batteryThreshold = this.getSetting('batteryThreshold')|| 20;
  }

  onTuyaClusterMessage(message) {
    this.log('Tuya cluster message:', message);
    
    try {
      // Use helper function to parse datapoint value
      const value = getDataValue(message);
      const dp = message.dp;
      
      this.log(`Datapoint ${dp} report:`, value);

      // Handle different datapoints
      switch (dp) {
        case V1_TEMPHUMID_SENSOR_DATA_POINTS.currentTemperature:
          this.onTemperatureReport(value);
          break;
        case V1_TEMPHUMID_SENSOR_DATA_POINTS.batteryLevel:
          this.onBatteryReport(value);
          break;
        default:
          this.log(`Unknown datapoint ${dp} report:`, value);
      }
    } catch (error) {
      this.error('Error processing Tuya cluster report:', error);
    }
  }

  onTemperatureReport(measuredValue) {
		const parsedValue = measuredValue / 10;
		this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature): ', parsedValue, ' + temperature offset ', this.temperatureOffset);
		this.setCapabilityValue('measure_temperature', parsedValue + this.temperatureOffset).catch(this.error);
	}

  onBatteryReport(batteryPercentageRemaining) {
		this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining);
		this.setCapabilityValue('measure_battery', batteryPercentageRemaining).catch(this.error);
		this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining < this.batteryThreshold) ? true : false).catch(this.error);
	}

  async onSettings({oldSettings, newSettings, changedKeys}) {
    // Update cached settings
    if (changedKeys.includes('temperature_offset')) {
      this.temperatureOffset = newSettings.temperature_offset;
      this.log(`Temperature offset changed to ${this.temperatureOffset}`);
      
      // Update temperature capability with new offset
      this.onTemperatureReport(this.getCapabilityValue('measure_temperature')*10);
    }
    
    if (changedKeys.includes('batteryThreshold')) {
      this.batteryThreshold = newSettings.batteryThreshold;
      this.log(`Battery threshold changed to ${this.batteryThreshold}`);
      
      // Update battery alarm with new threshold
      this.onBatteryReport(this.getCapabilityValue('measure_battery'));
    }
  }

  onDeleted() {
    this.log('Temperature sensor THS317-ET-TY removed');
  }
}

module.exports = temperaturesensor_ths317;