'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class Dimmer3GangTuyaDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Tuya 3 Gang Controller Driver has been initialized');
    
    // Register flow cards
    await this.registerFlowCards();
  }
  
  async registerFlowCards() {
    try {

      // Register flow card for minimum brightness
      this.homey.flow.getActionCard('set_minimum_brightness')
        .registerRunListener(async (args, state) => {
          return args.device.setSettings({ minimumBrightness: args.brightness });
        });
        
      // Register flow card for maximum brightness
      this.homey.flow.getActionCard('set_maximum_brightness')
        .registerRunListener(async (args, state) => {
          return args.device.setSettings({ maximumBrightness: args.brightness });
        });
        
      // Register flow card for power-on behavior
      this.homey.flow.getActionCard('set_power_on_behavior')
        .registerRunListener(async (args, state) => {
          return args.device.setPowerOnState(args.behavior);
        });
        
      // Register flow card for backlight mode
      this.homey.flow.getActionCard('set_backlight_mode')
        .registerRunListener(async (args, state) => {
          return args.device.setBacklightMode(args.mode);
        });
    } catch (err) {
      this.error('Error registering flow cards:', err);
    }
  }

  async onPairListDevices() {
    return this.zigbee.getDevices()
      .filter(device => 
        device.getData().manufacturerName === '_TZE204_1v1dxkck' && 
        device.getData().modelId === 'TS0601'
      )
      .map(device => {
        return [
          {
            name: 'Tuya 3 Gang Controller',
            data: {
              id: device.getData().id,
              manufacturer: device.getData().manufacturerName,
              model: device.getData().modelId,
            },
            capabilities: ['onoff', 'dim'],
            store: { gang: 'firstGang' },
          },
          {
            name: 'Tuya 3 Gang Controller - Second',
            data: {
              id: device.getData().id,
              subDeviceId: 'secondGang',
              manufacturer: device.getData().manufacturerName,
              model: device.getData().modelId,
            },
            capabilities: ['onoff', 'dim'],
            store: { gang: 'secondGang' },
          },
          {
            name: 'Tuya 3 Gang Controller - Third',
            data: {
              id: device.getData().id,
              subDeviceId: 'thirdGang',
              manufacturer: device.getData().manufacturerName,
              model: device.getData().modelId,
            },
            capabilities: ['onoff', 'dim'],
            store: { gang: 'thirdGang' },
          },
        ];
      })
      .flat();
  }
}

module.exports = Dimmer3GangTuyaDriver;