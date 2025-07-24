'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');

class ThermostaticRadiatorValve extends ZigbeeDevice {
  async onInit({zclNode}) {
    this.printNode();
    this.registerCapability('alarm_battery', 'genPowerCfg');
    this.registerCapability('target_temperature', 'hvacThermostat');
    this.registerCapability('thermostat_preset', 'hvacThermostat');
    this.registerCapability('window_open', 'hvacThermostat');
    this.registerCapability('measure_battery', 'genPowerCfg');
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
  }
}

module.exports = ThermostaticRadiatorValve;


