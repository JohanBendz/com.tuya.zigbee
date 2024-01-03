'use strict';

const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const {getDataValue} = require("./helpers");
const { Cluster} = require('zigbee-clusters');



Cluster.addCluster(TuyaSpecificCluster);
/* {"1":"Temperature","2":"Humidity","4":"Battery level","9":"Unit convert","10":"Set maxtemp","11":"Set minitemp","12":"Set maxhum","13":"Set minihum","14":"Temp alarm","15":"Humidity alarm","17":"Temperature report","18":"Humidity report","19":"Temp sensitivity","20":"Humidity sensitivity"} */
const dataPoints = {
  currentTemperature: 1,
  currentHumidity: 2,
  batteryLevel: 4,
  unit_convert: 9,
  maxtemp: 10,
  mintemp: 11,
  maxhum: 12,
  minhum: 13,
  tempalarm: 14,
  humalarm: 15,
  tempreport: 17,
  humreport: 18,
  tempsens: 19,
  humsens:20
}

class lcdThSensor extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
	this.enableDebug();

	this.registerCapabilityListener("measure_temperature", async (currentTemperature) => {
		this.log('current temperature received', currentTemperature)
	})
	this.registerCapabilityListener("measure_humidity", async (currentHumidity) => {
		this.log('current humidity received', currentHumidity)
	})
	this.registerCapabilityListener("measure_battery", async (batteryLevel) => {
		this.log('current battery level received', batteryLevel)
	})

	zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));
	zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));

	await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
	.catch(err => {
		this.error('Error when reading device attributes ', err);
	});
  }


  async processResponse(data) {
    const dp = data.dp;
    const measuredValue = getDataValue(data);

    let parsedValue = 0;

    switch (dp) {
      case dataPoints.batteryLevel:
        parsedValue = measuredValue;
        this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", parsedValue);

		try {
			this.setCapabilityValue('measure_battery', parsedValue);
		} catch (e) {
			this.log("Failed to set battery level", e);
		}
        break;

      case dataPoints.currentHumidity:
        parsedValue = measuredValue;
        this.log('measure_humidity | relativeHumidity - measuredValue (humidity):', parsedValue);

		try {
			this.setCapabilityValue('measure_humidity', parsedValue);
		} catch (e) {
			this.log("Failed to set current humidity", e);
		}
        break;

      case dataPoints.currentTemperature:
        parsedValue = measuredValue/10;
		this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature):', parsedValue);

		try {
			this.setCapabilityValue('measure_temperature', parsedValue);
		} catch (e) {
			this.log("Failed to set current temperature", e);
		}
        break;
    }
  }

  onDeleted() {
    this.log("LCD T&H sensor removed")
  }
  async onSettings({newSettings, changedKeys}) {
    if (changedKeys.includes('temperature_sensitivity')) {
		this.writeData32(dataPoints.tempsens, newSettings['temperature_sensitivity'])
	}
    if (changedKeys.includes('temp_periodic_report')) {
		this.writeData32(dataPoints.tempreport, newSettings['temp_periodic_report'])
	}
    if (changedKeys.includes('humidity_sensitivity')) {
		this.writeData32(dataPoints.humsens, newSettings['humidity_sensitivity'])
	}
    if (changedKeys.includes('hum_periodic_report')) {
		this.writeData32(dataPoints.humreport, newSettings['hum_periodic_report'])
	}
    if (changedKeys.includes('temp_unit_convert')) {
		this.writeData32(dataPoints.unit_convert, newSettings['temp_unit_convert'])
	}
  }
}

module.exports = lcdThSensor;

/*
{
	"ids": {
		"modelId": "TS0601",
		"manufacturerName": "_TZE200_locansqn"
	},
	"endpoints": {
		"ieeeAddress": "a4:c1:38:70:91:12:fd:3a",
		"networkAddress": 27549,
		"modelId": "TS0601",
		"manufacturerName": "_TZE200_locansqn",
		"endpointDescriptors": [
			{
				"status": "SUCCESS",
				"nwkAddrOfInterest": 27549,
				"_reserved": 20,
				"endpointId": 1,
				"applicationProfileId": 260,
				"applicationDeviceId": 81,
				"applicationDeviceVersion": 0,
				"_reserved1": 1,
				"inputClusters": [
					4,
					5,
					61184,
					0
				],
				"outputClusters": [
					25,
					10
				]
			}
		],
		"deviceType": "enddevice",
		"receiveWhenIdle": false,
		"capabilities": {
			"alternatePANCoordinator": false,
			"deviceType": false,
			"powerSourceMains": false,
			"receiveWhenIdle": false,
			"security": false,
			"allocateAddress": true
		},
		"extendedEndpointDescriptors": {
			"1": {
				"clusters": {
					"groups": {
						"attributes": [
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 0,
								"name": "nameSupport",
								"value": {
									"type": "Buffer",
									"data": [
										0
									]
								},
								"reportingConfiguration": {
									"status": "NOT_FOUND",
									"direction": "reported"
								}
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 2,
								"reportingConfiguration": {
									"status": "NOT_FOUND",
									"direction": "reported"
								}
							}
						]
					},
					"scenes": {
						"attributes": [
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 0,
								"reportingConfiguration": {
									"status": "NOT_FOUND",
									"direction": "reported"
								}
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 1,
								"reportingConfiguration": {
									"status": "NOT_FOUND",
									"direction": "reported"
								}
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 2,
								"reportingConfiguration": {
									"status": "NOT_FOUND",
									"direction": "reported"
								}
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 3,
								"reportingConfiguration": {
									"status": "NOT_FOUND",
									"direction": "reported"
								}
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 4,
								"reportingConfiguration": {
									"status": "NOT_FOUND",
									"direction": "reported"
								}
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 2,
								"reportingConfiguration": {
									"status": "NOT_FOUND",
									"direction": "reported"
								}
							}
						]
					},
					"basic": {
						"attributes": [
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 0,
								"name": "zclVersion",
								"value": 3
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 1,
								"name": "appVersion",
								"value": 72
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 2,
								"name": "stackVersion",
								"value": 0
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 3,
								"name": "hwVersion",
								"value": 1
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 4,
								"name": "manufacturerName",
								"value": "_TZE200_locansqn"
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 5,
								"name": "modelId",
								"value": "TS0601"
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 6,
								"name": "dateCode",
								"value": ""
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 7,
								"name": "powerSource",
								"value": "battery"
							},
							{
								"acl": [
									"readable",
									"writable",
									"reportable"
								],
								"id": 65502
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 2
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 65534,
								"name": "attributeReportingStatus",
								"value": "PENDING"
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 65506
							},
							{
								"acl": [
									"readable",
									"reportable"
								],
								"id": 65507
							}
						]
					}
				},
				"bindings": {
					"ota": {},
					"time": {
						"attributes": [
							{
								"acl": [
									"readable"
								],
								"id": 65533,
								"name": "clusterRevision",
								"value": 1
							}
						]
					}
				}
			}
		}
	}
}
 */
