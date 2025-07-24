'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class wall_switch_3_gang extends ZigbeeDevice {

  async onInit({zclNode}) {
    await super.onInit({zclNode});

    this.printNode();

    const { subDeviceId } = this.getData();
    this.log("Device data: ", subDeviceId);

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

    // Enregistrer la mesure de voltage
    this.registerCapability('measure_voltage', 'genPowerCfg', {
      get: 'batteryVoltage',
      report: 'batteryVoltage',
      reportParser: (value) => {
        const voltage = value / 10; // Convertir en volts
        this.batteryManagement.voltage = voltage;
        this.updateBatteryAutonomy();
        return voltage;
      },
    });

    // Enregistrer la mesure de courant
    this.registerCapability('measure_current', 'genPowerCfg', {
      get: 'batteryCurrent',
      report: 'batteryCurrent',
      reportParser: (value) => {
        const current = value / 1000; // Convertir en amperes
        this.batteryManagement.current = current;
        this.updateBatteryAutonomy();
        return current;
      },
    });

    // Enregistrer la capacite de bouton
    this.registerCapability('button', 'genOnOff', {
      endpoint: subDeviceId === 'secondSwitch' ? 2 : subDeviceId === 'thirdSwitch' ? 3 : 1,
    });

    // Enregistrer la capacite onoff
    this.registerCapability('onoff', 'genOnOff', {
      endpoint: subDeviceId === 'secondSwitch' ? 2 : subDeviceId === 'thirdSwitch' ? 3 : 1,
    });

    // Variables pour la gestion intelligente des clics
    this.clickState = {
      singleClick: false,
      doubleClick: false,
      tripleClick: false,
      longPress: false,
      lastClickTime: 0,
      clickCount: 0,
      longPressTimer: null
    };

    // DÃ©tecter les clics intelligents
    this.on('capability.onoff', async (value) => {
      const now = Date.now();
      const timeDiff = now - this.clickState.lastClickTime;
      
      if (value) { // Appui
        // DÃ©marrer le timer pour l'appui long
        this.clickState.longPressTimer = setTimeout(async () => {
          this.clickState.longPress = true;
          this.log('Appui long dÃ©tectÃ© sur le switch 3 gang');
          
          // DÃ©clencher l'action de l'appui long
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
            this.log('Double clic dÃ©tectÃ© sur le switch 3 gang');
            
            // DÃ©clencher l'action du double clic
            await this.triggerFlow('double_click');
          } else if (this.clickState.clickCount === 3) { // Triple clic
            this.clickState.tripleClick = true;
            this.clickState.doubleClick = false;
            this.log('Triple clic dÃ©tectÃ© sur le switch 3 gang');
            
            // DÃ©clencher l'action du triple clic
            await this.triggerFlow('triple_click');
          } else { // Clic simple
            this.log('Clic simple dÃ©tectÃ© sur le switch 3 gang');
            
            // DÃ©clencher l'action du clic simple
            await this.triggerFlow('single_click');
          }
        } else { // Nouveau clic
          this.clickState.clickCount = 1;
          this.clickState.singleClick = true;
          this.log('Clic simple dÃ©tectÃ© sur le switch 3 gang');
          
          // DÃ©clencher l'action du clic simple
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

    try {
      const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);     
      this.log("Indicator Mode supported by device");
      await this.setSettings({
        indicator_mode: ZCLDataTypes.enum8IndicatorMode.args[0][indicatorMode.indicatorMode].toString()
      });
    } catch (error) {
      this.log("This device does not support Indicator Mode", error);
    }

    if (!this.isSubDevice()) {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
      .catch(err => {
          this.error('Error when reading device attributes ', err);
      });
    }

    // Mettre a jour l'autonomie de la batterie toutes les heures
    this.batteryUpdateInterval = setInterval(async () => {
      await this.updateBatteryAutonomy();
    }, 3600000); // 1 heure
  }

  // MÃ©thode pour mettre a jour l'autonomie de la batterie
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

  // MÃ©thode pour dÃ©clencher les flows
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

  onDeleted(){
    this.log("3 Gang Wall Switch, channel ", subDeviceId, " removed")
    
    // Nettoyer les timers
    if (this.batteryUpdateInterval) {
      clearInterval(this.batteryUpdateInterval);
    }
    if (this.clickState.longPressTimer) {
      clearTimeout(this.clickState.longPressTimer);
    }
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    let parsedValue = 0;
    if (changedKeys.includes('indicator_mode')) {
      parsedValue = parseInt(newSettings.indicator_mode);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
    }
  }

}

module.exports = wall_switch_3_gang;

