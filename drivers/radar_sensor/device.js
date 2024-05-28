"use strict";

const { Cluster } = require("zigbee-clusters");
const TuyaSpecificCluster = require("../../lib/TuyaSpecificCluster");
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

const setDeviceDatapoints = (manufacturerName) => {
  switch (manufacturerName) {
    case "_TZE200_ztc6ggyl":
    case "_TZE201_ztc6ggyl":
    case "_TZE202_ztc6ggyl":
    case "_TZE203_ztc6ggyl":
    case "_TZE204_ztc6ggyl":
      return {
        tshpsPresenceState: 1,
        tshpscSensitivity: 2,
        tshpsMinimumRange: 3,
        tshpsMaximumRange: 4,
        tshpsTargetDistance: 9,
        tshpsDetectionDelay: 101,
        tshpsFadingTime: 102,
        tshpsIlluminanceLux: 104,
      };
      break;

    case "_TZE204_7gclukjs":
      return {
        tshpsPresenceState: 1, // {'none': 0, 'Presence': 1, 'Move and presence': 2}
        tshpscSensitivity: 2,
        tshpsMinimumRange: 3,
        tshpsMaximumRange: 4,
        tshpsTargetDistance: 9,
        tshpsIlluminanceLux: 103,
        tshpsPresence: 104, // true/false
        tshpsDetectionDelay: 105,
      };
      break;

    default:
      return {
        shpsPresenceState: 1,
        tshpscSensitivity: 2,
        tshpsMinimumRange: 3,
        tshpsMaximumRange: 4,
        tshpsTargetDistance: 9,
        tshpsDetectionDelay: 101,
        tshpsFadingTime: 102,
        tshpsIlluminanceLux: 104,
      };
  }
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
      let dataString = "";
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

class radarSensor extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.manufacturerName = this.getSetting("zb_manufacturer_name");

    this.dataPoints = setDeviceDatapoints(this.manufacturerName);

    zclNode.endpoints[1].clusters.tuya.on("response", (value) =>
      this.updatePosition(value)
    );
  }

  async updatePosition(data) {
    const dp = data.dp;
    const value = getDataValue(data);

    this.log("dp value", dp, value);

    switch (dp) {
      case this.dataPoints.tshpsPresenceState:
        this.log("presence state: " + value);
        this.setCapabilityValue("alarm_motion", Boolean(value));
        break;
      case this.dataPoints.tshpscSensitivity:
        this.log("sensitivity state: " + value);
        break;
      case this.dataPoints.tshpsIlluminanceLux:
        this.log("lux value: " + value);
        this.onIlluminanceMeasuredAttributeReport(value);
        break;
      case this.dataPoints.tshpsTargetDistance:
        this.log("target distance: " + value)
        switch (this.manufacturerName) {
          case "_TZE204_7gclukjs":
               this.setCapabilityValue("target_distance", value / 10);
          break;
          default:
            if (new Date().getSeconds() % 10 === 0) {
              this.setCapabilityValue("target_distance", value / 100);
            }
        }

        break;

      default:
      // this.log("dp value", dp, value);
    }
  }

  onDeleted() {
    this.log("Radar sensor removed");
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes("radar_sensitivity")) {
      this.writeData32(
        this.dataPoints.tshpscSensitivity,
        newSettings["radar_sensitivity"]
      );
    }

    if (changedKeys.includes("minimum_range")) {
      this.writeData32(
        this.dataPoints.tshpsMinimumRange,
        newSettings["minimum_range"] * 100
      );
    }

    if (changedKeys.includes("maximum_range")) {
      this.writeData32(
        this.dataPoints.tshpsMaximumRange,
        newSettings["maximum_range"] * 100
      );
    }

    if (changedKeys.includes("detection_delay")) {
      this.writeData32(
        this.dataPoints.tshpsDetectionDelay,
        newSettings["detection_delay"]
      );
    }

    if (changedKeys.includes("fading_time")) {
      this.writeData32(
        this.dataPoints.tshpsFadingTime,
        newSettings["fading_time"]
      );
    }
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    this.log(
      "measure_luminance | Luminance - measuredValue (lux):",
      measuredValue
    );
    this.setCapabilityValue("measure_luminance", measuredValue);
  }

  onIASZoneStatusChangeNotification({
    zoneStatus,
    extendedStatus,
    zoneId,
    delay,
  }) {
    this.log(
      "IASZoneStatusChangeNotification received:",
      zoneStatus,
      extendedStatus,
      zoneId,
      delay
    );
    this.setCapabilityValue("alarm_motion", zoneStatus.alarm1);
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
