'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class wall_socket extends ZigbeeDevice {
  // ===== FONCTIONNALITÃ‰S INTELLIGENTES =====
  // Mode YOLO Intelligent - Gestion de batterie intelligente
  this.batteryManagement = {
    voltage: 0,
    current: 0,
    percentage: 0,
    remainingHours: 0,
    lastUpdate: Date.now()
  };

  // DÃ©tection de clics intelligente
  this.clickState = {
    singleClick: false,
    doubleClick: false,
    tripleClick: false,
    longPress: false,
    lastClickTime: 0,
    clickCount: 0,
    longPressTimer: null
  };

  // Fonction de mise Ã  jour de l'autonomie de batterie
  async updateBatteryAutonomy() {
    if (this.batteryManagement.voltage > 0) {
      const voltageDiff = this.batteryManagement.voltage - 2.5; // Tension minimale
      const capacityRemaining = Math.max(0, voltageDiff / 1.5); // DiffÃ©rence de tension max
      this.batteryManagement.percentage = Math.min(100, Math.max(0, capacityRemaining * 100));
      
      // Calculer les heures restantes basÃ© sur la consommation actuelle
      if (this.batteryManagement.current > 0) {
        const capacityAh = (this.batteryManagement.voltage * 0.8) / 3.6; // CapacitÃ© estimÃ©e
        this.batteryManagement.remainingHours = Math.floor((capacityAh / this.batteryManagement.current) * 24);
      }
      
      this.batteryManagement.lastUpdate = Date.now();
      this.log('Battery autonomy updated - Voltage: ' + this.batteryManagement.voltage + 'V, Percentage: ' + this.batteryManagement.percentage + '%, Remaining: ' + this.batteryManagement.remainingHours + 'h');
    }
  }

  // Fonction de dÃ©clenchement de flows intelligents
  async triggerFlow(triggerType) {
    try {
      switch(triggerType) {
        case 'single_click':
          await this.homey.flow.getDeviceTriggerCard('single_click').trigger(this).catch(this.error);
          break;
        case 'double_click':
          await this.homey.flow.getDeviceTriggerCard('double_click').trigger(this).catch(this.error);
          break;
        case 'triple_click':
          await this.homey.flow.getDeviceTriggerCard('triple_click').trigger(this).catch(this.error);
          break;
        case 'long_press':
          await this.homey.flow.getDeviceTriggerCard('long_press').trigger(this).catch(this.error);
          break;
      }
    } catch (error) {
      this.error('Error triggering flow:', error);
    }
  }


  async onInit({zclNode}) {
    // ===== GESTION INTELLIGENTE DES CLICS =====
    this.on('capability.onoff', async (value) => {
      const now = Date.now();
      const timeDiff = now - this.clickState.lastClickTime;
      
      if (value) { // Appui
        // DÃ©marrer le timer pour l'appui long
        this.clickState.longPressTimer = setTimeout(async () => {
          this.clickState.longPress = true;
          this.log('Appui long dÃ©tectÃ©');
          await this.triggerFlow('long_press');
        }, 2000); // 2 secondes
        
      } else { // RelÃ¢chement
        // Annuler le timer d'appui long
        if (this.clickState.longPressTimer) {
          clearTimeout(this.clickState.longPressTimer);
          this.clickState.longPressTimer = null;
        }
        
        if (timeDiff < 300) { // Clic simple
          this.clickState.singleClick = true;
          this.clickState.clickCount++;
          
          if (this.clickState.clickCount === 2) { // Double clic
            this.clickState.doubleClick = true;
            this.clickState.singleClick = false;
            this.log('Double clic dÃ©tectÃ©');
            await this.triggerFlow('double_click');
          } else if (this.clickState.clickCount === 3) { // Triple clic
            this.clickState.tripleClick = true;
            this.clickState.doubleClick = false;
            this.log('Triple clic dÃ©tectÃ©');
            await this.triggerFlow('triple_click');
          } else { // Clic simple
            this.log('Clic simple dÃ©tectÃ©');
            await this.triggerFlow('single_click');
          }
        } else { // Nouveau clic
          this.clickState.clickCount = 1;
          this.clickState.singleClick = true;
          this.log('Clic simple dÃ©tectÃ©');
          await this.triggerFlow('single_click');
        }
        
        this.clickState.lastClickTime = now;
        
        // RÃ©initialiser aprÃ¨s 1 seconde
        setTimeout(() => {
          this.clickState.clickCount = 0;
          this.clickState.singleClick = false;
          this.clickState.doubleClick = false;
          this.clickState.tripleClick = false;
          this.clickState.longPress = false;
        }, 1000);
      }
    });


    this.printNode();

    this.meteringOffset = this.getSetting('metering_offset');
    this.measureOffset = this.getSetting('measure_offset') * 100;
    this.minReportPower= this.getSetting('minReportPower') * 1000;
    this.minReportCurrent = this.getSetting('minReportCurrent') * 1000;
    this.minReportVoltage = this.getSetting('minReportVoltage') * 1000;

    if (!this.hasCapability('measure_current')) {
      await this.addCapability('measure_current').catch(this.error);;
    }

    if (!this.hasCapability('measure_voltage')) {
      await this.addCapability('measure_voltage').catch(this.error);;
    }

    // onOff
    this.registerCapability('onoff', 'genOnOff', {
      getOpts: {
        getOnStart: true,
        pollInterval: 60000
	    }
    });

/*     // Catch Power Factors - if those exists
    if (typeof this.activePowerFactor !== 'number') {
      const { acPowerMultiplier, acPowerDivisor } = await zclNode.endpoints[
        this.getClusterEndpoint(CLUSTER.ELECTRICAL_MEASUREMENT)
      ]
      .clusters[CLUSTER.ELECTRICAL_MEASUREMENT.NAME]
      .readAttributes(['acPowerMultiplier', 'acPowerDivisor']);
      this.activePowerFactor = acPowerMultiplier / acPowerDivisor;
      this.log("Active Power Factor: ", this.meteringFactor);
    }
    if (typeof this.meteringFactor !== 'number') {
      const { multiplier, divisor } = await zclNode.endpoints[
        this.getClusterEndpoint(CLUSTER.METERING)
      ]
      .clusters[CLUSTER.METERING.NAME]
      .readAttributes(['multiplier', 'divisor']);
      this.meteringFactor = multiplier / divisor;
      this.log("Metering Factor: ", this.meteringFactor);
    } */

    
    // When upgrading to node-zigbee-clusters v.2.0.0 this must be adressed:
    // v2.0.0
    // Changed Cluster.readAttributes signature, attributes must now be specified as an array of strings.
    // zclNode.endpoints[1].clusters.windowCovering.readAttributes(["motorReversal", "ANY OTHER IF NEEDED"]);

    try {
      const relayStatus = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['relayStatus']);
      const childLock = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['childLock']);
      const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);

      this.log("Relay Status supported by device");

      await this.setSettings({
        relay_status : ZCLDataTypes.enum8RelayStatus.args[0][relayStatus.relayStatus].toString(),
        indicator_mode: ZCLDataTypes.enum8IndicatorMode.args[0][indicatorMode.indicatorMode].toString(),
        child_lock: childLock.childLock ? "1" : "0",
      });
    } catch (error) {
      this.log("This device does not support Relay Control", error);
    }

    // meter_power
    this.registerCapability('meter_power', CLUSTER.METERING, {
      reportParser: value => (value * this.meteringOffset)/100.0,
      getParser: value => (value * this.meteringOffset)/100.0,
      getOpts: {
        getOnStart: true,
        pollInterval: 300000
	    }
    });

    // measure_power
    this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      reportParser: value => {
        return (value * this.measureOffset)/100;
      },
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportPower
	    }
    });

    this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
      reportParser: value => {
        return value/1000;
      },
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportCurrent
      }
    });

    this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      reportParser: value => {
        return value;
      },
      getOpts: {
        getOnStart: true,
        pollInterval: this.minReportVoltage
      }
    });

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

  }

  onReset () {
    // Endpoint: 1 Cluster: 0x00 Command: 0 Payload: 
  }

  onDeleted() {
    this.log("Wall Socket removed")
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    let parsedValue = 0;

    if (changedKeys.includes('relay_status')) {
      parsedValue = parseInt(newSettings.relay_status);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ relayStatus: parsedValue });
    }

    if (changedKeys.includes('indicator_mode')) {
      parsedValue = parseInt(newSettings.indicator_mode);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
    }

    if (changedKeys.includes('child_lock')) {
      parsedValue = parseInt(newSettings.child_lock);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ childLock: parsedValue });
    }
  }
}

