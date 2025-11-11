'use strict';

const { ZigBeeDevice, Util } = require('homey-zigbeedriver');
const { CLUSTER, ZCLDataTypes } = require('zigbee-clusters');

const BATTERY_UPDATE_INTERVAL = 1000 * 60 * 30; // 30 minutes

class motion_sensor extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        this.printNode();
        
        // Check if this is a TS0202 device
        this.isTS0202 = this.productId === 'TS0202';
        
        // Only initialize timing logic for TS0202
        if (this.isTS0202) {
            this._humanStatusTimer = null;
            this._noOneCheckTimer = null;
            this._currentState = 'no_one_state';
        }
        
        // Set up battery monitoring
        this._powerConfiguration = zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME];
        
        // Set up IAS Zone
        const iasZone = zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME];

        // Bind handler for zone status changes
        iasZone.onZoneStatusChangeNotification = this.onZoneStatusChanged.bind(this);

        // Handle enrollment requests from device
        iasZone.onZoneEnrollRequest = async (payload) => {
            this.log('IAS Zone enrollment request received:', payload);
            try {
                await iasZone.enrollResponse({
                    enrollResponseCode: 0, // Success
                    zoneId: 0, // Assign zone ID 0
                });
                this.log('✅ IAS Zone enrollment response sent');
            } catch (err) {
                this.error('❌ Failed to send enrollment response:', err);
            }
        };

        // Set up battery updates with throttling
        this._syncBattery = Util.throttle(
            this._updateBattery.bind(this),
            BATTERY_UPDATE_INTERVAL
        );

        if (this.isFirstInit()) {
            try {
                // Initialize capabilities
                await this.setCapabilityValue('alarm_motion', false).catch(this.error);
                await this.setCapabilityValue('alarm_tamper', false).catch(this.error);
                await this.setCapabilityValue('alarm_battery', false).catch(this.error);

                // Set IAS CIE address
                this.log('Setting IAS CIE address...');
                await iasZone.writeAttributes({
                    iasCIEAddress: Buffer.from(this.homey.zigbee.controller.ieeeAddress, 'hex').reverse()
                });
                this.log('✅ IAS CIE address set');

                // Read current zone state
                const zoneState = await iasZone.readAttributes(['zoneState', 'zoneId', 'iasCIEAddress'])
                    .catch(err => {
                        this.log('Could not read zone state:', err.message);
                        return null;
                    });
                this.log('IAS Zone state after init:', zoneState);

                // Initial battery read - only on motion events afterwards
                await this._updateBattery().catch(err =>
                    this.log('Initial battery read failed (will retry on motion):', err)
                );
            } catch (err) {
                this.error('Failed during initialization:', err);
            }
        }
    }

    onZoneStatusChanged({zoneStatus, extendedStatus, zoneId, delay,}) {
        this.log('onZoneStatusChanged received:', zoneStatus, extendedStatus, zoneId, delay);

        const motionDetected = zoneStatus.alarm1;

        if (this.isTS0202) {
            // Use timing logic for TS0202
            this._handleMotionState(motionDetected);
        } else {
            // Direct state setting for other devices
            this.setCapabilityValue('alarm_motion', motionDetected).catch(this.error);
        }

        // Handle tamper alarm (bit 2)
        if (typeof zoneStatus.tamper === 'boolean') {
            this.log('Tamper status:', zoneStatus.tamper);
            this.setCapabilityValue('alarm_tamper', zoneStatus.tamper).catch(this.error);
        }

        // Handle battery low alarm (bit 3)
        if (typeof zoneStatus.batteryLow === 'boolean') {
            this.log('Battery low status:', zoneStatus.batteryLow);
            this.setCapabilityValue('alarm_battery', zoneStatus.batteryLow).catch(this.error);
        }

        // Try to update battery on motion when device is awake
        this._syncBattery();
    }

    _handleMotionState(motionDetected) {
        // Only for TS0202 devices
        if (!this.isTS0202) return;

        // Clear any existing no-one check timer
        if (this._noOneCheckTimer) {
            clearTimeout(this._noOneCheckTimer);
            this._noOneCheckTimer = null;
        }

        if (motionDetected) {
            if (this._currentState === 'no_one_state') {
                // First detection - start the 30-second timer
                this._currentState = 'human_status';
                this.setCapabilityValue('alarm_motion', true).catch(this.error);
                this._startHumanStatusTimer();
            } else if (this._currentState === 'human_status') {
                // Motion still detected - restart the 30-second timer
                this._startHumanStatusTimer();
            }
        } else {
            // Start 10-second timer to check if nobody is present
            this._noOneCheckTimer = setTimeout(() => {
                this._currentState = 'no_one_state';
                this.setCapabilityValue('alarm_motion', false).catch(this.error);
                this.log('No motion for 10 seconds - returning to no one state');
            }, 10000); // 10 seconds
        }
    }

    _startHumanStatusTimer() {
        // Only for TS0202 devices
        if (!this.isTS0202) return;

        // Clear any existing timer
        if (this._humanStatusTimer) {
            clearTimeout(this._humanStatusTimer);
        }

        // Set new 30-second timer
        this._humanStatusTimer = setTimeout(() => {
            this._humanStatusTimer = null;
        }, 30000); // 30 seconds
    }

    async _updateBattery() {
        try {
            const attrs = await this._powerConfiguration.readAttributes(
                ["batteryPercentageRemaining", "batteryVoltage"]
            );

            if (attrs && attrs.hasOwnProperty('batteryPercentageRemaining')) {
                const percent = attrs.batteryPercentageRemaining;
                this.log('Battery percentage:', percent / 2, '%');
                await this.setCapabilityValue('measure_battery', percent / 2);

                // Update battery alarm based on percentage (< 20%)
                const batteryLow = (percent / 2) < 20;
                await this.setCapabilityValue('alarm_battery', batteryLow);
            }

            if (attrs && attrs.hasOwnProperty('batteryVoltage')) {
                const voltage = attrs.batteryVoltage;
                this.log('Battery voltage:', voltage, 'decisvolts (', voltage * 100, 'mV)');
                // Most devices report in decisvolts (0.1V), so multiply by 100 to get mV
                // If your device needs a different conversion, adjust here
            }
        } catch (err) {
            this.log('Failed to read battery:', err);
        }
    }

    onDeleted() {
        // Clear any existing timers
        if (this.isTS0202) {
            if (this._humanStatusTimer) clearTimeout(this._humanStatusTimer);
            if (this._noOneCheckTimer) clearTimeout(this._noOneCheckTimer);
        }
        this.log("Motion Sensor removed");
    }
}

module.exports = motion_sensor;


/* "ids": {
    "modelId": "RH3040",
    "manufacturerName": "TUYATEC-bd5faf9p"
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
          1280
        ],
        "outputClusters": []
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
                "value": 1
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1,
                "name": "appVersion",
                "value": 72
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
                "value": "TUYATEC-bd5faf9p"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "RH3040"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 6,
                "name": "dateCode",
                "value": "20180512"
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
                  "reportable"
                ],
                "id": 65533,
                "name": "clusterRevision",
                "value": 1
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
                "value": "motionSensor"
              },
              {
                "acl": [
                  "readable",
                  "writable",
                  "reportable"
                ],
                "id": 2,
                "name": "zoneStatus"
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
        "bindings": {}
      }
    }
  } */
