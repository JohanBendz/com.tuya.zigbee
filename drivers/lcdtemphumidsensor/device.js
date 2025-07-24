/**
 * File: drivers/lcdtemphumidsensor/device.js
 * Version: 6.2.0 - Simplified
 * Description: LCD Temperature & Humidity Sensor driver for TS0201 _TZ3000_ywagc4rj
 * Battery: CR2450, End device - no automatic reporting
 */

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class LcdTempHumidSensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();
    this.log('LCD Temperature & Humidity Sensor v6.2.0 - Simplified');
    
    // Setup listeners for sensor data
    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this._onTemperatureReport.bind(this));
    
    zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
      .on('attr.measuredValue', this._onHumidityReport.bind(this));
    
    // Battery listeners - try both percentage and voltage
    const powerCluster = zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME];
    powerCluster.on('attr.batteryPercentageRemaining', this._onBatteryPercentageReport.bind(this));
    powerCluster.on('attr.batteryVoltage', this._onBatteryVoltageReport.bind(this));
    
    this.log('Device initialized successfully');
  }

  _onTemperatureReport(measuredValue) {
    try {
      const finalValue = Math.round((measuredValue / 100) * 10) / 10; // 1 decimal place
      
      this.log(`Temperature: ${finalValue}°C`);
      this.setCapabilityValue('measure_temperature', finalValue).catch(this.error);
    } catch (error) {
      this.error('Temperature processing error:', error);
    }
  }

  _onHumidityReport(measuredValue) {
    try {
      const baseValue = measuredValue / 10; // Convert from 0.1% units (NOT 0.01%)
      const finalValue = Math.round(Math.max(0, Math.min(100, baseValue)) * 10) / 10; // 1 decimal, clamped
      
      this.log(`Humidity: ${finalValue}%`);
      this.setCapabilityValue('measure_humidity', finalValue).catch(this.error);
    } catch (error) {
      this.error('Humidity processing error:', error);
    }
  }

  _onBatteryPercentageReport(batteryPercentageRemaining) {
    try {
      const batteryPercent = Math.max(0, Math.min(100, Math.round(batteryPercentageRemaining / 2)));
      const isLow = batteryPercent < 20; // Fixed 20% threshold
      
      this.log(`Battery: ${batteryPercent}% (low: ${isLow})`);
      this.setCapabilityValue('measure_battery', batteryPercent).catch(this.error);
      this.setCapabilityValue('alarm_battery', isLow).catch(this.error);
    } catch (error) {
      this.error('Battery percentage processing error:', error);
    }
  }

  _onBatteryVoltageReport(batteryVoltage) {
    try {
      // Convert voltage to percentage (CR2450: 3.0V nominal, 2.0V minimum)
      const voltage = batteryVoltage / 10;
      const batteryPercent = Math.max(0, Math.min(100, Math.round(((voltage - 2.0) / (3.0 - 2.0)) * 100)));
      const isLow = batteryPercent < 20; // Fixed 20% threshold
      
      this.log(`Battery: ${batteryPercent}% (${voltage}V, low: ${isLow})`);
      this.setCapabilityValue('measure_battery', batteryPercent).catch(this.error);
      this.setCapabilityValue('alarm_battery', isLow).catch(this.error);
    } catch (error) {
      this.error('Battery voltage processing error:', error);
    }
  }

  _roundToDecimals(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  onDeleted() {
    this.log('Device removed');
  }
}

module.exports = LcdTempHumidSensor;