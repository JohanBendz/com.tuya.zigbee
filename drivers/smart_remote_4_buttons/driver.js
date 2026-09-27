'use strict';

const Homey = require('homey');

class SmartRemote4ButtonsDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('smart_remote_4_buttons')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = SmartRemote4ButtonsDriver;
