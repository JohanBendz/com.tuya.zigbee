'use strict';

const Homey = require('homey');

class SmartRemote1Button2Driver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('smart_remote_1_button_2')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = SmartRemote1Button2Driver;
