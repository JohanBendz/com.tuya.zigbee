'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class smart_remote_4b extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

      var debounce = 0;
      this.printNode();
  
      const node = await this.homey.zigbee.getNode(this);
      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (clusterId === 1281) {
//          this.log("Frame JSON data:", frame.toJSON());
          debounce = debounce+1;
          if (debounce===1){
            this.buttonCommandParser(frame);
          }
          if (debounce===3){
            debounce=0;
          }
        }
      };

      this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('smart_remote_4_buttons')
      .registerRunListener(async (args, state) => {
        return (null, args.action === state.action);
      });

    }

    buttonCommandParser(frame) {
      if (frame[2]===2){
        var button = 'leftUp';
        return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}` })
        .then(() => this.log(`Triggered 4 button Smart Remote, action=${button}`))
        .catch(err => this.error('Error triggering 4 button Smart Remote', err));
      } else {
        var button = frame[3] === 0 ? 'rightDown' : frame[3] === 1 ? 'leftDown' : 'rightUp';
        return this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}` })
        .then(() => this.log(`Triggered 4 button Smart Remote, action=${button}`))
        .catch(err => this.error('Error triggering 4 button Smart Remote', err));
      }
    }

    onDeleted(){
		this.log("4 button Smart Remote Controller has been removed")
	  }

}

module.exports = smart_remote_4b;

/* "ids": {
  "modelId": "TS0215A",
  "manufacturerName": "_TZ3000_fsiepnrh"
},
"endpoints": {
  "endpointDescriptors": [
    {
      "endpointId": 1,
      "applicationProfileId": 260,
      "applicationDeviceId": 1025,
      "applicationDeviceVersion": 0,
      "_reserved1": 1,
      "inputClusters": [
        0,
        1,
        1280,
        1281
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
              "name": "clusterRevision"
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65534,
              "name": "attributeReportingStatus"
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
          ]
        },
        "powerConfiguration": {
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
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
              "value": "remoteControl"
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
                  0,
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
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "iasACE": {
          "attributes": [
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