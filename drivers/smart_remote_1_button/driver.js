'use strict';

const Homey = require('homey');

class SmartRemoteOneButtonDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('smart_remote_1_button')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = SmartRemoteOneButtonDriver;
