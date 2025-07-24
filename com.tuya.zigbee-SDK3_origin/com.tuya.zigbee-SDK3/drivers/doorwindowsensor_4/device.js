'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class doorwindowsensor_4 extends ZigBeeDevice {

	async onNodeInit({zclNode}) {

		this.printNode();

    if (this.isFirstInit()){
			await this.configureAttributeReporting([
				{
					endpointId: 1,
					cluster: CLUSTER.POWER_CONFIGURATION,
					attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 1, // Report changes greater than 1%
				}
			]);
		}

		// alarm_contact
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
      this.onIASZoneStatusChangeNotification(payload);
    }

    // measure_battery // alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
		.on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));
    }


  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received for DS01:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_contact', zoneStatus.alarm1).catch(this.error);
    this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;
		this.log("DS01 measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
		this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2).catch(this.error);
		this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false).catch(this.error);
  }



	onDeleted(){
		this.log("Door/Window Sensor removed")
	}

}

module.exports = doorwindowsensor_4;



/*
"ids": {
    "modelId": "DS01",
    "manufacturerName": "zbeacon"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:64:e7:0a:8e:5f",
    "networkAddress": 33312,
    "modelId": "DS01",
    "manufacturerName": "zbeacon",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 33312,
        "_reserved": 20,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 1026,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [
          0,
          3,
          1,
          1280,
          32
        ],
        "outputClusters": [
          25
        ]
      }
    ],
    "deviceType": "enddevice",
    "receiveWhenIdle": false,
    "swBuildId": "0122052017",
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": false,
      "powerSourceMains": false,
      "receiveWhenIdle": false,
      "security": false,
      "allocateAddress": true
    },
    "pollControl": {
      "checkInInterval": 14400,
      "longPollInterval": 14400,
      "shortPollInterval": 1,
      "checkInIntervalMin": 0,
      "longPollIntervalMin": 0,
      "shortPollWritten": true,
      "longPollWritten": true
    },
    "extendedEndpointDescriptors": {
      "1": {
        "clusters": {
          "basic": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 0,
                "name": "zclVersion",
                "value": 3
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 1,
                "name": "appVersion",
                "value": 113
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2,
                "name": "stackVersion",
                "value": 2
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 3,
                "name": "hwVersion",
                "value": 0
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 4,
                "name": "manufacturerName",
                "value": "zbeacon"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "DS01"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 7,
                "name": "powerSource",
                "value": "battery"
              },
              {
                "acl": [
                  "readable",
                  "writable"
                ],
                "id": 18,
                "name": "deviceEnabled",
                "value": true
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 16384,
                "name": "swBuildId",
                "value": "0122052017"
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
            "commandsGenerated": "UNSUP_GENERAL_COMMAND"
          },
          "identify": {},
          "powerConfiguration": {},
          "iasZone": {},
          "pollControl": {}
        },
        "bindings": {
          "ota": {}
        }
      }
    }
  }
  */