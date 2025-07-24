'use strict';

const { ZigBeeDriver } = require("homey-zigbeedriver");

const RootDevice = require("./device.js");
const SecondSocketDevice = require("./device.secondSocket.js");

class outdoor2socket_driver extends ZigBeeDriver {
  onMapDeviceClass(device) {
    if (device.getData().subDeviceId === "secondSocket") {
      return SecondSocketDevice;
    } else {
      return RootDevice;
    }
  }
}

module.exports = outdoor2socket_driver;
