"use strict";

const { Cluster, CLUSTER } = require("zigbee-clusters");
const TuyaSpecificCluster = require("../../lib/TuyaSpecificCluster");
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

// (cluster: 61184)
// DP, DataType, Value;
// 1, 1, 1;
// 2, 2, 6;
// 3, 2, 0;
// 4, 2, 600;
// 101, 4, 1;
// 102, 2, 60;
// 103, 2, 1;
// 104, 2, 600;
// 105, 2, 8;
// 106, 2, 2287; (lux)
// 107, 1, true; (led indicator)
// 108, 2, 600;
// 109, 2, 8;
// 110, 2, 0;
// 111, 2, 0;
// 113, 1, false;
// 115, 2, 2;
// 116, 4, 2;
// 117, 4, 1;
// 118, 1, false;
// 119, 1, false;
// 120, 1, false;

// e.enum('presence_state', ea.STATE, ['none', 'presence']).withDescription('Presence'),
// e.enum('human_motion_state', ea.STATE, ['none', 'large', 'small', 'breathe']).withDescription('Human Motion state'),
// e.numeric('illuminance_value', ea.STATE).withDescription('Illuminance').withUnit('lux'),
// e.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(28800).withValueStep(1).withUnit('s')
//     .withDescription('Presence keep time'),
// e.numeric('motion_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.01).withUnit('m')
//     .withDescription('Motion detection distance'),
// e.numeric('motion_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
//     .withDescription('Motion detection sensitivity'),
// e.numeric('small_motion_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(6).withValueStep(0.01).withUnit('m')
//     .withDescription('Small motion detection distance'),
// e.numeric('small_motion_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
//     .withDescription('Small motion detection sensitivity'),
// e.numeric('static_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(6).withValueStep(0.01).withUnit('m')
//     .withDescription('Static detection distance'),
// e.numeric('static_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
//     .withDescription('Static detection sensitivity'),
// e.numeric('motion_false_detection', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1).withUnit('x')
//     .withDescription('Motion false detection'),
// //e.enum('working_mode', ea.STATE_SET, ['off', 'arm', 'alarm']).withDescription('Alarm mode'),
// //e.enum('alarm_volume', ea.STATE_SET, ['mute', 'low', 'medium', 'high']).withDescription('Alarm volume'),
// //e.numeric('alarm_time', ea.STATE_SET).withValueMin(1).withValueMax(60).withValueStep(1).withUnit('m').withDescription('Alarm time'),
// e.binary('indicator', ea.STATE_SET, 'ON', 'OFF').withDescription('LED Indicator'),
// e.binary('breathe_false_detection', ea.STATE_SET, 'ON', 'OFF').withDescription('Breathe False Detection'),

// //[1, 'presence_state', tuya.valueConverterBasic.lookup({'none': tuya.enum(0), 'presence': tuya.enum(1)})],
// [1, 'presence', tuya.valueConverter.trueFalse1],
// [2, 'motion_detection_sensitivity', tuya.valueConverter.raw],
// [3, 'mov_minimum_distance', tuya.valueConverter.raw],
// [4, 'motion_detection_distance', tuya.valueConverter.divideBy100],
// [101, 'human_motion_state', tuya.valueConverterBasic.lookup({'none': tuya.enum(0), 'large': tuya.enum(1), 'small': tuya.enum(2), 'breathe': tuya.enum(3)})],
// [102, 'fading_time', tuya.valueConverter.raw],
// [103, 'motion_false_detection', tuya.valueConverter.raw],
// [104, 'small_motion_detection_distance', tuya.valueConverter.divideBy100],
// [105, 'small_motion_detection_sensitivity', tuya.valueConverter.raw],
// [106, 'illuminance_value', tuya.valueConverter.raw],
// [107, 'indicator', tuya.valueConverter.onOff],
// [108, 'static_detection_distance', tuya.valueConverter.divideBy100],
// [109, 'static_detection_sensitivity', tuya.valueConverter.raw],
// [110, 'micro_minimum_distance', tuya.valueConverter.raw],
// [111, 'motionless_minimum_distance', tuya.valueConverter.raw],
// [112, 'reset_setting', tuya.valueConverter.raw],
// [113, 'breathe_false_detection', tuya.valueConverter.raw],
// [114, 'time', tuya.valueConverter.raw],
// [115, 'alarm_time', tuya.valueConverter.raw],
// [116, 'alarm_volume', tuya.valueConverterBasic.lookup({'low': tuya.enum(0), 'medium': tuya.enum(1), 'high': tuya.enum(2), 'mute': tuya.enum(3)})],
// [117, 'working_mode', tuya.valueConverterBasic.lookup({'arm': tuya.enum(0), 'off': tuya.enum(1), 'alarm': tuya.enum(2),  'doorbell': tuya.enum(3)})],
// [118, 'auto1', tuya.valueConverter.raw],
// [119, 'auto2', tuya.valueConverter.raw],
// [120, 'auto3', tuya.valueConverter.raw],

