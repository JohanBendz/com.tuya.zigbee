'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoThermostaticRadiatorValveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AVATTO thermostatic radiator valve driver initialized');
    this._registerActionFlowCards();
  }

  _registerActionFlowCards() {
    this.homey.flow
      .getActionCard('avatto_trv_set_target_temperature')
      .registerRunListener(async args => {
        await args.device.setTargetTemperature(args.temperature);
        return true;
      });

    this.homey.flow
      .getActionCard('avatto_trv_set_preset')
      .registerRunListener(async args => {
        await args.device.setPreset(args.preset);
        return true;
      });
  }
}

module.exports = AvattoThermostaticRadiatorValveDriver;
