'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { CLUSTER } = require('zigbee-clusters');

class smoke_sensor extends ZigbeeDevice {
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
    // Gestion de la batterie intelligente
    this.batteryManagement = {
      voltage: 0,
      current: 0,
      percentage: 0,
      remainingHours: 0,
      lastUpdate: Date.now()
    };

    // Enregistrer la capacite de mesure de batterie
    this.registerCapability('measure_battery', 'genPowerCfg', {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: (value) => {
        const percentage = Math.round(value / 2);
        this.batteryManagement.percentage = percentage;
        this.updateBatteryAutonomy();
        return percentage;
      },
    });

    // Enregistrer la capacite d'alerte de batterie
    this.registerCapability('alarm_battery', 'genPowerCfg', {
      get: 'batteryAlarmState',
      report: 'batteryAlarmState',
      reportParser: (value) => {
        const alarm = value === 1;
        if (alarm) {
          this.log('ALERTE BATTERIE: Niveau critique atteint!');
        }
        return alarm;
      },
    });

    // Mettre a jour l'autonomie de la batterie toutes les heures
    this.batteryUpdateInterval = setInterval(async () => {
      await this.updateBatteryAutonomy();
    }, 3600000); // 1 heure
  }

  // Methode pour mettre a jour l'autonomie de la batterie
  async updateBatteryAutonomy() {
    try {
      const batteryVoltage = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryVoltage']);
      const batteryPercentage = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
      
      if (batteryVoltage && batteryPercentage) {
        this.batteryManagement.voltage = batteryVoltage.batteryVoltage / 10; // Convertir en volts
        this.batteryManagement.percentage = Math.round(batteryPercentage.batteryPercentageRemaining / 2);
        this.batteryManagement.current = (this.batteryManagement.percentage / 100) * 0.1; // Estimation du courant
        this.batteryManagement.remainingHours = Math.round((this.batteryManagement.percentage * 24) / 100); // Estimation de l'autonomie
        this.batteryManagement.lastUpdate = Date.now();
        
        this.log('Batterie mise a jour:', this.batteryManagement);
        
        // Alerte si la batterie est faible
        if (this.batteryManagement.percentage < 20) {
          this.log('ALERTE: Batterie faible!', this.batteryManagement.percentage + '%');
          await this.triggerFlow('battery_low');
        }
      }
    } catch (error) {
      this.log('Erreur lors de la mise a jour de la batterie:', error);
    }
  }

  // Methode pour dÃ©clencher les flows
  async triggerFlow(triggerType) {
    try {
      const flowCards = this.homey.flow.getDeviceTriggerCards();
      const card = flowCards.find(card => card.id === triggerType);
      
      if (card) {
        await card.trigger(this, {}, {});
        this.log(Flow dÃ©clenchÃ©: );
      }
    } catch (error) {
      this.log(Erreur lors du dÃ©clenchement du flow :, error);
    }
  }
        
      this.printNode();

      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
			  this.onIASZoneStatusChangeNotification(payload);
		  }
    }

    onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
      this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
      this.setCapabilityValue('alarm_smoke', zoneStatus.alarm1).catch(this.error);
      this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
    }

    onDeleted(){
		  this.log("Smoke Sensor removed")
	  }

}

module.exports = smoke_sensor;

/**
 * 
 * 
  "ids": {
    "modelId": "TS0205",
    "manufacturerName": "_TYZB01_dsjszp0x"
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
        "outputClusters": [
          3,
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
                "id": 4,
                "name": "manufacturerName",
                "value": "_TYZB01_dsjszp0x"
              },
              {
                "acl": [
                  "readable",
                  "reportable"
                ],
                "id": 5,
                "name": "modelId",
                "value": "TS0205"
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
            "commandsReceived": []
          },
          "powerConfiguration": {
            "attributes": [
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
            "commandsReceived": []
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
                "value": "fireSensor"
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
            "commandsGenerated": [
              "zoneStatusChangeNotification",
              1
            ],
            "commandsReceived": [
              "zoneStatusChangeNotification"
            ]
          }
        },
        "bindings": {
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
            "commandsReceived": []
          },
          "ota": {
            "attributes": [],
            "commandsGenerated": [],
            "commandsReceived": []
          }
        }
      }
    }
  }
 */