// (cluster: 1280)
//  zigbee-clusters:cluster ep: 1, cl: iasZone (1280) unknown command received: ZCLStandardHeader {
//   frameControl: Bitmap [ clusterSpecific, directionToClient ],
//   trxSequenceNumber: 57,
//   cmdId: 0,
//   data: <Buffer 01 00 00 ff 00 00>
// } {} +1ms
//   zigbee-clusters:endpoint ep: 1, cl: iasZone (1280), error while handling frame unknown_command_received {
//   meta: {},
//   frame: ZCLStandardHeader {
//     frameControl: Bitmap [ clusterSpecific, directionToClient ],
//     trxSequenceNumber: 57,
//     cmdId: 0,
//     data: <Buffer 01 00 00 ff 00 00>
//   }
// }

const setDeviceDatapoints = (fingerprint) => {
  switch (fingerprint) {
    case "_TZE200_2aaelwxk":
      return {
        presence: 1, // [0/1]
        motion_detection_sensitivity: 2, // [0-10, 1, x]
        mov_minimum_distance: 3, //
        motion_detection_distance: 4, // [0-10, 0.01, m]
        human_motion_state: 101, // [enum(0,1,2,3) none, large, small, breathe]
        fading_time: 102, // [0-28800, 1, s]
        motion_false_detection: 103, // [0-10, 1, x]
        small_motion_detection_distance: 104, // [0-6, 0.01, m]
        small_motion_detection_sensitivity: 105, // [0-10, 1, x]
        illuminance_value: 106, // (lux)
        indicator: 107, // LED Indicator
        static_detection_distance: 108, // [0-6, 0.01, m]
        static_detection_sensitivity: 109, // [0-10, 1, x]
        micro_minimum_distance: 110,
        motionless_minimum_distance: 111,
        reset_setting: 112,
        breathe_false_detection: 113, // [0/1]
        time: 114,
        alarm_time: 115, // [1-60, 1, m]
        alarm_volume: 116, // [enum(0: low, 1: medium, 2: high, 3: mute)]
        working_mode: 117, // [enum(0: arm, 1: off, 2: alarm, 3: doorbell)]
        auto1: 118,
        auto2: 119,
        auto3: 120,
      };
      break;

    default:
    // return {
    //   tshpsPresenceState: 1,
    //   tshpscSensitivity: 2,
    //   tshpsMinimumRange: 3,
    //   tshpsMaximumRange: 4,
    //   tshpsTargetDistance: 9,
    //   tshpsDetectionDelay: 101,
    //   tshpsFadingTime: 102,
    //   tshpsIlluminanceLux: 104,
    // };
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

// const presenceTypes = {
//   0: "None",
//   1: "Large",
//   2: "Small",
//   3: "Breathe",
// };

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
    this.fingerprint = this.getSetting("zb_manufacturer_name");

    this.dataPoints = setDeviceDatapoints(this.fingerprint);

    this.printNode();

    

    await zclNode.endpoints[1].clusters.basic
      .readAttributes(
        "zclVersion",
        "appVersion",
        "stackVersion",
        "hwVersion",
        "manufacturerName",
        "modelId",
        "powerSource",
        "deviceEnabled",
        "swBuildId"
        // "attributeReportingStatus",
      )
      .catch((err) => {
        this.error("Error when reading device attributes ", err);
      });

    zclNode.endpoints[1].clusters.tuya.on("response", (value) =>
      this.updatePosition(value)
    );

    zclNode.endpoints[1].clusters.tuya.on("reporting", (value) =>
      this.processReporting(value)
    );

    zclNode.endpoints[1].clusters.tuya.on("datapoint", (value) =>
      this.processDatapoint(value)
    );

    // zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME].on(
    //   "attr.measuredValue",
    //   this.onIlluminanceMeasuredAttributeReport.bind(this)
    // );
  }

  processReporting(data) {
    this.log("########### Reporting: ", data);
  }

  processDatapoint(data) {
    this.log("########### Datapoint: ", data);
  }

  async updatePosition(data) {
   this.log("########### UPDATE POSITION: ", data);

    const dp = data.dp;
    const value = getDataValue(data);
    const dataType = data.datatype;

    switch (dp) {
      case this.dataPoints.presence:
        this.log("presence state: ", value);
        this.setCapabilityValue("alarm_motion", Boolean(value));
        break;

      case this.dataPoints.human_motion_state:
        this.log("IAS Zone: ", value);

        switch (value) {
          case 0:
            this.log("None");
            this.setCapabilityValue("alarm_small_presence", false);
            this.setCapabilityValue("alarm_large_presence", false);
            this.setCapabilityValue("alarm_breathe_presence", false);
            break;
          case 1:
            this.log("Large");
            this.setCapabilityValue("alarm_small_presence", false);
            this.setCapabilityValue("alarm_large_presence", true);
            this.setCapabilityValue("alarm_breathe_presence", false);
            break;
          case 2:
            this.log("Small");
            this.setCapabilityValue("alarm_small_presence", true);
            this.setCapabilityValue("alarm_large_presence", false);
            this.setCapabilityValue("alarm_breathe_presence", false);
            break;
          case 3:
            this.log("Breathe");
            this.setCapabilityValue("alarm_small_presence", false);
            this.setCapabilityValue("alarm_large_presence", false);
            this.setCapabilityValue("alarm_breathe_presence", true);
            break;
        }
        break;

      case this.dataPoints.illuminance_value:
        this.onIlluminanceMeasuredAttributeReport(value);
        break;

      // INIT SETTINGS VALUES
      case this.dataPoints.motion_detection_sensitivity:
      case this.dataPoints.mov_minimum_distance:
      case this.dataPoints.motion_detection_distance:
      case this.dataPoints.fading_time:
      case this.dataPoints.motion_false_detection:
      case this.dataPoints.small_motion_detection_distance:
      case this.dataPoints.small_motion_detection_sensitivity:
      case this.dataPoints.indicator:
      case this.dataPoints.static_detection_distance:
      case this.dataPoints.static_detection_sensitivity:
      case this.dataPoints.micro_minimum_distance:
      case this.dataPoints.motionless_minimum_distance:
      case this.dataPoints.breathe_false_detection:
      case this.dataPoints.alarm_time:
      case this.dataPoints.alarm_volume:
      case this.dataPoints.working_mode:
      case this.dataPoints.auto1:
      case this.dataPoints.auto2:
      case this.dataPoints.auto3:
        const settings = this.getSettings();
        const dataPointKey = Object.keys(this.dataPoints).find(
          (key) => this.dataPoints[key] === dp
        );
        this.log("Setting value for key --> ", dataPointKey, " = ", value);
        if (!dataPointKey && !settings[dataPointKey]) {
          this.log("No settings for key --> ", dataPointKey);
        }
        if (dataPointKey && settings[dataPointKey] && this.isFirstInit()) {
          await this.setSettings({
            [dataPointKey]: value,
          });
        }
        break;

      default:
        this.log("Unknown Datapoint -->", "DP: " + dp, "Value: " + value);
    }
  }

  onDeleted() {
    this.log("Radar sensor removed");
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    //
     changedKeys.forEach((updatedSetting) => {
       this.log(
         "########### Updated setting: ",
         updatedSetting,
         " => ",
         newSettings[updatedSetting]
       );
     });

    if (changedKeys.includes("motion_detection_sensitivity")) {
      this.writeData32(
        this.dataPoints.motion_detection_sensitivity,
        newSettings["motion_detection_sensitivity"]
      );
    }

    if (changedKeys.includes("mov_minimum_distance")) {
      this.writeData32(
        this.dataPoints.mov_minimum_distance,
        newSettings["mov_minimum_distance"]
      );
    }

    if (changedKeys.includes("motion_detection_distance")) {
      this.writeData32(
        this.dataPoints.motion_detection_distance,
        newSettings["motion_detection_distance"]
      );
    }

    if (changedKeys.includes("fading_time")) {
      this.writeData32(this.dataPoints.fading_time, newSettings["fading_time"]);
    }

    if (changedKeys.includes("motion_false_detection")) {
      this.writeData32(
        this.dataPoints.motion_false_detection,
        newSettings["motion_false_detection"]
      );
    }

    if (changedKeys.includes("small_motion_detection_distance")) {
      this.writeData32(
        this.dataPoints.small_motion_detection_distance,
        newSettings["small_motion_detection_distance"]
      );
    }

    if (changedKeys.includes("small_motion_detection_sensitivity")) {
      this.writeData32(
        this.dataPoints.small_motion_detection_sensitivity,
        newSettings["small_motion_detection_sensitivity"]
      );
    }

    if (changedKeys.includes("indicator")) {
      this.writeBool(this.dataPoints.indicator, newSettings["indicator"]);
    }

    if (changedKeys.includes("static_detection_distance")) {
      this.writeData32(
        this.dataPoints.static_detection_distance,
        newSettings["static_detection_distance"]
      );
    }

    if (changedKeys.includes("static_detection_sensitivity")) {
      this.writeData32(
        this.dataPoints.static_detection_sensitivity,
        newSettings["static_detection_sensitivity"]
      );
    }

    if (changedKeys.includes("breathe_false_detection")) {
      this.writeBool(
        this.dataPoints.breathe_false_detection,
        newSettings["breathe_false_detection"]
      );
    }

    if (changedKeys.includes("alarm_volume")) {
      this.writeEnum(this.dataPoints.alarm_volume, newSettings["alarm_volume"]);
    }

    if (changedKeys.includes("working_mode")) {
      this.writeEnum(this.dataPoints.working_mode, newSettings["working_mode"]);
    }

    // if (changedKeys.includes("minimum_range")) {
    //   this.writeData32(
    //     this.dataPoints.tshpsMinimumRange,
    //     newSettings["minimum_range"] * 100
    //   );
    // }

    // if (changedKeys.includes("maximum_range")) {
    //   this.writeData32(
    //     this.dataPoints.tshpsMaximumRange,
    //     newSettings["maximum_range"] * 100
    //   );
    // }

    // if (changedKeys.includes("detection_delay")) {
    //   this.writeData32(
    //     this.dataPoints.tshpsDetectionDelay,
    //     newSettings["detection_delay"]
    //   );
    // }
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
    // this.setCapabilityValue("alarm_motion", zoneStatus.alarm1);
    this.setCapabilityValue("alarm_motion", zoneStatus);
  }
}

