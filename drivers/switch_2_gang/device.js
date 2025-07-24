'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class switch_2_gang extends ZigbeeDevice {
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
/*     debug(true);
    this.enableDebug(); */

        if (!this.isSubDevice()) {
            await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
            .catch(err => {
                this.error('Error when reading device attributes ', err);
            });
        }

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        try {
            this.registerCapability('onoff', 'genOnOff', {
                endpoint: subDeviceId === 'secondSwitch' ? 2 : 1,
            });
        } catch (err) {
            this.error('Error registering capability: ', err);
        }

    }

    onDeleted(){
        const { subDeviceId } = this.getData();
        this.log("2 Gang Switch, channel ", subDeviceId, " removed");
    }

}

module.exports = switch_2_gang;

