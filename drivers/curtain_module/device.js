'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');
const TuyaWindowCoveringCluster = require('../../lib/TuyaWindowCoveringCluster')

Cluster.addCluster(TuyaWindowCoveringCluster);

class curtainmodule extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.printNode();

        this._reportDebounceEnabled = false;
        
        this.registerCapability('windowcoverings_set', CLUSTER.WINDOW_COVERING, {
            reportOpts: {
              configureAttributeReporting: {
                  minInterval: 0, // No minimum reporting interval
                  maxInterval: 30000, // Maximally every ~8 hours
                  minChange: 5, // Report when value changed by 5
              },
            },
        });

        await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

        const moveOpen = this.homey.flow.getActionCard('move_open');
        moveOpen.registerRunListener(async (args, state) => {
          await this.zclNode.endpoints[1].clusters.windowCovering['downClose']();
        });

        const moveClose = this.homey.flow.getActionCard('move_close');
        moveClose.registerRunListener(async (args, state) => {
          await this.zclNode.endpoints[1].clusters.windowCovering['upOpen']();
        });

    }

    // When upgrading to node-zigbee-clusters v.2.0.0 this must be adressed:
    // v2.0.0
    // Changed Cluster.readAttributes signature, attributes must now be specified as an array of strings.
    // zclNode.endpoints[1].clusters.windowCovering.readAttributes(["motorReversal", "ANY OTHER IF NEEDED"]);

    async onSettings({ oldSettings, newSettings, changedKeys }) {

        if (changedKeys.includes('reverse')) {

            const motorReversed = newSettings['reverse'];
            if (motorReversed == 0) {
                await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({motorReversal: 0});
                this.log("Motor set to normal mode: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(["motorReversal"]));
            } else {
                await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({motorReversal: 1});
                this.log("Motor set to reverse: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(["motorReversal"]));
            }

        }

      //   if (changedKeys.includes('calibration')) {

      //     const calibration = newSettings['calibration'];
      //     if (calibration == 0) {
      //         await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({calibration: 0});
      //         this.log("Motor calibration off: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(["calibration"]));
      //         this.log("Motor move time: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(["calibrationTime"]));
      //     } else {
      //         await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({calibration: 1});
      //         this.log("Motor calibration on: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(["calibration"]));
      //         this.log("Motor move time: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(["calibrationTime"]));
      //     }

      // }

        if (changedKeys.includes('movetime')) {

          const movetime = (newSettings['movetime'] * 10);
          
          await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({calibrationTime: movetime});
          this.log("Motor move time: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(["calibrationTime"]));

      }

    }

    onDeleted(){
		this.log("Curtain Module removed")
	}

}

module.exports = curtainmodule;

/* "ids": {
    "modelId": "TS130F",
    "manufacturerName": "_TZ3000_vd43bbfq"
  },
  "endpoints": {
    "endpointDescriptors": [
      {
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 514,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          0,
          4,
          5,
          258
        ],
        "outputClusters": [
          25,
          10
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
                "value": "_TZ3000_vd43bbfq"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS130F"
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
                }
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "scenes": {
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
                "id": 2
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 3
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 4
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 2
              }
            ],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          },
          "windowCovering": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 8,
                "name": "currentPositionLiftPercentage",
                "value": 99
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
                  "writable",
                  "reportable"
                ],
                "id": 61440
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 61441
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 61442
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 61443
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
          },
          "time": {
            "attributes": [],
            "commandsGenerated": "UNSUP_GENERAL_COMMAND",
            "commandsReceived": "UNSUP_GENERAL_COMMAND"
          }
        }
      }
    }
  } */