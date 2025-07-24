'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
// const { CLUSTER } = require('zigbee-clusters');

class handheld_remote_4_buttons extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

      this.printNode();

      const node = await this.homey.zigbee.getNode(this);
      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (clusterId === 6) {
           this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
           this.log("Frame JSON data:", frame.toJSON());
           frame = frame.toJSON();
           this.buttonCommandParser(endpointId, frame);
        }
      };

      this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('handheld_remote_4_buttons')
      .registerRunListener(async (args, state) => {
        return (null, args.button === state.button && args.action === state.action);
      });
    
    }

    buttonCommandParser(ep, frame) {
      var button = ep === 1 ? 'button1' : ep === 2 ? 'button2' : ep === 3 ? 'button3' : ep === 4 ? 'button4' : 'invalid';
      var action = frame.data[3] === 0 ? 'single' : frame.data[3] === 1 ? 'double' : frame.data[3] === 2 ? 'long' : 'invalid';
      return this._buttonPressedTriggerDevice.trigger(this, {}, { button: `${button}`, action: `${action}` })
      .then(() => this.log(`Triggered 4 Button Remote, button=${button} action=${action}`))
      .catch(err => this.error('Error triggering 4 button Remote', err));
    }

    onDeleted(){
		this.log("4 button Remote removed")
	}

}

module.exports = handheld_remote_4_buttons;



/*
  "ids": {
    "modelId": "TS0044",
    "manufacturerName": "_TZ3000_u3nv1jwk"
  },
  "endpoints": {
    "ieeeAddress": "bc:02:6e:ff:fe:7c:67:af",
    "networkAddress": 44659,
    "modelId": "TS0044",
    "manufacturerName": "_TZ3000_u3nv1jwk",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 44659,
        "_reserved": 18,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          1,
          6
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 44659,
        "_reserved": 12,
        "endpointId": 2,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          1,
          6
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 44659,
        "_reserved": 12,
        "endpointId": 3,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          1,
          6
        ],
        "outputClusters": []
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 44659,
        "_reserved": 12,
        "endpointId": 4,
        "applicationProfileId": 260,
        "applicationDeviceId": 0,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          1,
          6
        ],
        "outputClusters": []
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
          "basic": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "zclVersion",
                "value": 3,
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
                "name": "appVersion",
                "value": 66,
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
                "name": "stackVersion",
                "value": 0,
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
                "name": "hwVersion",
                "value": 1,
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
                "name": "manufacturerName",
                "value": "_TZ3000_u3nv1jwk",
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
                "id": 5,
                "name": "modelId",
                "value": "TS0044",
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
                "id": 6,
                "name": "dateCode",
                "value": "",
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
                "id": 7,
                "name": "powerSource",
                "value": "battery",
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 65502,
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
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65534,
                "name": "attributeReportingStatus",
                "value": "PENDING",
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
                "id": 65504,
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
                "id": 65505,
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
                "id": 65506,
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
                "id": 65507,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "powerConfiguration": {},
          "onOff": {}
        },
        "bindings": {
          "ota": {},
          "time": {}
        }
      },
      "2": {
        "clusters": {
          "powerConfiguration": {
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {}
      },
      "3": {
        "clusters": {
          "powerConfiguration": {},
          "onOff": {}
        },
        "bindings": {}
      },
      "4": {
        "clusters": {
          "powerConfiguration": {
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "onOff",
                "value": false,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        },
        "bindings": {}
      }
    }
  }
  */