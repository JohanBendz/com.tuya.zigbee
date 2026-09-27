'use strict';

const Homey = require('homey');

class HandheldRemote4ButtonsDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('handheld_remote_4_buttons')
      .registerRunListener(async (args, state) => args.button === state.button && args.action === state.action);
  }

}

module.exports = HandheldRemote4ButtonsDriver;
