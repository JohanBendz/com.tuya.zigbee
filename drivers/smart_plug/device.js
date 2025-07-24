'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');

class smart_plug extends ZigbeeDevice {
  async onInit({zclNode}) {
    this.printNode();
    // Capacité onoff (commutateur)
    this.registerCapability('onoff', 'genOnOff', {
      getOpts: { getOnStart: true, pollInterval: 60000 }
    });
    // Capacité mesure puissance instantanée
    this.registerCapability('measure_power', 'seMetering');
    // Capacité énergie cumulée
    this.registerCapability('meter_power', 'seMetering');
    // Capacité courant
    this.registerCapability('measure_current', 'haElectricalMeasurement');
    // Capacité tension
    this.registerCapability('measure_voltage', 'haElectricalMeasurement');
    // Capacité batterie
    this.registerCapability('measure_battery', 'genPowerCfg');
    // Capacité alarme batterie
    this.registerCapability('alarm_battery', 'genPowerCfg');
  }
}

module.exports = smart_plug;

