'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes, debug } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  tshpsPresenceState: 1,      // OK
  tshpscSensitivity: 2,       // not sure
  tshpsMinimumRange: 3,       // might be correct
  tshpsMaximumRange: 4,       // might be correct
  tshpsFadingTime: 102,       // OK
  tshpsIlluminanceLux: 106,   // Works but is also reported according Zigbee standard
  tshpsBatteryPercentage: 110 // Works but is also reported according Zigbee standard
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

class radarLuminanceSensor extends TuyaSpecificClusterDevice {
  async onNodeInit({zclNode}) {
    this.printNode();

    // Standaard capabilities
    this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT);
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);
    // Tuya specific datapoint handling
    zclNode.endpoints[1].clusters.tuya.on("response", value => this.updatePosition(value));
  }

  async updatePosition(data) {
    const dp = data.dp;
    const value = getDataValue(data);

    switch (dp) {
      case dataPoints.tshpsPresenceState:
        this.log("presence state: "+ value)
        this.setCapabilityValue('alarm_motion', Boolean(value))
        break;
      case dataPoints.tshpscSensitivity:
        this.log("sensitivity state: "+ value)
        break;

      default:
        this.log('dp value', dp, value)
    }
  }

  onDeleted() {
    this.log("Sensor removed")
  }

  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_motion', zoneStatus.alarm1);
  }

  async onSettings({newSettings, changedKeys}) {
    if (changedKeys.includes('radar_sensitivity')) {
      this.writeData32(dataPoints.tshpscSensitivity, newSettings['radar_sensitivity'])
    }

    if (changedKeys.includes('minimum_range')) {
      this.writeData32(dataPoints.tshpsMinimumRange, newSettings['minimum_range']*100)
    }

    if (changedKeys.includes('maximum_range')) {
      this.writeData32(dataPoints.tshpsMaximumRange, newSettings['maximum_range']*100)
    }

    if (changedKeys.includes('fading_time')) {
      this.writeData32(dataPoints.tshpsFadingTime, newSettings['fading_time'])
    }

  }

}

module.exports = radarLuminanceSensor;
