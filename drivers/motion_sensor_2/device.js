'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

class motion_sensor_2 extends ZigBeeDevice {

	async onNodeInit({ zclNode }) {

		this.printNode();

		if (this.isFirstInit()){
			await this.configureAttributeReporting([
				{
					endpointId: 1,
					cluster: CLUSTER.IAS_ZONE,
					attributeName: 'zoneStatus',
					minInterval: 65535,
					maxInterval: 0,
					minChange: 0,
				},{
					endpointId: 1,
					cluster: CLUSTER.POWER_CONFIGURATION,
					attributeName: 'batteryPercentageRemaining',
					minInterval: 65535,
					maxInterval: 0,
					minChange: 0,
				},{
					endpointId: 1,
					cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
					attributeName: 'IlluminanceMeasured',
					minInterval: 65535,
					maxInterval: 0,
					minChange: 0,
				}
			]);
		}

		// alarm_motion
		zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
		.on('attr.zoneStatus', this.onZoneStatusAttributeReport.bind(this));

		// measure_battery // alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
		.on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
		
		// measure_illuminance
		zclNode.endpoints[1].clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
		.on('attr.IlluminanceMeasured', this.onIlluminanceMeasuredAttributeReport.bind(this));

		// Tuya specific cluster info
		zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));

	}

	onZoneStatusAttributeReport(status) {
		this.log("Motion status: ", status.alarm1);
		this.setCapabilityValue('alarm_motion', status.alarm1).catch(this.error);
	}

	onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;
		this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
		this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2).catch(this.error);
		this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false).catch(this.error);
	}
	
	onIlluminanceMeasuredAttributeReport(measuredValue) {
    	this.log('measure_luminance | Luminance - measuredValue (lux):', measuredValue);
	    this.setCapabilityValue('measure_luminance', measuredValue);
  	}

	processResponse(data) {
		this.log(data);
	}
  		
	onDeleted(){
		this.log("Motion Sensor removed")
	}

}

module.exports = motion_sensor_2;


/* "ids": {
	"modelId": "TS0601",
	"manufacturerName": "_TZE200_3towulqd"
  },
  "endpoints": {
	"endpointDescriptors": [
	  {
		"endpointId": 1,
		"applicationProfileId": 260,
		"applicationDeviceId": 1026,
		"applicationDeviceVersion": 0,
		"_reserved1": 1,
		"inputClusters": [
		  0,
		  3,
		  1280,
		  57346,
		  61184,
		  60928,
		  57344,
		  1,
		  1024
		],
		"outputClusters": []
	  }
	],
	"endpoints": {
	  "1": {
		"clusters": {
		  "basic": {
			"attributes": [
			  {
				"acl": [
				  "readable"
				],
				"id": 0,
				"name": "zclVersion"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 1,
				"name": "appVersion"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 2,
				"name": "stackVersion"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 3,
				"name": "hwVersion"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 4,
				"name": "manufacturerName"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 5,
				"name": "modelId"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 7,
				"name": "powerSource"
			  },
			  {
				"acl": [
				  "readable",
				  "writable"
				],
				"id": 18,
				"name": "deviceEnabled"
			  },
			  {
				"acl": [
				"readable"
				],
				"id": 16384,
				"name": "swBuildId"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 65533,
				"name": "clusterRevision"
			  }
			],
			"commandsGenerated": "UNSUP_GENERAL_COMMAND",
			"commandsReceived": "UNSUP_GENERAL_COMMAND"
		  },
		  "identify": {
			"attributes": [
			  {
				"acl": [
				  "readable",
				  "writable"
				],
				"id": 0
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 65533,
				"name": "clusterRevision",
				"value": 1
			  }
			],
			"commandsGenerated": "UNSUP_GENERAL_COMMAND",
			"commandsReceived": "UNSUP_GENERAL_COMMAND"
		  },
		  "iasZone": {
			"attributes": [
			  {
				"acl": [
				  "readable"
				],
				"id": 0,
				"name": "zoneState",
				"value": "notEnrolled"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 1,
				"name": "zoneType",
				"value": "motionSensor"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 2,
				"name": "zoneStatus",
				"value": {
				  "type": "Buffer",
				  "data": [
					0,
					0
				  ]
				}
			  },
			  {
				"acl": [
				  "readable",
				  "writable"
				],
				"id": 16,
				"name": "iasCIEAddress",
				"value": "00:12:4b:00:04:f8:9c:84"
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 17,
				"name": "zoneId",
				"value": 0
			  },
			  {
				"acl": [
				  "readable"
				],
				"id": 65533,
				"name": "clusterRevision",
				"value": 1
			  }
			],
			"commandsGenerated": "UNSUP_GENERAL_COMMAND",
			"commandsReceived": "UNSUP_GENERAL_COMMAND"
		  },
		  "powerConfiguration": {
		  "attributes": [
			{
			  "acl": [
				"readable"
			  ],
			  "id": 0
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 32,
			  "name": "batteryVoltage",
			  "value": 33
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 33,
			  "name": "batteryPercentageRemaining",
			  "value": 200
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 65533,
			  "name": "clusterRevision",
			  "value": 1
			}
		  ],
		  "commandsGenerated": "UNSUP_GENERAL_COMMAND",
		  "commandsReceived": "UNSUP_GENERAL_COMMAND"
		},
		"illuminanceMeasurement": {
		  "attributes": [
			{
			  "acl": [
				"readable"
			  ],
			  "id": 0,
			  "name": "measuredValue",
			  "value": 1000
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 1,
			  "name": "minMeasuredValue",
			  "value": 0
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 2,
			  "name": "maxMeasuredValue",
			  "value": 4000
			},
			{
			  "acl": [
				"readable"
			  ],
			  "id": 65533,
			  "name": "clusterRevision",
			  "value": 1
			}
		  ],
		  "commandsGenerated": "UNSUP_GENERAL_COMMAND",
		  "commandsReceived": "UNSUP_GENERAL_COMMAND"
		}
	  },
	  "bindings": {}
	}
  }
} */