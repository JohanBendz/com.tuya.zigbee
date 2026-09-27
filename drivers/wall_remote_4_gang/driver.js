'use strict';

const Homey = require('homey');

class WallRemote4GangDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('wall_remote_4_gang_buttons')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = WallRemote4GangDriver;
