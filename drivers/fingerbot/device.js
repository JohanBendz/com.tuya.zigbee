'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_FINGER_BOT_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);
Cluster.addCluster(TuyaOnOffCluster);

class FingerBotTuya extends TuyaSpecificClusterDevice {
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

    await super.onInit({ zclNode });

    this.printNode();

    // Read basic device attributes
    await zclNode.endpoints[1].clusters.basic.readAttributes(
      ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']
    ).catch(err => {
      this.error('Error when reading device attributes:', err.message, err);
    });

    // Register on/off capability listener
    this.registerCapabilityListener('onoff', async (onOff) => {
      try {
        await this.writeBool(V1_FINGER_BOT_DATA_POINTS.onOff, onOff);
        this.log('Finger Bot on/off set to', onOff);
      } catch (e) {
        this.log('Failed to set on/off:', e.message, e);
      }
    });

    // Register finger_bot_mode capability listener
    this.registerCapabilityListener('finger_bot_mode', async (mode) => {
      const modeMapping = {
        'click': 0,
        'switch': 1,
        'program': 2
      };
      const modeValue = modeMapping[mode];
      try {
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode, modeValue);
        this.log('Finger Bot mode set to', mode);
      } catch (e) {
        this.log('Failed to set mode:', e.message, e);
      }
    });

    // Register flow card listener for finger_bot_mode
    this.homey.flow.getActionCard('set_finger_bot_mode')
      .registerRunListener(async (args) => {
        const modeMapping = {
          'click': 0,
          'switch': 1,
          'program': 2
        };
        const modeValue = modeMapping[args.mode];
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode, modeValue);
        this.log('Finger Bot mode set via flow to', args.mode);
        return true;
      });

    // Load settings and send to device
    this._updateSettings();

    // Handle reporting and responses
    zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));
    zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));

    this.log("ðŸš€ Finger Bot initialized!");
  }

  async _updateSettings() {
    const reverse = this.getSetting('reverse') ?? false;
    const lowerLimit = this.getSetting('lower_limit') ?? 50;
    const upperLimit = this.getSetting('upper_limit') ?? 100;
    const delay = this.getSetting('delay') ?? 1;
    const touch = this.getSetting('touch') ?? false;

    // Apply settings to the device
    try {
      if (reverse !== null) await this.writeBool(V1_FINGER_BOT_DATA_POINTS.reverse, reverse);
      if (lowerLimit !== null) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.lowerLimit, lowerLimit);
      if (upperLimit !== null) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.upperLimit, upperLimit);
      if (delay !== null) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.delay, delay);
      if (touch !== null) await this.writeBool(V1_FINGER_BOT_DATA_POINTS.touch, touch);
      
      this.log('Settings applied to Finger Bot');
    } catch (e) {
      this.log('Error applying settings to Finger Bot:', e.message, e);
    }
  }

  // Process incoming datapoint reports or responses
  async processResponse(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);

    switch (dp) {
      case V1_FINGER_BOT_DATA_POINTS.onOff:
        await this.setCapabilityValue('onoff', parsedValue);
        break;
      case V1_FINGER_BOT_DATA_POINTS.mode:
        await this.setCapabilityValue('finger_bot_mode', ['click', 'switch', 'program'][parsedValue]);
        break;
      case V1_FINGER_BOT_DATA_POINTS.battery:
        await this.setCapabilityValue('measure_battery', parsedValue);
        break;
      default:
        this.log(`Unknown datapoint ${dp}:`, parsedValue);
    }
  }

  // Apply new settings when they are changed by the user
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await this._updateSettings();
  }

  onDeleted() {
    this.log('Finger Bot device removed');
  }
}

module.exports = FingerBotTuya;


