'use strict';

const Homey = require('homey');

class SmartKnobSwitchDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('smart_knob_switch_button')
      .registerRunListener(async (args, state) => args.button === state.button);
  }

}

module.exports = SmartKnobSwitchDriver;
