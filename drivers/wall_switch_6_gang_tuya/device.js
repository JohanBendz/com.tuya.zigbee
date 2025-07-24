'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_MULTI_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class wall_switch_6_gang_tuya extends TuyaSpecificClusterDevice {
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
/*     debug(true);
    this.enableDebug(); */

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // Setup capability listeners and event handlers for each gang
    if (this.isSubDevice()) {
      // Handle each subdevice based on the subDeviceId
      switch (subDeviceId) {
        case 'secondGang':
          await this._setupGang(zclNode, 'second gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo);
          break;
        case 'thirdGang':
          await this._setupGang(zclNode, 'third gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree);
          break;
        case 'fourthGang':
          await this._setupGang(zclNode, 'fourth gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour);
          break;
        case 'fifthGang':
          await this._setupGang(zclNode, 'fifth gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFive);
          break;
        case 'sixthGang':
          await this._setupGang(zclNode, 'sixth gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchSix);
          break;
      }
    } else {
      // Main device for the first gang
      await this._setupGang(zclNode, 'first gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne);
    }

    zclNode.endpoints[1].clusters.tuya.on("reporting", async (value) => {
      try {
        await this.processDatapoint(value);
      } catch (err) {
        this.error('Error processing datapoint:', err);
      }
    });

    zclNode.endpoints[1].clusters.tuya.on("response", async (value) => {
      try {
        await this.processDatapoint(value);
      } catch (err) {
        this.error('Error processing datapoint:', err);
      }
    });

  }

  async _setupGang(zclNode, gangName, dpOnOff) {
    // Register capability listener for on/off for each gang
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`${gangName} on/off:`, value);
      try {
        await this.writeBool(dpOnOff, value);
      } catch (err) {
        this.error(`Error when writing onOff for ${gangName}:`, err);
        throw err;
      }
    });
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    const { subDeviceId } = this.getData(); 
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    // Differentiate between gangs by DP
    switch (dp) {
      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne:
        this.log('Received on/off for first gang:', parsedValue);
        if (!this.isSubDevice()) {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo:
        this.log('Received on/off for second gang:', parsedValue);
        if (subDeviceId === 'secondGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree:
        this.log('Received on/off for third gang:', parsedValue);
        if (subDeviceId === 'thirdGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour:
        this.log('Received on/off for fourth gang:', parsedValue);
        if (subDeviceId === 'fourthGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFive:
        this.log('Received on/off for fifth gang:', parsedValue);
        if (subDeviceId === 'fifthGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchSix:
        this.log('Received on/off for sixth gang:', parsedValue);
        if (subDeviceId === 'sixthGang') {
          await this.setCapabilityValue('onoff', parsedValue).catch(this.error);
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log('6 Gang Wall Switch removed');
  }
}

module.exports = wall_switch_6_gang_tuya;


