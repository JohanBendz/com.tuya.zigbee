---
name: Tuya Zigbee - New Device Request
about: If your device is not supported by the app you can request it to be added here.
title: Device Request - [ZigBee Curtain Switch] - [UseeLink - Xenon] / [SM-SW101-CZ-W1]
labels: New Device
assignees: 'ProfFunny13'

---

### Prerequisites:

- Before requesting a device addition, please ensure there is not already a request for the device among the open issues.
- Make sure your Homey is upgraded to firmware v5 or higher.
- You need a physical example of the device.

### Device Information

- Device Name: `Curtain Switch`
- Device Model: `SM-SW101-CZ-W1 (TS130F)`
- Device Description: `Curtain Switch Module, 1 Channel`
- Link to device image: "https://www.amazon.de/dp/B0BPSB6B3M?tag=heimkinocheck04-21&linkCode=ogi&th=1&keywords=zigbee%2Brolladen"

### Device Interview

```json
{
  "ids": {
    "modelId": "TS130F",
    "manufacturerName": "_TZ3000_ltiqubue"
  },
  "endpoints": {
    "ieeeAddress": "a4:c1:38:79:f7:c0:2d:f3",
    "networkAddress": 40466,
    "modelId": "TS130F",
    "manufacturerName": "_TZ3000_ltiqubue",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 40466,
        "_reserved": 22,
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 514,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          3,
          4,
          5,
          6,
          258
        ],
        "outputClusters": [
          10
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
    "swBuildId": "",
    "capabilities": {
      "alternatePANCoordinator": false,
      "deviceType": true,
      "powerSourceMains": true,
      "receiveWhenIdle": true,
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
                "value": 82
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2,
                "name": "stackVersion",
                "value": 0
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 3,
                "name": "hwVersion",
                "value": 1
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 4,
                "name": "manufacturerName",
                "value": "_TZ3000_ltiqubue"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS130F"
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 7,
                "name": "powerSource",
                "value": "mains"
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
                "value": ""
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
          "identify": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "writable"
                ],
                "id": 0,
                "name": "identifyTime",
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
          "groups": {
            "attributes": [
              {
                "acl": [
                  "readable"
                ],
                "id": 0,
                "name": "nameSupport",
                "value": {
                  "type": "Buffer",
                  "data": [
                    0
                  ]
                }
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
          "scenes": {
            "attributes": [
              {
                "acl": [],
                "id": 25452
              },
              {
                "acl": [],
                "id": 17096
              },
              {
                "acl": [],
                "id": 2
              },
              {
                "acl": [],
                "id": 33723
              },
              {
                "acl": [],
                "id": 0
              },
              {
                "acl": [],
                "id": 0
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "onOff": {
            "attributes": [],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "windowCovering": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 8,
                "name": "currentPositionLiftPercentage",
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
                "id": 61440,
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
                "id": 61441,
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
                "id": 61442,
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
                "id": 61443,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
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
        "bindings": {
          "time": {
            "attributes": [],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        }
      }
    }
  }
}
```

### Additional Comments:

> **Note:** Provide any other relevant information or requests related to the device. Link to where you bought the device can be of help

### How to interview a device

- Add the device as a generic Zigbee device in Homey
- Navigate to https://developer.athom.com/tools/zigbee.
- Interview the device, the button for this is to the right of the device in the list of Zigbee units.
- Click the copy button/icon to capture the device information.
- Paste the copied information above.

> **Note:** To be able to add more devices to the Tuya Zigbee app, we rely on community members like you to provide interviews of the devices you want to be added. Thank you for your contribution!
