'use strict';

const Homey = require('homey');

class WallRemote3GangDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('wall_remote_3_gang_buttons')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = WallRemote3GangDriver;
