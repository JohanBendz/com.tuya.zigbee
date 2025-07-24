"use strict";

const { ZigbeeDevice } = require("homey-meshdriver");
const { CLUSTER } = require('zigbee-clusters');

class smart_remote_1b extends ZigbeeDevice {
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

  async onInit({ zclNode }) {
    this.printNode();

    // Bind the OnOff cluster for handling button events
    await zclNode.endpoints[1].clusters['genOnOff'].bind();

    // Handle the frame for button events
    zclNode.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (clusterId === 6) { // OnOff cluster
            this.log("endpointId:", endpointId, ", clusterId:", clusterId, ", frame:", frame, ", meta:", meta);
            this.buttonCommandParser(frame);
        }
    };

    await this.configureAttributeReporting([
      {
          endpointId: 1,
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 1, // Report changes greater than 1%
      }
    ]);

    zclNode.endpoints[1].clusters['genPowerCfg'].on('report', (report) => {
      if (report.batteryPercentageRemaining !== undefined) {
        const batteryPercentage = report.batteryPercentageRemaining / 2; // Convert to percentage
        this.log('Battery percentage received:', batteryPercentage);

        this.setCapabilityValue('measure_battery', batteryPercentage).catch((err) => {
          this.error('Failed to update battery level', err);
        });
      }
    });

  };

  buttonCommandParser(frame) {
    let action;

  if ((frame[0] === 0xfd || frame[0] === 253) && frame[1] === 0) {
        action = "oneClick"; // Short release
    } else if ((frame[0] === 0xfd || frame[0] === 253) && frame[1] === 1) {
        action = "twoClicks"; // Double press
    } else {
        action = "unknown";
        this.log("Unknown click action detected:", frame[1]);
    }

    return this._buttonPressedTriggerDevice
        .trigger(this, {}, { action })
        .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
        .catch((err) => this.error("Error triggering 1 button Smart Remote", err));
  }

  onDeleted() {
    this.log("1 button Smart Remote Controller has been removed");
  }

}

module.exports = smart_remote_1b;


