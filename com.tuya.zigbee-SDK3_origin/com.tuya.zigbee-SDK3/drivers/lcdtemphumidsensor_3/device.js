'use strict';

const { Cluster, debug} = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  currentHumidity: 2,
  currentTemperature: 1,
  batteryLevel: 4,
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

class lcdtemphumidsensor3 extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();

    zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));
  }


  async processResponse(data) {
    const dp = data.dp;
    const measuredValue = getDataValue(data);
    let parsedValue = 0;

    switch (dp) {
      case dataPoints.batteryLevel:
        const batteryThreshold = this.getSetting('batteryThreshold') || 20;
        parsedValue = measuredValue;
        this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", parsedValue);

        this.setCapabilityValue('measure_battery', parsedValue).catch(this.error);
        this.setCapabilityValue('alarm_battery', (parsedValue < batteryThreshold)).catch(this.error);
        break;

      case dataPoints.currentHumidity:
        const humidityOffset = this.getSetting('humidity_offset') || 0;
        parsedValue = measuredValue/10;
        this.log('measure_humidity | relativeHumidity - measuredValue (humidity):', parsedValue, '+ humidity offset', humidityOffset);

        this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this.error);
        break;

      case dataPoints.currentTemperature:
        const temperatureOffset = this.getSetting('temperature_offset') || 0;
        parsedValue = measuredValue/10;
        this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);

        this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
        break;
    }
  }

  onDeleted() {
    this.log("LCD Temperature & Humidity sensor removed")
  }
}

module.exports = lcdtemphumidsensor3;

/*
"ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE200_bjawzodf"
  },
  "endpoints": {
    "endpointDescriptors": [
      {
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
    "endpoints": {
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
                "value": 67
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
                "value": "_TZE200_bjawzodf"
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
          "ota": {
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
                "id": 1
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 2
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 3
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 4
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 5
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 6
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 7
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 8
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 9
              },
              {
                "acl": [
                  "readable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
              }
            ]
          },
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
 */
