'use strict';

const Homey = require('homey');

class WallRemote4Gang3Driver extends Homey.Driver {

  async onInit() {
    this.buttonTrigger = this.homey.flow
      .getDeviceTriggerCard('wall_remote_4_gang_buttons_3')
      .registerRunListener(async (args, state) => args.action === state.action);
  }

}

module.exports = WallRemote4Gang3Driver;
