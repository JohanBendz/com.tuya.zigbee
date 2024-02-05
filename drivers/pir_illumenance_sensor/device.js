'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class pir_illumenance_sensor extends ZigBeeDevice {

	async onNodeInit({ zclNode }) {

		this.printNode();

		// alarm_motion
		zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
			this.onIASZoneStatusChangeNotification(payload);
		}
		// measure_luminance
		zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
			.on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));
	}

	onIlluminanceMeasuredAttributeReport(measuredValue) {
		const parsedValue = Math.pow (10,((measuredValue - 1) / 10000));
		this.log('measure_luminance | Luminance - measuredValue (lux):', parsedValue);
		this.setCapabilityValue('measure_luminance', parsedValue).catch(this.error);
	}

	onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay, }) {
		this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
		this.setCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this.error);
		this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
	}

	onDeleted(){
		this.log("PIR illumenance Sensor removed")
	}

}

module.exports = pir_illumenance_sensor;

//{
//	"ids": {
//		"modelId": "TS0601",
//			"manufacturerName": "_TZE200_3towulqd"
//	},
//	"endpoints": {
//		"ieeeAddress": "a4:c1:38:5e:ab:6e:a8:db",
//			"networkAddress": 10175,
//				"modelId": "TS0601",
//					"manufacturerName": "_TZE200_3towulqd",
//						"endpointDescriptors": [
//							{
//								"status": "SUCCESS",
//								"nwkAddrOfInterest": 10175,
//								"_reserved": 26,
//								"endpointId": 1,
//								"applicationProfileId": 260,
//								"applicationDeviceId": 1026,
//								"applicationDeviceVersion": 0,
//								"_reserved1": 1,
//								"inputClusters": [
//									0,
//									3,
//									1280,
//									57346,
//									61184,
//									60928,
//									57344,
//									1,
//									1024
//								],
//								"outputClusters": []
//							}
//						],
//							"deviceType": "enddevice",
//								"receiveWhenIdle": false,
//									"swBuildId": "0122052017",
//										"capabilities": {
//			"alternatePANCoordinator": false,
//				"deviceType": false,
//					"powerSourceMains": false,
//						"receiveWhenIdle": false,
//							"security": false,
//								"allocateAddress": true
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
//							"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//								"commandsReceived": "UNSUP_GENERAL_COMMAND"
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
//							"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//								"commandsReceived": "UNSUP_GENERAL_COMMAND"
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
//								"value": "5c:c7:c1:ff:fe:5b:ce:ab"
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 17,
//								"name": "zoneId",
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
//							"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//								"commandsReceived": "UNSUP_GENERAL_COMMAND"
//					},
//					"powerConfiguration": {
//						"attributes": [
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 0
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 32,
//								"name": "batteryVoltage",
//								"value": 33
//							},
//							{
//								"acl": [
//									"readable"
//								],
//								"id": 33,
//								"name": "batteryPercentageRemaining",
//								"value": 200
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
//							"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//								"commandsReceived": "UNSUP_GENERAL_COMMAND"
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
//							"commandsGenerated": "UNSUP_GENERAL_COMMAND",
//								"commandsReceived": "UNSUP_GENERAL_COMMAND"
//					}
//				},
//				"bindings": { }
//			}
//		}
//	}
//}

