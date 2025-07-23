'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  humidity: 3,
  temperature: 5,
  temperature_unit: 110,
  battery_state: 14,
  battery: 15
}

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

class soilsensor2 extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {

    this.printNode();
/*     debug(true);
    this.enableDebug(); */

    zclNode.endpoints[1].clusters.tuya.on("response", value => this.updateData(value));

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });
  }

  async updateData(data) {
    const dp = data.dp;
    const value = getDataValue(data);

    switch (dp) {
      case dataPoints.humidity:
        this.log("Humidity: " + value);
        this.setCapabilityValue('measure_humidity', value).catch(this.error);
        break;

      case dataPoints.temperature:
        this.log("Temparature: " + value/10);
        this.setCapabilityValue('measure_temperature', value/10).catch(this.error);
        break;

      case dataPoints.battery:
        this.log("Battery: " + value);
        this.setCapabilityValue('measure_battery', value).catch(this.error);
        break;

      case dataPoints.battery_state:
        this.log("Battery state: " + value);
        var batAlarm = value === 0 ? true : false;
        this.setCapabilityValue('alarm_battery', batAlarm).catch(this.error);
        break;

      default:
        // Log any unhandled datapoint traffic
        this.log(`Unhandled datapoint detected. DP: ${dp}, Value: ${value}, DataType: ${data.datatype}`);
        break;
    }
  }

  onDeleted(){
		this.log("Soil sensor removed");
	}
}

module.exports = soilsensor2;

// Cluster 61184 datapoints:
// 3: Humidity (raw)
// 5: temperature (divide by 10)
// 110: temperature unit (divide by 10)
// 14: battery state, 2 = good, 1 = warning, 0 = low
// 15: battery precentage (raw)

/*
  {
    [
  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE284_sgabhwa6"
  },
  "endpoints": {
    "endpointDescriptors": [
      {
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 81,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          4,
          5,
          61184,
          0,
          60672
        ],
        "outputClusters": [
          25,
          10
        ]
      }
    ],
*/