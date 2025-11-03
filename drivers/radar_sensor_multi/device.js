'use strict';

const {Cluster} = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

// Data Points for TS0601 (_TZE200_rhgsbacq) - HOBEIAN ZG-204ZV Profile
const dataPoints = {
  presenceState: 1,        // Motion/Presence detection
  radarSensitivity: 2,     // Radar sensitivity (0-19)
  humidity: 101,           // Relative humidity (value/10 %)
  fadingTime: 102,         // Motion keep time (seconds)
  illuminance: 106,        // Light sensing (lux)
  battery: 110,            // Battery percentage
  temperature: 111,        // Temperature (value/10 °C)
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
};

class RadarSensorMulti extends TuyaSpecificClusterDevice {
  async onNodeInit({zclNode}) {
    this.printNode();

    zclNode.endpoints[1].clusters.tuya.on("response", value => this.handleDataPoint(value));
  }

  async handleDataPoint(data) {
    const dp = data.dp;
    const value = getDataValue(data);

    switch (dp) {
      case dataPoints.presenceState:
        this.log("Motion state:", value);
        this.setCapabilityValue('alarm_motion', Boolean(value)).catch(this.error);
        break;

      case dataPoints.radarSensitivity:
        this.log("Radar sensitivity:", value);
        break;

      case dataPoints.illuminance:
        this.log("Illuminance:", value, "lux");
        this.setCapabilityValue('measure_luminance', value).catch(this.error);
        break;

      case dataPoints.temperature:
        const temperatureValue = value / 10.0;
        this.log("Temperature:", temperatureValue, "°C");
        this.setCapabilityValue('measure_temperature', temperatureValue).catch(this.error);
        break;

      case dataPoints.humidity:
        const humidityValue = value / 10.0;
        this.log("Humidity:", humidityValue, "%");
        this.setCapabilityValue('measure_humidity', humidityValue).catch(this.error);
        break;

      case dataPoints.battery:
        this.log("Battery:", value, "%");
        // Battery capability could be added if needed
        break;

      case dataPoints.fadingTime:
        this.log("Fading time:", value, "seconds");
        break;

      default:
        this.log("Unhandled data point:", dp, "value:", value);
        break;
    }
  }

  onDeleted() {
    this.log("Radar Multi-Sensor removed");
  }

  async onSettings({newSettings, changedKeys}) {
    this.log('Settings changed:', changedKeys);
  }
}

module.exports = RadarSensorMulti;
