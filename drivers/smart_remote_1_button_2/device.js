"use strict";

const { ZigbeeDevice } = require("homey-meshdriver");
const { debug, CLUSTER } = require('zigbee-clusters');

class smart_remote_1b_2 extends ZigbeeDevice {
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

    const node = await this.homey.zigbee.getNode(this);
    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      if (clusterId === 6) {
        this.log(
          "endpointId:",
          endpointId,
          ", clusterId:",
          clusterId,
          ", frame:",
          frame,
          ", meta:",
          meta
        );
        this.log("Frame JSON data:", frame.toJSON());
        this.buttonCommandParser(frame);
      }
      else if(clusterId === 8)
      {
        this.log(
          "endpointId:",
          endpointId,
          ", clusterId:",
          clusterId,
          ", frame:",
          frame,
          ", meta:",
          meta
        );
        this.log("Frame JSON data:", frame.toJSON());
        this.buttonCommandParserCL8(frame);
      }
    };

    this._buttonPressedTriggerDevice = this.homey.flow
      .getDeviceTriggerCard("smart_remote_1_button_2")
      .registerRunListener(async (args, state) => {
        return null, args.action === state.action;
      });
  }

  buttonCommandParser(frame) {
    var action = frame[2] === 1 ? "oneClick" : "twoClicks";
    return this._buttonPressedTriggerDevice
      .trigger(this, {}, { action: `${action}` })
      .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
      .catch((err) => this.error("Error triggering 1 button Smart Remote", err));
  }

  buttonCommandParserCL8(frame) {
    var action = frame[2] === 0 ? "oneClick" : "twoClicks";
    return this._buttonPressedTriggerDevice
      .trigger(this, {}, { action: `${action}` })
      .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
      .catch((err) => this.error("Error triggering 1 button Smart Remote", err));
  }

  onDeleted() {
    this.log("1 button Smart Remote Controller has been removed");
  }
}

module.exports = smart_remote_1b_2;


