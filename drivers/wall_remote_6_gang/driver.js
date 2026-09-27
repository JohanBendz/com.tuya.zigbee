'use strict';

const Homey = require('homey');

class WallRemote6GangDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('wall_remote_6_gang_buttons')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = WallRemote6GangDriver;
