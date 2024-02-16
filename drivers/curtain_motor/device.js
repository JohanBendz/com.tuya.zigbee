'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  position: 2,
  arrived: 3,
  motorReverse: 4,
}

const dataTypes = {
  raw: 0, // [ bytes ]
  bool: 1, // [0/1]
  value: 2, // [ 4 byte value ]
  string: 3, // [ N byte string ]
  enum: 4, // [ 0-255 ]
  bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  let value = 0;

  for (let i = 0; i < chunks.length; i++) {
    value = value << 8;
    value += chunks[i];
  }

  return value;
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw:
      return dpValue.data;
    case dataTypes.bool:
      return dpValue.data[0] === 1;
    case dataTypes.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
}

class CurtainMotor extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {

    this.printNode();

    zclNode.endpoints[1].clusters.tuya.on("response", value => this.updatePosition(value));

    this.registerCapabilityListener('windowcoverings_set', value => this.setPosition(value));

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

  }

  async setPosition(pos) {
    const reverse = this.getSettings().reverse == 1;
    const maxOpenPercentage = this.getSettings().max_open_percentage || 100;

    if (pos > maxOpenPercentage / 100) {
      pos = maxOpenPercentage / 100;
    }

    if (pos === undefined) {
      pos = this.getCapabilityValue('pos');
    } else {
      pos = reverse ? 1 - pos : pos;
    }

    return this.writeData32(dataPoints.position, pos * 100);
  }

  async updatePosition(data) {
    const dp = data.dp;
    const value = getDataValue(data);
    const reverse = this.getSettings().reverse == 1;

    switch (dp) {
      case dataPoints.arrived:
        const position = reverse ? (value & 0xFF) : 100 - (value & 0xFF);
        console.log(reverse, 100 - (value & 0xFF), (value & 0xFF))

        this.setCapabilityValue('windowcoverings_set', position / 100).catch(this.error);
        break;
    }
  }

  onDeleted() {
    this.log("Curtain Motor removed")
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    if (changedKeys.includes('reverse')) {
      this.setCapabilityValue('windowcoverings_set', 1 - this.getCapabilityValue('windowcoverings_set')).catch(this.error);
    }
  }

}

module.exports = CurtainMotor;

// Cluster 61184 is a custom cluster that is used to control the curtain motor.
// The device has 5 datapoints.
// 1: position of the curtain. 32 bit integer, but only the first byte is used. The value is between 0 and 100. 0 is closed, 100 is open.
// 2: position (0-100). 32 bit integer, but only the first byte is used. The value is between 0 and 100. 0 is closed, 100 is open.
// 3: arrived (0/1). Boolean. 0 is false, 1 is true.
// 4: motor reverse (0/1). Boolean. 0 is false, 1 is true.
// 5: motor speed (0-100). 32 bit integer, but only the first byte is used. The value is between 0 and 100. 0 is slow, 100 is fast.


// {
//   "ids": {
//   "modelId": "TS0601",
//     "manufacturerName": "_TZE200_nogaemzt"
// },
//   "endpoints": {
//   "endpointDescriptors": [
//     {
//       "endpointId": 1,
//       "applicationProfileId": 260,
//       "applicationDeviceId": 81,
//       "applicationDeviceVersion": 0,
//       "_reserved1": 0,
//       "inputClusters": [
//         0,
//         10,
//         4,
//         5,
//         61184
//       ],
//       "outputClusters": [
//         25
//       ]
//     }
//   ],
//     "endpoints": {
//     "1": {
//       "clusters": {
//         "basic": {
//           "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "time": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 7
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "groups": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 0,
//               "name": "nameSupport",
//               "value": {
//                 "type": "Buffer",
//                 "data": [
//                   0
//                 ]
//               }
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65533,
//               "name": "clusterRevision",
//               "value": 1
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         },
//         "scenes": {
//           "attributes": [
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 0
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 1
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 2
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 3
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 4
//             },
//             {
//               "acl": [
//                 "readable",
//                 "reportable"
//               ],
//               "id": 65533,
//               "name": "clusterRevision",
//               "value": 1
//             }
//           ],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         }
//       },
//       "bindings": {
//         "ota": {
//           "attributes": [],
//             "commandsGenerated": "UNSUP_GENERAL_COMMAND",
//             "commandsReceived": "UNSUP_GENERAL_COMMAND"
//         }
//       }
//     }
//   }
// }
