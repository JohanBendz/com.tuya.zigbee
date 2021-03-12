'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class zigbeerepeater extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.printNode();

  }

	onDeleted(){
		this.log("Zigbee Repeater removed")
	}

}

module.exports = zigbeerepeater;



/* "ids": {
  "modelId": "TS0207",
  "manufacturerName": "_TZ3000_m0vaazab"
},
"endpoints": {
  "endpointDescriptors": [
    {
      "endpointId": 1,
      "applicationProfileId": 260,
      "applicationDeviceId": 8,
      "applicationDeviceVersion": 0,
      "_reserved1": 0,
      "inputClusters": [
        0,
        10,
        3
      ],
      "outputClusters": [
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
              "value": 64
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
              "value": "_TZ3000_m0vaazab"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 5,
              "name": "modelId",
              "value": "TS0207"
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
              "value": "mains"
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
              "value": 1
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
              "id": 65504
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65505
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
          ],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "time": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 7
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
                "reportable"
              ],
              "id": 0
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 1
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
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        }
      },
      "bindings": {
        "ota": {
          "attributes": [],
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        }
      }
    }
  }
} */