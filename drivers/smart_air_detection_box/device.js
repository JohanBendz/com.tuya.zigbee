"use strict";

const { Cluster } = require("zigbee-clusters");
const TuyaSpecificCluster = require("../../lib/TuyaSpecificCluster");
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

// Data Points for TS0601 (_TZE200_yvx5lh6k)
const dataPoints = {
    tsCO2: 2,
    tsTemperature: 18,
    tsHumidity: 19,
    tsFormaldehyde: 21,
    tsVOC: 22
};

const dataTypes = {
    raw: 0,
    bool: 1,
    value: 2,
    string: 3,
    enum: 4,
    bitmap: 5,
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    let value = 0;

    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }

    return value;
};

const getDataValue = (dpValue) => {
    switch (dpValue.datatype) {
        case dataTypes.raw:
            return dpValue.data;
        case dataTypes.bool:
            return dpValue.data[0] === 1;
        case dataTypes.value:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(
                dpValue.data
            );
        case dataTypes.string:
            let dataString = "";
            for (let i = 0; i < dpValue.data.length; ++i) {
                dataString += String.fromCharCode(dpValue.data[i]);
            }
            return dataString;
        case dataTypes.enum:
            return dpValue.data[0];
        case dataTypes.bitmap:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(
                dpValue.data
            );
    }
};

class SmartAirDetectionBox extends TuyaSpecificClusterDevice {
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

        zclNode.endpoints[1].clusters.tuya.on("response", (value) =>
            this.handleDataPoint(value)
        );
    }

    async handleDataPoint(data) {
        const dp = data.dp;
        const value = getDataValue(data);

        switch (dp) {
            case dataPoints.tsFormaldehyde:
                // Formaldehyde data point
                this.log("Formaldehyde: ", value);
                this.setCapabilityValue("measure_formaldehyde", value);
                break;
            case dataPoints.tsVOC:
                // VOC data point
                this.log("VOC: ", value);
                this.setCapabilityValue("measure_voc", value);
                break;
            case dataPoints.tsCO2:
                // CO2 data point
                this.log("CO2: ", value);
                this.setCapabilityValue("measure_co2", value);
                break;
            case dataPoints.tsTemperature:
                // Temperature data point
                const temperatureValue = value / 10.0;
                this.log("Temperature: ", temperatureValue);
                this.setCapabilityValue("measure_temperature", temperatureValue);
                break;
            case dataPoints.tsHumidity:
                // Humidity data point
                const humidityValue = value / 10.0;
                this.log("Humidity: ", humidityValue);
                this.setCapabilityValue("measure_humidity", humidityValue);
                break;
            // Add additional cases as necessary
            default:
                this.log("Unhandled Data Point (dp, value):", dp, value);
        }
    }

    onDeleted() {
        this.log("Smart Air Detection Box removed");
    }
}

module.exports = SmartAirDetectionBox;


