'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
// const { CLUSTER } = require('zigbee-clusters');

class wall_remote_6_gang extends ZigbeeDevice {
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

      this.printNode();

      const node = await this.homey.zigbee.getNode(this);
      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        if (clusterId === 6) {
           this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
           this.log("Frame JSON data:", frame.toJSON());
           frame = frame.toJSON();
           this.buttonCommandParser(endpointId, frame);
        }
      };

      this._buttonPressedTriggerDevice = this.homey.flow.getDeviceTriggerCard('wall_remote_6_gang_buttons')
      .registerRunListener(async (args, state) => {
        return (null, args.action === state.action);
      });
    
    }

    buttonCommandParser(ep, frame) {
      var button = ep === 1 ? 'one' : ep === 2 ? 'two' : ep === 3 ? 'three' : ep === 4 ? 'four' : ep === 5 ? 'five' : 'six';
      var action = frame.data[3] === 0 ? 'oneClick' : 'twoClicks';

      // Debounce logic
      if (!this.doubleClickReceived) {
        // If it's a single click, set a timeout to allow for the possibility of a double click
        if (action === 'oneClick') {
          this.clickTimeout = setTimeout(() => {
            this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
              .then(() => this.log(`Triggered 6 Gang Wall Remote, action=${button}-${action}`))
              .catch(err => this.error('Error triggering 6 Gang Wall Remote', err));
          }, 300); // Adjust debounce time as needed
        }
      }

      // If it's a double click, cancel the pending single-click and process the double click
      if (action === 'twoClicks') {
        clearTimeout(this.clickTimeout); // Cancel the pending single-click action
        this.doubleClickReceived = true;

        // Trigger the double-click action
        this._buttonPressedTriggerDevice.trigger(this, {}, { action: `${button}-${action}` })
          .then(() => this.log(`Triggered 6 Gang Wall Remote, action=${button}-${action}`))
          .catch(err => this.error('Error triggering 6 Gang Wall Remote', err));
        
        // Reset the flag after a short timeout
        setTimeout(() => {
          this.doubleClickReceived = false;
        }, 500); // Adjust time as needed
      }
    }

    onDeleted() {
      this.log("6 Gang Wall Remote removed");
    }

}

module.exports = wall_remote_6_gang;


