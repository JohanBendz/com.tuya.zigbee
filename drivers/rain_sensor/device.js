'use strict';

const { debug, CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_RAIN_SENSOR_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class RainSensor extends TuyaSpecificClusterDevice {
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

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 2, // Report changes greater than 1%
        }
      ]).catch(this.error);
    }

    // alarm_water
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
      this.onIASZoneStatusChangeNotification(payload);
    }

    // measure_battery // alarm_battery
    zclNode.endpoints[1].clusters['genPowerCfg'.NAME]
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

    // Attach event listeners to handle incoming data from Tuya clusters
    zclNode.endpoints[1].clusters.tuya.on("reporting", this.processDatapoint.bind(this));
    zclNode.endpoints[1].clusters.tuya.on("response", this.processDatapoint.bind(this));
    zclNode.endpoints[1].clusters.tuya.on("reportingConfiguration", this.processDatapoint.bind(this));
  }

  onIASZoneStatusChangeNotification({ zoneStatus, extendedStatus, zoneId, delay, }) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_water', zoneStatus.alarm1).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining / 2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(this.error);
    this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining / 2 < batteryThreshold) ? true : false).catch(this.error);
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V1_RAIN_SENSOR_DATA_POINTS.illuminance:
        this.log('Received illuminance:', parsedValue);
        this.setCapabilityValue('measure_luminance', parsedValue).catch(this.error);
        break;

      case V1_RAIN_SENSOR_DATA_POINTS.illuminance_average_20min:
        this.log('Received illuminance (20 min avg.):', parsedValue);
        this.setCapabilityValue('measure_luminance.20min', parsedValue).catch(this.error);
        break;

      case V1_RAIN_SENSOR_DATA_POINTS.illuminance_maximum_today:
        this.log('Received illuminance (max. today):', parsedValue);
        this.setCapabilityValue('measure_luminance.daily_max', parsedValue).catch(this.error);
        break;

      case V1_RAIN_SENSOR_DATA_POINTS.cleaning_reminder:
        this.log('Received cleaning reminder:', parsedValue);
        this.setCapabilityValue('alarm_cleaning', parsedValue !== 0).catch(this.error);
        break;

      case V1_RAIN_SENSOR_DATA_POINTS.rain_intensity:
        this.log('Received rain intensity:', parsedValue);
        this.setCapabilityValue('measure_voltage.rain', parsedValue / 1000).catch(this.error);
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log("Rain sensor removed")
  }

}

module.exports = RainSensor;


