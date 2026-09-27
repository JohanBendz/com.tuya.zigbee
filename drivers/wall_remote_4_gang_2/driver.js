'use strict';

const Homey = require('homey');

class WallRemote4Gang2Driver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('wall_remote_4_gang_buttons_2')
      .registerRunListener(async (args, state) => args.button === state.button);
  }

}

module.exports = WallRemote4Gang2Driver;
