'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

const DEFAULT_ONOFF_DURATION = 1000;

// Data point and data types definitions
const dataPoints = {
  batteryLevel: 101, // Adjust the data point as per your device's specification
  OnOffreport : 102
};

const dataTypes = {
  raw: 0, // [ bytes ]
  bool: 1, // [0/1]
  value: 2, // [ 4 byte value ]
  string: 3, // [ N byte string ]
  enum: 4, // [ 0-255 ]
  bitmap: 5, // [ 1,2,4 bytes ] as bits
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
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
}

class IrrigationController extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

     // Tuya specific cluster info
        
     zclNode.endpoints[1].clusters.tuya.on("response", (value) => this.handleTuyaResponse(value));

     zclNode.endpoints[1].clusters.tuya.on("reportingConfiguration", (value) => this.handleTuyaResponse(value));
    
    this.registerCapability('onoff', CLUSTER.ON_OFF);

    /*
    this.registerCapabilityListener("onoff", async (value, options) => {
      try {
        this.log("Irrigation controller value " + value);
        this.log("Irrigation controller options " + options.duration);
    
        if (value && options.duration !== undefined) {
          await zclNode.endpoints[1].clusters['onOff'].setOn();
          await new Promise(resolve => setTimeout(resolve, options.duration));
          await zclNode.endpoints[1].clusters['onOff'].setOff();
        } else if (value && options.duration === undefined) {
          await zclNode.endpoints[1].clusters['onOff'].setOn();
        } else if (!value && options.duration === undefined) {
          await zclNode.endpoints[1].clusters['onOff'].setOff();
        }
      } catch (err) {
        this.error('Error handling onoff capability:', err);
      }
    });
    */

    // add battery capabilities if needed
    if (!this.hasCapability('measure_battery')) {
      this.addCapability('measure_battery').catch(this.error);   
    }
    if (!this.hasCapability('alarm_battery')) {
      this.addCapability('alarm_battery').catch(this.error);
    }

      }

  async handleTuyaResponse(response) {
    try {
    const dp = response.dp;
    const value = getDataValue(response);
    this.log("Irrigation controller handleTuyaResponse dp: " + dp + " value: " + value);

    switch (dp) {

      case dataPoints.batteryLevel:
        this.log("Irrigation controller Battery: " + value);
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", value);
        this.setCapabilityValue('measure_battery', value).catch(this.error);
        this.setCapabilityValue('alarm_battery', (value < batteryThreshold)).catch(this.error);
        break;

      case dataPoints.OnOffreport:
        this.log("Irrigation controller OnOffreport: " + value);
        const isOn = value === 0; // 2 means Off, 0 means On
        await this.setCapabilityValue('onoff', isOn);      
        break;

    default:
      this.log('Irrigation dp value - not processed', dp, value)
    }
  } catch (error) {
    this.error('Error in handleTuyaResponse:', error);
}
  }
  
  async onDeleted() {
    this.log('Smart irrigation controller removed');
  }

}

module.exports = IrrigationController;
