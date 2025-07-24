'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V2_RADAR_SENSOR_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class radarSensor2 extends TuyaSpecificClusterDevice {
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
/*     debug(true);
    this.enableDebug(); */

    // Initialize the flow card for target distance changes
    this.targetDistanceTrigger = this.homey.flow.getDeviceTriggerCard('target_distance_changed');

    // Read and log device attributes
    await this._readDeviceAttributes(zclNode);

    // Attach event listeners for Tuya-specific reports (manual state changes)
    if (!this.hasListenersAttached) {
      zclNode.endpoints[1].clusters.tuya.on('reporting', async (value) => {
        try {
          this.log('Received reporting:', value);
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      zclNode.endpoints[1].clusters.tuya.on('response', async (value) => {
        try {
          this.log('Received response:', value);
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      this.hasListenersAttached = true;
    }
  }

  async _readDeviceAttributes(zclNode) {
    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']);
    } catch (err) {
      this.error('Error when reading device attributes:', err);
    }
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V2_RADAR_SENSOR_DATA_POINTS.presenceState:
        this.log('Received presence state:', parsedValue);
        await this.setCapabilityValue('alarm_motion', parsedValue === true || parsedValue === 1).catch(this.error);
        break;

      case V2_RADAR_SENSOR_DATA_POINTS.radarSensitivity:
        this.log('Received radar sensitivity:', parsedValue);
        break;

      case V2_RADAR_SENSOR_DATA_POINTS.illuminanceLux:
        this.log('Received illuminance value:', parsedValue);
        this.onIlluminanceMeasuredAttributeReport(parsedValue);
        break;

      case V2_RADAR_SENSOR_DATA_POINTS.targetDistance:
        const distanceUpdateInterval = this.getSetting('distance_update_interval') ?? 10;
        if (new Date().getSeconds() % distanceUpdateInterval === 0) {
          this.setCapabilityValue('target_distance', parsedValue / 100).catch(this.error); // converting to meters
          // Trigger the custom flow card for target distance change
          await this.targetDistanceTrigger.trigger(this, { target_distance: parsedValue / 100 }).catch(this.error);
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    try {
      if (changedKeys.includes('radar_sensitivity')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.radarSensitivity, newSettings['radar_sensitivity']);
      }
      if (changedKeys.includes('minimum_range')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.minimumRange, newSettings['minimum_range'] * 100); // convert to centimeters
      }
      if (changedKeys.includes('maximum_range')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.maximumRange, newSettings['maximum_range'] * 100); // convert to centimeters
      }
      if (changedKeys.includes('detection_delay')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.detectionDelay, newSettings['detection_delay']);
      }
      if (changedKeys.includes('fading_time')) {
        await this.writeData32(V2_RADAR_SENSOR_DATA_POINTS.fadingTime, newSettings['fading_time']);
      }
    } catch (error) {
      this.error('Error in onSettings:', error);
    }
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    this.log('measure_luminance | Luminance - measuredValue (lux):', measuredValue);
    this.setCapabilityValue('measure_luminance', measuredValue).catch(this.error);
  }

  onDeleted() {
    this.log('Radar sensor removed');
  }
}

module.exports = radarSensor2;


