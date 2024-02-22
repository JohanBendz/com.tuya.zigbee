'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

const DEFAULT_ONOFF_DURATION = 1000;

// Data point and data types definitions
const dataPoints = {
  batteryLevel: 101, // Adjust the data point as per your device's specification
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

    this.printNode();
    
    this.registerCapability('onoff', CLUSTER.ON_OFF);

    this.registerCapabilityListener("onoff", async (value, options) => {
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
    });

        // Tuya specific cluster info
        
        zclNode.endpoints[1].clusters.tuya.on("response", (value) => this.handleTuyaResponse(value));
        
        zclNode.endpoints[1].clusters.tuya.on("reporting", (value) => this.handleTuyaResponse(value));
      
        //zclNode.endpoints[1].clusters.tuya.on("reportingConfiguration", (value) => this.handleTuyaResponse(value));
        //zclNode.endpoints[1].clusters.tuya.on("reportingConfiguration", (value) => this.log('reportingConfiguration event received:', value));

 /*    zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });
*/


  }

  async handleTuyaResponse(response) {
    try {
    const dp = response.dp;
    const value = this.getDataValue(response);
    this.log("Irrigation !!!! controller handleTuyaResponse dp: " + dp + " value: " + value);
    switch (dp) {
      case dataPoints.batteryLevel:
        this.log("Battery: " + value);
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        parsedValue = value;
        this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", parsedValue);

        this.setCapabilityValue('measure_battery', parsedValue).catch(this.error);
        this.setCapabilityValue('alarm_battery', (parsedValue < batteryThreshold)).catch(this.error);
        break;
    default:
      this.log('dp value', dp, value)
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