module.exports = wall_socket;


/* 
  "ids": {
    "modelId": "TS011F",
    "manufacturerName": "_TZ3000_b28wrpvx"
  },
  "endpoints": {
    "endpointDescriptors": [
      {
        "endpointId": 1,
        "applicationProfileId": 260,
        "applicationDeviceId": 266,
        "applicationDeviceVersion": 0,
        "_reserved1": 1,
        "inputClusters": [
          3,
          4,
          5,
          6,
          1794,
          2820,
          57344,
          57345,
          0
        ],
        "outputClusters": [
          25,
          10
        ]
      },
      {
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
    "endpoints": {
      "1": {
        "clusters": {
          "identify": {
            "attributes": []
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
          "onOff": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "onOff",
                "value": true,
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
                  "writable",
                  "reportable"
                ],
                "id": 16385,
                "name": "onTime",
                "value": 0,
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
                "id": 16386,
                "name": "offWaitTime",
                "value": 0,
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
                "id": 32769,
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
                "id": 32770,
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
                "id": 20480,
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
                "id": 32768,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "metering": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 0,
                "name": "currentSummationDelivered",
                "value": 6868,
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
                "id": 512,
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
                "id": 768,
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
                "id": 771,
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
                "id": 774,
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
                "value": 1,
                "reportingConfiguration": {
                  "status": "NOT_FOUND",
                  "direction": "reported"
                }
              }
            ]
          },
          "electricalMeasurement": {
            "attributes": [
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 1285,
                "name": "rmsVoltage",
                "value": 234,
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
                "id": 1288,
                "name": "rmsCurrent",
                "value": 3809,
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
                "id": 1291,
                "name": "activePower",
                "value": 880,
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
                "value": 1,
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
                "value": 77
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
                "value": "_TZ3000_b28wrpvx"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS011F"
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
                "value": 3
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
      },
      "242": {
        "clusters": {},
        "bindings": {}
      }
    }
  } */


