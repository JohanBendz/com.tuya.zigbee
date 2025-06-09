'use strict';

const TuyaSpecificCluster = require("../../lib/TuyaSpecificCluster");
const TuyaOnOffCluster = require("../../lib/TuyaOnOffCluster");
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const {getDataValue} = require("./helpers");
const {Cluster} = require("zigbee-clusters");

Cluster.addCluster(TuyaOnOffCluster);
Cluster.addCluster(TuyaSpecificCluster);

/**
 * These are the "Data points" which the Tuya cluster exposes, and can be written against.
*/
const THERMOSTAT_DATA_POINTS = {
    onOff: 1,
    mode: 2,
    targetTemperature: 16,
    currentTemperature: 24,
    childlock: 40
}

/**
 * `WallThermostatDevice` makes the Tuya Wall Thermostat for Electric Floor heating (BHT-002-GCLZB) available in Homey.
 *  The device can be set to a target temperature, turned on and off, and will show current temperature.
 *
 * Most likely also works for the Water/Gas Boiler and Water heating version too.
 * https://smarthomescene.com/reviews/moes-zigbee-smart-thermostat-bht-002/
 *
 * Device manual:
 * https://manuals.plus/beca/bht-002-series-wifi-thermostat-manual.pdf
 *
 * Implementation details:
 * - The device does not implement cluster attributes for thermostat, deviceTemperature, and temperatureMeasurement clusters.
 * - This code is using the Tuya cluster to receive and send Tuya data points back and forth between Homey and the Wall Thermostat.
 */
class WallThermostatDevice extends TuyaSpecificClusterDevice {
    async onNodeInit({zclNode}) {
        this.printNode();
/*     debug(true);
    this.enableDebug(); */

        if (!this.hasCapability('thermostat_programming')) {
          await this.addCapability('thermostat_programming');
          }
          
          if (!this.hasCapability('child_lock')) {
          await this.addCapability('child_lock');
        }

        this.registerCapabilityListener('onoff', async (onOff) => {
            await this.writeBool(THERMOSTAT_DATA_POINTS.onOff, onOff)
            this.log('Device on/off set', onOff)
        });

        this.registerCapabilityListener('thermostat_programming', async (mode) => {
            await this.writeEnum(THERMOSTAT_DATA_POINTS.mode, mode )
            this.log('Device mode set', mode)
        });

        this.registerCapabilityListener('target_temperature', async (targetTemperature) => {
            await this.writeData32(THERMOSTAT_DATA_POINTS.targetTemperature, targetTemperature)
            this.log('Target temperature set', targetTemperature)
        });

        this.registerCapabilityListener('measure_temperature', async (currentTemperature) => {
            this.log('Current temperature received', currentTemperature)
        });

        this.registerCapabilityListener('child_lock', async (childlock) => {
            await this.writeBool(THERMOSTAT_DATA_POINTS.childlock, childlock)
            this.log('Childlock set', childlock)
        });

        zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));
        zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));

        this.log("🚀 Wall Thermostat booted up!");
    }

    async processResponse(data) {

        const dp = data.dp;
        const parsedValue = getDataValue(data);

        switch (dp) {

            case THERMOSTAT_DATA_POINTS.onOff:
                this.log('Thermostat on/off received', parsedValue);

                try {
                    await this.setCapabilityValue('onoff', parsedValue);
                } catch (e) {
                    this.log("Failed to set on/off", e);
                }

                break;

            case THERMOSTAT_DATA_POINTS.mode:
                this.log('Thermostat mode received', parsedValue);

                try {
                    await this.setCapabilityValue('thermostat_programming', (parsedValue === 0 ? "0" : "1"));
                } catch (e) {
                    this.log("Failed to set mode", e);
                }

                break;

            case THERMOSTAT_DATA_POINTS.currentTemperature:
                this.log('Current temperature received', parsedValue);

                try {
                    await this.setCapabilityValue('measure_temperature', parsedValue / 10)
                } catch (e) {
                    this.log("Failed to set current temperature", e);
                }

                break;

            case THERMOSTAT_DATA_POINTS.targetTemperature:
                this.log('Target Temperature received', parsedValue);

                try {
                    await this.setCapabilityValue('target_temperature', parsedValue);
                } catch (e) {
                    this.log("Failed to set target temperature", e);
                }

                break;

            case THERMOSTAT_DATA_POINTS.childlock:
                this.log('Thermostat childlock received', parsedValue);

                try {
                    await this.setCapabilityValue('child_lock', parsedValue);
                } catch (e) {
                    this.log("Failed to set childlock", e);
                }

                break;

            default:
                this.log('processReporting', dp, parsedValue)
        }
    }
}

module.exports = WallThermostatDevice;


/*

  "ids": {
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_aoclfnxz"
  },
  "endpoints": {
    "networkAddress": 44768,
    "modelId": "TS0601",
    "manufacturerName": "_TZE204_aoclfnxz",
    "endpointDescriptors": [
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 44768,
        "_reserved": 20,
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
      },
      {
        "status": "SUCCESS",
        "nwkAddrOfInterest": 44768,
        "_reserved": 10,
        "endpointId": 242,
        "applicationProfileId": 41440,
        "applicationDeviceId": 97,
        "applicationDeviceVersion": 0,
        "_reserved1": 0,
        "inputClusters": [],
        "outputClusters": [
          33
        ]
      }
    ],
    "deviceType": "router",
    "receiveWhenIdle": true,
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
                "value": 74
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
                "value": "_TZE204_aoclfnxz"
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
          "ota": {},
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
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  }
*/