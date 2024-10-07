'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_FINGER_BOT_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);
Cluster.addCluster(TuyaOnOffCluster);

class FingerBotTuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.printNode();

    // Read basic device attributes
    await zclNode.endpoints[1].clusters.basic.readAttributes(
      ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']
    ).catch(err => {
      this.error('Error when reading device attributes:', err.message, err);
    });

    // Register on/off capability listener
    this.registerCapabilityListener('onoff', async (onOff) => {
      try {
        await this.writeBool(V1_FINGER_BOT_DATA_POINTS.onOff, onOff);
        this.log('Finger Bot on/off set to', onOff);
      } catch (e) {
        this.log('Failed to set on/off:', e.message, e);
      }
    });

    // Register finger_bot_mode capability listener
    this.registerCapabilityListener('finger_bot_mode', async (mode) => {
      const modeMapping = {
        'click': 0,
        'switch': 1,
        'program': 2
      };
      const modeValue = modeMapping[mode];
      try {
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode, modeValue);
        this.log('Finger Bot mode set to', mode);
      } catch (e) {
        this.log('Failed to set mode:', e.message, e);
      }
    });

    // Register flow card listener for finger_bot_mode
    this.homey.flow.getActionCard('set_finger_bot_mode')
      .registerRunListener(async (args) => {
        const modeMapping = {
          'click': 0,
          'switch': 1,
          'program': 2
        };
        const modeValue = modeMapping[args.mode];
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode, modeValue);
        this.log('Finger Bot mode set via flow to', args.mode);
        return true;
      });

    // Load settings and send to device
    this._updateSettings();

    // Handle reporting and responses
    zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));
    zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));

    this.log("🚀 Finger Bot initialized!");
  }

  async _updateSettings() {
    const reverse = this.getSetting('reverse') ?? false;
    const lowerLimit = this.getSetting('lower_limit') ?? 50;
    const upperLimit = this.getSetting('upper_limit') ?? 100;
    const delay = this.getSetting('delay') ?? 1;
    const touch = this.getSetting('touch') ?? false;

    // Apply settings to the device
    try {
      if (reverse !== null) await this.writeBool(V1_FINGER_BOT_DATA_POINTS.reverse, reverse);
      if (lowerLimit !== null) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.lowerLimit, lowerLimit);
      if (upperLimit !== null) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.upperLimit, upperLimit);
      if (delay !== null) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.delay, delay);
      if (touch !== null) await this.writeBool(V1_FINGER_BOT_DATA_POINTS.touch, touch);
      
      this.log('Settings applied to Finger Bot');
    } catch (e) {
      this.log('Error applying settings to Finger Bot:', e.message, e);
    }
  }

  // Process incoming datapoint reports or responses
  async processResponse(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);

    switch (dp) {
      case V1_FINGER_BOT_DATA_POINTS.onOff:
        await this.setCapabilityValue('onoff', parsedValue);
        break;
      case V1_FINGER_BOT_DATA_POINTS.mode:
        await this.setCapabilityValue('finger_bot_mode', ['click', 'switch', 'program'][parsedValue]);
        break;
      case V1_FINGER_BOT_DATA_POINTS.battery:
        await this.setCapabilityValue('measure_battery', parsedValue);
        break;
      default:
        this.log(`Unknown datapoint ${dp}:`, parsedValue);
    }
  }

  // Apply new settings when they are changed by the user
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await this._updateSettings();
  }

  onDeleted() {
    this.log('Finger Bot device removed');
  }
}

module.exports = FingerBotTuya;
