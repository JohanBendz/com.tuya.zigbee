'use strict';

const Homey = require('homey');

class DoorbellButtonDriver extends Homey.Driver {

  async onInit() {
    this.pressTrigger = this.homey.flow.getDeviceTriggerCard('doorbell_button_pressed');
  }

}

module.exports = DoorbellButtonDriver;
