'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class waterdetector extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.printNode();

		// alarm_contact
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
      this.onIASZoneStatusChangeNotification(payload);
    }

  }
  
  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_contact', zoneStatus.alarm1).catch(this.error);
    this.setCapabilityValue('alarm_water', zoneStatus.alarm1).catch(this.error);
    this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
  }

	onDeleted(){
		this.log("Water Detector removed")
	}

}

module.exports = waterdetector;



/* "ids": {
  "modelId": "TS0207",
  "manufacturerName": "_TYZB01_sqmd19i1"
},
"endpoints": {
  "endpointDescriptors": [
    {
      "endpointId": 1,
      "applicationProfileId": 260,
      "applicationDeviceId": 1026,
      "applicationDeviceVersion": 0,
      "_reserved1": 0,
      "inputClusters": [
        0,
        1,
        3,
        1280,
        61185
      ],
      "outputClusters": [
        3,
        25
      ]
    }
  ],
  "endpoints": {
    "1": {
      "clusters": {
        "basic": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "zclVersion"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 1,
              "name": "appVersion"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2,
              "name": "stackVersion"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 3,
              "name": "hwVersion"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 4,
              "name": "manufacturerName"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 5,
              "name": "modelId"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 6,
              "name": "dateCode"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 7,
              "name": "powerSource"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision"
            }
          ],
          "commandsGenerated": [],
          "commandsReceived": [
            "factoryReset"
          ]
        },
        "powerConfiguration": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 32,
              "name": "batteryVoltage",
              "value": 30
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 33,
              "name": "batteryPercentageRemaining",
              "value": 200
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 1
            }
          ],
          "commandsGenerated": [],
          "commandsReceived": []
        },
        "identify": {
          "attributes": [
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 0
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 1
            }
          ],
          "commandsGenerated": [
            0
          ],
          "commandsReceived": [
            0,
            1
          ]
        },
        "iasZone": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "zoneState",
              "value": "notEnrolled"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 1,
              "name": "zoneType",
              "value": "waterSensor"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2,
              "name": "zoneStatus",
              "value": {
                "type": "Buffer",
                "data": [
                  1,
                  0
                ]
              }
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 16,
              "name": "iasCIEAddress",
              "value": "00:00:00:00:00:00:00:00"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 17,
              "name": "zoneId",
              "value": 255
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 1
            }
          ],
          "commandsGenerated": [
            "zoneStatusChangeNotification",
            1
          ],
          "commandsReceived": [
            "zoneStatusChangeNotification"
          ]
        }
      },
      "bindings": {
        "identify": {
          "attributes": [
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 0
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 1
            }
          ],
          "commandsGenerated": [
            0
          ],
          "commandsReceived": [
            0,
            1
          ]
        },
        "ota": {
          "attributes": [],
          "commandsGenerated": [],
          "commandsReceived": []
        }
      }
    }
  }
} */