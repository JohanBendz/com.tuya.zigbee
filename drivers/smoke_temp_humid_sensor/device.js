'use strict';

const {Cluster} = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { V1_SMOKE_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  tsSmokeAlarm: V1_SMOKE_DATA_POINTS.smokeAlarm, // 0=Smoke Alarm On, 1=Smoke Alarm Off
  tsTamperAlert: 4,                               // not used in this version
  tsBatteryState: V1_SMOKE_DATA_POINTS.batteryState, // dp14 0=20% 1=50% 2=90% [dp=14] battery low   value 2 (FULL)
  tsTemperature: V1_SMOKE_DATA_POINTS.temperature, //*10
  tsHumidity: V1_SMOKE_DATA_POINTS.humidity // %
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

class smoke_temp_humid extends TuyaSpecificClusterDevice {
  async onNodeInit({zclNode}) {

    this.printNode();

    this.addCapability("measure_temperature");
		this.addCapability("measure_humidity");
		this.addCapability("measure_battery");

    zclNode.endpoints[1].clusters.tuya.on("response", value => this.updatePosition(value));
  }

  async updatePosition(data) {
    const dp = data.dp;
    const value = getDataValue(data);
    switch (dp) {
      case dataPoints.tsSmokeAlarm:
        this.log("present state: "+ value);
        var smokeAlarm = value === 0 ? true : false;
        this.setCapabilityValue('alarm_smoke', Boolean(smokeAlarm)).catch(this.error);
        break;

      case dataPoints.tsTamperAlert:
        this.setCapabilityValue('alarm_tamper', Boolean(value)).catch(this.error);
        break;

      case dataPoints.tsBatteryState:

        switch (value) { 
          case 0:
            var batteryPerc = 20;
            var batAlarm = value === 0 ? true : false;
            this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPerc);
            this.setCapabilityValue('alarm_battery', batAlarm).catch(this.error);
          case 1:
            var batteryPerc = 50;
            this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPerc);
          case 2:
            var batteryPerc = 90;
            this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPerc);
        break;
        }
        
        this.setCapabilityValue('measure_battery', batteryPerc).catch(this.error);

        break;
      
      case dataPoints.tsTemperature: // Temperature  ( x10 )
    		const temperatureOffset = this.getSetting('temperature_offset') || 0;

				this.log('Meaured Temperature is ', (value / 10.0), ' C (', value, ')');
				this.setCapabilityValue('measure_temperature',value / 10.0 + temperatureOffset).catch(this.error);
				break;

			case dataPoints.tsHumidity: // Humidity Level
				const humidityOffset = this.getSetting('humidity_offset') || 0;

    		this.log('Mearured Humidity Level is ', value, ' %RH (', value, ')');
				this.setCapabilityValue('measure_humidity',value + humidityOffset).catch(this.error);
				break;

      default:
      this.log('dp value', dp, value)
    }
  }

  onDeleted() {
    this.log("Smoke sensor removed")
  }

}

module.exports = smoke_temp_humid;

