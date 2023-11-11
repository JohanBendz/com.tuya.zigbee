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
  tshpsIlluminanceLux: 106,
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

class radarSensorCeiling extends TuyaSpecificClusterDevice {
  async onNodeInit({zclNode}) {

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
      case dataPoints.tshpsIlluminanceLux:
        this.log("lux value: "+ value)
        this.onIlluminanceMeasuredAttributeReport(value/10)
        break;
      case dataPoints.tshpsTargetDistance:
        if (new Date().getSeconds() % 10 === 0) {
          this.setCapabilityValue('target_distance', value/100);
        }

        break;

      default:
        this.log('Unhandled dp value:', dp, value)
    }
  }

  onDeleted() {
    this.log("Radar sensor removed")
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

    if (changedKeys.includes('detection_delay')) {
      this.writeData32(dataPoints.tshpsDetectionDelay, newSettings['detection_delay'])
    }

    if (changedKeys.includes('fading_time')) {
      this.writeData32(dataPoints.tshpsFadingTime, newSettings['fading_time'])
    }
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    this.log('measure_luminance | Luminance - measuredValue (lux):', measuredValue);
    this.setCapabilityValue('measure_luminance', measuredValue);
  }

  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_motion', zoneStatus.alarm1);
  }

}

module.exports = radarSensorCeiling;
//{
//	"ids": {
//		"modelId": "TS0225",
//		"manufacturerName": "_TZE200_2aaelwxk"
//	},
//	"endpoints": {
//		"ieeeAddress": "a4:c1:38:1a:95:ba:db:cf",
//		"networkAddress": 46965,
//		"modelId": "TS0225",
//		"manufacturerName": "_TZE200_2aaelwxk",
//		"endpointDescriptors": [
//			{
//				"status": "SUCCESS",
//				"nwkAddrOfInterest": 46965,
//				"_reserved": 34,
//				"endpointId": 1,
//				"applicationProfileId": 260,
//				"applicationDeviceId": 1026,
//				"applicationDeviceVersion": 0,
//				"_reserved1": 1,
//				"inputClusters": [
//					0,
//					3,
//					1280,
//					57346,
//					61184,
//					60928,
//					57344,
//					1024
//				],
//				"outputClusters": [
//					3,
//					57346,
//					61184,
//					60928,
//					57344
//				]
//			},
//			{
//				"status": "SUCCESS",
//				"nwkAddrOfInterest": 46965,
//				"_reserved": 10,
//				"endpointId": 242,
//				"applicationProfileId": 41440,
//				"applicationDeviceId": 97,
//				"applicationDeviceVersion": 0,
//				"_reserved1": 0,
//				"inputClusters": [],
//				"outputClusters": [
//					33
//				]
//			}
//		],
//		"deviceType": "router",
//		"receiveWhenIdle": true,
//		"swBuildId": "0122052017",
//		"capabilities": {
//			"alternatePANCoordinator": false,
//			"deviceType": true,
//			"powerSourceMains": true,
//			"receiveWhenIdle": true,
//			"security": false,
//			"allocateAddress": true
//		},
//		"extendedEndpointDescriptors": {
//			"1": {
//				"clusters": {
//					"basic": {
//						"attributes": [
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 0,
//								"name": "zclVersion"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 1,
//								"name": "appVersion"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 2,
//								"name": "stackVersion"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 3,
//								"name": "hwVersion"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 4,
//								"name": "manufacturerName"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 5,
//								"name": "modelId"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 7,
//								"name": "powerSource"
//							},
//							{
//								"acl": [
//									"readable",
//									"writable"
//								],
//								"id": 18,
//								"name": "deviceEnabled"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 16384,
//								"name": "swBuildId"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 65533,
//								"name": "clusterRevision"
//							}
//						],
//						"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//						"commandsReceived": "UNSUP_GENERAL_COMMAND"
//					},
//					"identify": {
//						"attributes": [
//							{
//								"acl": [
//									"readable",
//									"writable"
//								],
//								"id": 0,
//								"name": "identifyTime",
//								"value": 0
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 65533,
//								"name": "clusterRevision",
//								"value": 1
//							}
//						],
//						"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//						"commandsReceived": "UNSUP_GENERAL_COMMAND"
//					},
//					"iasZone": {
//						"attributes": [
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 0,
//								"name": "zoneState",
//								"value": "notEnrolled"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 1,
//								"name": "zoneType",
//								"value": "motionSensor"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 2,
//								"name": "zoneStatus",
//								"value": {
//									"type": "Buffer",
//									"data": [
//										0,
//										0
//									]
//								}
//							},
//							{
//								"acl": [
//									"readable",
//									"writable"
//								],
//								"id": 16,
//								"name": "iasCIEAddress",
//								"value": "5c:c7:c1:ff:fe:9b:69:09"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 17,
//								"name": "zoneId",
//								"value": 6
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 65533,
//								"name": "clusterRevision",
//								"value": 1
//							}
//						],
//						"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//						"commandsReceived": "UNSUP_GENERAL_COMMAND"
//					},
//					"illuminanceMeasurement": {
//						"attributes": [
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 0,
//								"name": "measuredValue",
//								"value": 1000
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 1,
//								"name": "minMeasuredValue",
//								"value": 0
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 2,
//								"name": "maxMeasuredValue",
//								"value": 4000
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 65533,
//								"name": "clusterRevision",
//								"value": 1
//							}
//						],
//						"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//						"commandsReceived": "UNSUP_GENERAL_COMMAND"
//					}
//				},
//				"bindings": {
//					"identify": {
//						"attributes": [
//							{
//								"acl": [
//									"readable",
//									"writable"
//								],
//								"id": 0,
//								"name": "identifyTime",
//								"value": 0
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 65533,
//								"name": "clusterRevision",
//								"value": 1
//							}
//						],
//						"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//						"commandsReceived": "UNSUP_GENERAL_COMMAND"
//					}
//				}
//			},
//			"242": {
//				"clusters": {},
//				"bindings": {}
//			}
//		}
//	}
//}