'use strict';

const Homey = require('homey');

class SmartButtonSwitchDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('smart_button_switch_buttons')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = SmartButtonSwitchDriver;
