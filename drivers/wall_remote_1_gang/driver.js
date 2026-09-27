'use strict';

const Homey = require('homey');

class WallRemote1GangDriver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('wall_remote_1_gang_buttons')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = WallRemote1GangDriver;
