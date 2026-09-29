'use strict';

const {Cluster} = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  tshpsPresenceState: 1,
  tshpscSensitivity: 2,
  tshpsMinimumRange: 3,
  tshpsMaximumRange: 4,
  tshpsTargetDistance: 9,
  tshpsDetectionDelay: 101,
  tshpsFadingTime: 102,
  tshpsIlluminanceLux: 104,
}

const alternateDpManufacturers = new Set(['_TZE204_gkfbdvyx']);
const tenthSecondTimingManufacturers = new Set(['_TZE204_qasjif9e', '_TZE204_ztqnh5cg']);
const zyM10024GV2Manufacturers = new Set(['_TZE204_7gclukjs']);
const alternateDataPoints = {
  tshpsFadingTime: 105,
  tshpsIlluminanceLux: 103,
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

class radarSensor extends TuyaSpecificClusterDevice {
  dp = dataPoints;

  async onNodeInit({zclNode}) {
    let manufacturerName;
    try {
      ({manufacturerName} = await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName']));
    } catch (err) {
      this.error('Failed to read manufacturerName attribute:', err);
    }

    this.usesAlternateDataPoints = alternateDpManufacturers.has(manufacturerName);
    this.usesTenthSecondTiming = tenthSecondTimingManufacturers.has(manufacturerName);
    this.isZyM10024GV2 = zyM10024GV2Manufacturers.has(manufacturerName);
    this.dp = this.usesAlternateDataPoints ? {...dataPoints, ...alternateDataPoints} : dataPoints;

    if (this.isZyM10024GV2) {
      this.dp = {
        ...dataPoints,
        tshpsPresenceState: 104,
        tshpsState: 1,
        tshpsIlluminanceLux: 103,
        tshpsTargetDistance: 9,
        tshpsFadingTime: 105,
      };
    }

    this.log(
      `manufacturer: ${manufacturerName}, using ${this.isZyM10024GV2 ? 'ZY-M100-24GV2' : this.usesAlternateDataPoints ? 'alternate' : 'default'} datapoints`,
      `timing scale: ${this.usesTenthSecondTiming ? '0.1s' : '1s'}`
    );

    const handleDatapoint = async value => {
      try {
        await this.updatePosition(value);
      } catch (err) {
        this.error('Failed to process Tuya radar datapoint', err);
      }
    };

    zclNode.endpoints[1].clusters.tuya.on("response", handleDatapoint);
    zclNode.endpoints[1].clusters.tuya.on("reporting", handleDatapoint);
  }

  async updatePosition(data) {
    const dp = data.dp;
    const value = getDataValue(data);
    const distanceUpdateInterval = this.getSetting('distance_update_interval') ?? 10;

    switch (dp) {
      case this.dp.tshpsPresenceState:
        this.log("presence state: "+ value)
        await this.setCapabilityValue('alarm_motion', Boolean(value))
        break;

      case this.dp.tshpsState:
        if (this.isZyM10024GV2) {
          this.log('radar state:', value);
          await this.setCapabilityValue('alarm_motion', value === 1 || value === 2);
          break;
        }
        this.log('dp value', dp, value);
        break;
      case dataPoints.tshpscSensitivity:
        this.log("sensitivity state: "+ value)
        break;
      case this.dp.tshpsIlluminanceLux:
        this.log("lux value: "+ value)
        this.onIlluminanceMeasuredAttributeReport(value)
        break;
      case this.dp.tshpsTargetDistance: {
        if (new Date().getSeconds() % distanceUpdateInterval === 0) {
          const divisor = this.isZyM10024GV2 ? 10 : 100;
          this.setCapabilityValue('target_distance', value / divisor).catch(this.error);
        }

        break;
      }

      default:
        this.log('dp value', dp, value)
    }
  }

  onDeleted() {
    this.log("Radar sensor removed")
  }

  async onSettings({newSettings, changedKeys}) {
    if (changedKeys.includes('radar_sensitivity')) {
      await this.writeData32(dataPoints.tshpscSensitivity, newSettings['radar_sensitivity'])
    }

    if (changedKeys.includes('minimum_range')) {
      await this.writeData32(dataPoints.tshpsMinimumRange, newSettings['minimum_range']*100)
    }

    if (changedKeys.includes('maximum_range')) {
      await this.writeData32(dataPoints.tshpsMaximumRange, newSettings['maximum_range']*100)
    }

    if (changedKeys.includes('detection_delay')) {
      if (this.usesAlternateDataPoints || this.isZyM10024GV2) {
        throw new Error('Detection delay is not supported on this device model.');
      }
      const detectionDelay = this.usesTenthSecondTiming
        ? newSettings['detection_delay'] * 10
        : newSettings['detection_delay'];
      await this.writeData32(dataPoints.tshpsDetectionDelay, detectionDelay)
    }

    if (changedKeys.includes('fading_time')) {
      const fadingTime = this.usesTenthSecondTiming
        ? newSettings['fading_time'] * 10
        : newSettings['fading_time'];
      await this.writeData32(this.dp.tshpsFadingTime, fadingTime)
    }
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    this.log('measure_luminance | Luminance - measuredValue (lux):', measuredValue);
    this.setCapabilityValue('measure_luminance', measuredValue).catch(this.error);
  }

  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this.error);
  }

}

module.exports = radarSensor;


// "ids": {
//   "modelId": "TS0601",
//     "manufacturerName": "_TZE200_ztc6ggyl"
// },
// "endpoints": {
//   "endpointDescriptors": [
//     {
//       "endpointId": 1,
//       "applicationProfileId": 260,
//       "applicationDeviceId": 81,
//       "applicationDeviceVersion": 0,
//       "_reserved1": 1,
//       "inputClusters": [
//         0,
//         4,
//         5,
//         61184
//       ],
//       "outputClusters": [
//         25,
//         10
//       ]
//     }
//   ],
//     "endpoints": {
//     "1": {
//       "clusters": {
//         "basic": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 0,
//               "name": "zclVersion",
//               "value": 3,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 1,
//               "name": "appVersion",
//               "value": 65,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 2,
//               "name": "stackVersion",
//               "value": 0,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 3,
//               "name": "hwVersion",
//               "value": 1,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 4,
//               "name": "manufacturerName",
//               "value": "_TZE200_ztc6ggyl",
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 5,
//               "name": "modelId",
//               "value": "TS0601",
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 6,
//               "name": "dateCode",
//               "value": "",
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 7,
//               "name": "powerSource",
//               "value": "mains",
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "writable",
//                 "reportable"
//               ],
//               "id": 65502,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65533,
//               "name": "clusterRevision",
//               "value": 2,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65534,
//               "name": "attributeReportingStatus",
//               "value": "PENDING",
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65504,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65505,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65506,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65507,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "groups": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 0,
//               "name": "nameSupport",
//               "value": {
//                 "type": "Buffer",
//                 "data": [
//                   0
//                 ]
//               },
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65533,
//               "name": "clusterRevision",
//               "value": 2,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "scenes": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 0,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 1,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 2,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 3,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 4,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65533,
//               "name": "clusterRevision",
//               "value": 2,
//               "reportingConfiguration": {
//                 "status": "NOT_FOUND",
//                 "direction": "reported"
//               }
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         }
//       },
//       "bindings": {
//         "ota": {
//           "attributes": [],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "time": {
//           "attributes": [],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         }
//       }
//     }
//   }
// }