module.exports = radarSensor;

// {
//   "ids": {
//     "modelId": "TS0225",
//     "manufacturerName": "_TZE200_2aaelwxk"
//   },
//   "endpoints": {
//     "ieeeAddress": "a4:c1:38:2a:a9:fd:ca:4d",
//     "networkAddress": 13130,
//     "modelId": "TS0225",
//     "manufacturerName": "_TZE200_2aaelwxk",
//     "endpointDescriptors": [
//       {
//         "status": "SUCCESS",
//         "nwkAddrOfInterest": 13130,
//         "_reserved": 34,
//         "endpointId": 1,
//         "applicationProfileId": 260,
//         "applicationDeviceId": 1026,
//         "applicationDeviceVersion": 0,
//         "_reserved1": 1,
//         "inputClusters": [
//           0,
//           3,
//           1280,
//           57346,
//           61184,
//           60928,
//           57344,
//           1024
//         ],
//         "outputClusters": [
//           3,
//           57346,
//           61184,
//           60928,
//           57344
//         ]
//       },
//       {
//         "status": "SUCCESS",
//         "nwkAddrOfInterest": 13130,
//         "_reserved": 10,
//         "endpointId": 242,
//         "applicationProfileId": 41440,
//         "applicationDeviceId": 97,
//         "applicationDeviceVersion": 0,
//         "_reserved1": 0,
//         "inputClusters": [],
//         "outputClusters": [
//           33
//         ]
//       }
//     ],
//     "deviceType": "router",
//     "receiveWhenIdle": true,
//     "swBuildId": "0122052017",
//     "capabilities": {
//       "alternatePANCoordinator": false,
//       "deviceType": true,
//       "powerSourceMains": true,
//       "receiveWhenIdle": true,
//       "security": false,
//       "allocateAddress": true
//     },
//     "extendedEndpointDescriptors": {
//       "1": {
//         "clusters": {
//           "basic": {
//             "attributes": [
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 0,
//                 "name": "zclVersion"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 1,
//                 "name": "appVersion"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 2,
//                 "name": "stackVersion"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 3,
//                 "name": "hwVersion"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 4,
//                 "name": "manufacturerName"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 5,
//                 "name": "modelId"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 7,
//                 "name": "powerSource"
//               },
//               {
//                 "acl": [
//                   "readable",
//                   "writable"
//                 ],
//                 "id": 18,
//                 "name": "deviceEnabled"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 16384,
//                 "name": "swBuildId"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 65533,
//                 "name": "clusterRevision"
//               }
//             ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//           },
//           "identify": {
//             "attributes": [
//               {
//                 "acl": [
//                   "readable",
//                   "writable"
//                 ],
//                 "id": 0,
//                 "name": "identifyTime",
//                 "value": 0
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 65533,
//                 "name": "clusterRevision",
//                 "value": 1
//               }
//             ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//           },
//           "iasZone": {
//             "attributes": [
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 0,
//                 "name": "zoneState",
//                 "value": "notEnrolled"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 1,
//                 "name": "zoneType",
//                 "value": "motionSensor"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 2,
//                 "name": "zoneStatus",
//                 "value": {
//                   "type": "Buffer",
//                   "data": [
//                     0,
//                     0
//                   ]
//                 }
//               },
//               {
//                 "acl": [
//                   "readable",
//                   "writable"
//                 ],
//                 "id": 16,
//                 "name": "iasCIEAddress",
//                 "value": "5c:c7:c1:ff:fe:9b:78:80"
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 17,
//                 "name": "zoneId",
//                 "value": 6
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 65533,
//                 "name": "clusterRevision",
//                 "value": 1
//               }
//             ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//           },
//           "illuminanceMeasurement": {
//             "attributes": [
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 0,
//                 "name": "measuredValue",
//                 "value": 1000
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 1,
//                 "name": "minMeasuredValue",
//                 "value": 0
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 2,
//                 "name": "maxMeasuredValue",
//                 "value": 4000
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 65533,
//                 "name": "clusterRevision",
//                 "value": 1
//               }
//             ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//           }
//         },
//         "bindings": {
//           "identify": {
//             "attributes": [
//               {
//                 "acl": [
//                   "readable",
//                   "writable"
//                 ],
//                 "id": 0,
//                 "name": "identifyTime",
//                 "value": 0
//               },
//               {
//                 "acl": [
//                   "readable"
//                 ],
//                 "id": 65533,
//                 "name": "clusterRevision",
//                 "value": 1
//               }
//             ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//           }
//         }
//       },
//       "242": {
//         "clusters": {},
//         "bindings": {}
//       }
//     }
//   }
// }