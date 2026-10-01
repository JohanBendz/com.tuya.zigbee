'use strict';

const Homey = require('homey');

class MotionSceneSwitchDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('motion_scene_switch_button')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = MotionSceneSwitchDriver;
