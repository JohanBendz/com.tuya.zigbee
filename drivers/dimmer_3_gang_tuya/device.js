'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue, setPowerOnStatus } = require('../../lib/TuyaHelpers');
const { V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class Dimmer3GangTuya extends TuyaSpecificClusterDevice {
  async _readAndUpdateState(dpOnOff, dpDim) {
    try {
      this.log(`Reading initial state for DPs: ${dpOnOff}, ${dpDim}`);
      
      // Instead of using readBool and readData32 which don't exist, 
      // we'll set default values and wait for device reports
      
      // Default initial values
      let onOffStateValue = false;
      let dimStateValue = 0;
      
      // Try to get values from store if available
      const storedOnOff = this.getStoreValue(`dp${dpOnOff}_value`);
      const storedDim = this.getStoreValue(`dp${dpDim}_value`);
      
      if (storedOnOff !== undefined && storedOnOff !== null) {
        onOffStateValue = storedOnOff;
        this.log(`Retrieved OnOff state from store (DP ${dpOnOff}):`, onOffStateValue);
      } else {
        this.log(`No stored OnOff state, using default (DP ${dpOnOff}):`, onOffStateValue);
      }
      
      if (storedDim !== undefined && storedDim !== null) {
        dimStateValue = storedDim;
        this.log(`Retrieved Dim state from store (DP ${dpDim}):`, dimStateValue);
      } else {
        this.log(`No stored Dim state, using default (DP ${dpDim}):`, dimStateValue);
      }
      
      // Set the capability values
      await this.setCapabilityValue("onoff", onOffStateValue).catch(this.error);
      await this.setCapabilityValue("dim", dimStateValue / 1000).catch(this.error);
      
      this.log('Waiting for device reports to update actual state...');
    } catch (err) {
      this.error("Error reading initial device state:", err);
      // Avoid crashing init if reading fails, log error and continue
    }
  }

  async onNodeInit({ zclNode }) {
    this.printNode();
    debug(false); // Enable detailed logs
    // this.enableDebug();

    // Register flow cards
    this.registerFlowCards();

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // Read and store firmware version and other attributes
    const attributes = await zclNode.endpoints[1].clusters.basic
      .readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource'])
      .catch(err => {
        this.error('Error reading device attributes:', err);
        return {};
      });

    if (attributes.appVersion) {
      this.setStoreValue('firmwareVersion', attributes.appVersion).catch(this.error);
      this.log('Firmware version:', attributes.appVersion);
    } else {
      this.log('Firmware version not available');
    }

    if (this.isSubDevice()) {
      if (subDeviceId === 'secondGang') {
        await this._setupGang(
          zclNode,
          'second controller',
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo,
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo
        );
        // Read initial state after setup
        await this._readAndUpdateState(
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo,
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo
        );
      } else if (subDeviceId === 'thirdGang') {
        await this._setupGang(
          zclNode,
          "third controller",
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangThree,
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangThree
        );
        // Read initial state after setup
        await this._readAndUpdateState(
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangThree,
          V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangThree
        );
      }
    } else {
      await this._setupGang(
        zclNode,
        'first controller',
        V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne,
        V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne
      );

      // Initialize power on state (default to 'memory' if not set)
      const currentPowerOnState = this.getStoreValue('powerOnState') || 'memory';
      await this.setPowerOnState(currentPowerOnState);
    }

    if (!this.hasListenersAttached) {
      zclNode.endpoints[1].clusters.tuya.on('reporting', async (value) => {
        try {
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      zclNode.endpoints[1].clusters.tuya.on('response', async (value) => {
        try {
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      this.hasListenersAttached = true;
    }
  }

  async _setupGang(zclNode, controllerName, dpOnOff, dpDim) {
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`Sending onoff ${controllerName}:`, value);
      await this._writeWithRetry(dpOnOff, value, 'bool', controllerName);
    });

    this.registerCapabilityListener('dim', async (value) => {
      const level = Math.floor(value * 1000); // Scale to 0-1000
      this.log(`Sending level ${controllerName}:`, level);
      try {
        // Optimization: Only send brightness command if level > 0, device likely turns on implicitly.
        // Send onoff command only when turning off (level === 0) or explicitly toggling onoff.
        if (level > 0) {
          await this._writeWithRetry(dpDim, level, 'data32', controllerName);
          // Ensure Homey capability reflects the intended state, even if device handles on implicitly
          if (!this.getCapabilityValue('onoff')) {
            await this.setCapabilityValue('onoff', true);
          }
        } else { // level === 0
          this.log(`Level is 0, turning off ${controllerName}`);
          await this._writeWithRetry(dpOnOff, false, 'bool', controllerName);
          await this.setCapabilityValue('onoff', false);
          // Optionally send level 0 after turning off, if needed by device
          // await this._writeWithRetry(dpDim, 0, 'data32', controllerName);
        }
      } catch (err) {
        this.error(`Error adjusting level for ${controllerName}:`, err);
        throw err;
      }
    });
  }

  // Method to configure the powerOnState internally
  async setPowerOnState(value) {
    const powerOnValue = { off: 0, on: 1, memory: 2 }[value];
    if (powerOnValue === undefined) {
      this.error('Invalid power on state value:', value);
      return;
    }
    try {
      await setPowerOnStatus(this, powerOnValue);
      await this.setStoreValue('powerOnState', value);
      this.log('Power on state set to:', value);
    } catch (err) {
      this.error('Error setting power on state:', err);
    }
  }

  // Method to configure the backlightMode
  async setBacklightMode(value) {
    const backlightValue = { off: 0, normal: 1, inverted: 2 }[value];
    if (backlightValue === undefined) {
      this.error('Invalid backlight mode value:', value);
      return;
    }
    try {
      await this.writeEnum(V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.backlightMode, backlightValue);
      await this.setStoreValue('backlightMode', value);
      this.log('Backlight mode set to:', value);
    } catch (err) {
      this.error('Error setting backlight mode:', err);
    }
  }

  // Updates settings when changed in the app
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings were changed');

    if (changedKeys.includes('powerOnState')) {
      await this.setPowerOnState(newSettings.powerOnState);
    }

    if (changedKeys.includes('backlightMode')) {
      await this.setBacklightMode(newSettings.backlightMode);
    }

    if (changedKeys.includes('minimumBrightness')) {
      const gangNumber = this.isSubDevice() ? 
        this.getData().subDeviceId === 'secondGang' ? 2 : 
        this.getData().subDeviceId === 'thirdGang' ? 3 : 1 : 1;
      
      const dp = gangNumber === 1 ? V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.minimumBrightnessGangOne :
                 gangNumber === 2 ? V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.minimumBrightnessGangTwo :
                 gangNumber === 3 ? V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.minimumBrightnessGangThree : null;
      
      if (dp) {
        const minValue = Math.floor(newSettings.minimumBrightness * 1000);
        await this.writeData32(dp, minValue);
        this.log(`Minimum brightness for gang ${gangNumber} set to ${minValue}`);
      }
    }

    if (changedKeys.includes('maximumBrightness')) {
      const gangNumber = this.isSubDevice() ? 
        this.getData().subDeviceId === 'secondGang' ? 2 : 
        this.getData().subDeviceId === 'thirdGang' ? 3 : 1 : 1;
      
      const dp = gangNumber === 1 ? V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.maximumBrightnessGangOne :
                 gangNumber === 2 ? V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.maximumBrightnessGangTwo :
                 gangNumber === 3 ? V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.maximumBrightnessGangThree : null;
      
      if (dp) {
        const maxValue = Math.floor(newSettings.maximumBrightness * 1000);
        await this.writeData32(dp, maxValue);
        this.log(`Maximum brightness for gang ${gangNumber} set to ${maxValue}`);
      }
    }
  }

  registerFlowCards() { // Register flow card for minimum brightness
    this._setMinimumBrightnessAction = this.homey.flow.getActionCard('set_minimum_brightness');
    this._setMinimumBrightnessAction.registerRunListener(async (args, state) => {
      const brightness = args.brightness / 100; // Convert from % to 0-1
      await this.setSettings({ minimumBrightness: brightness });
      return true;
    });

    // Register flow card for maximum brightness
    this._setMaximumBrightnessAction = this.homey.flow.getActionCard('set_maximum_brightness');
    this._setMaximumBrightnessAction.registerRunListener(async (args, state) => {
      const brightness = args.brightness / 100; // Convert from % to 0-1
      await this.setSettings({ maximumBrightness: brightness });
      return true;
    });

    // Register flow card for power-on behavior
    this._setPowerOnBehaviorAction = this.homey.flow.getActionCard('set_power_on_behavior');
    this._setPowerOnBehaviorAction.registerRunListener(async (args, state) => {
      await this.setPowerOnState(args.behavior);
      return true;
    });

    // Register flow card for backlight mode
    this._setBacklightModeAction = this.homey.flow.getActionCard('set_backlight_mode');
    this._setBacklightModeAction.registerRunListener(async (args, state) => {
      await this.setBacklightMode(args.mode);
      return true;
    });
  }

  async _writeWithRetry(dp, value, type, controllerName, retries = 2, timeout = 15000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.log(`Attempt ${attempt} to write ${type} to DP ${dp} for ${controllerName}:`, value);
        const writeMethod = type === 'bool' ? this.writeBool : this.writeData32;
        return await Promise.race([
          writeMethod.call(this, dp, value),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
      } catch (err) {
        this.error(`Attempt ${attempt} failed for DP ${dp} (${controllerName}):`, err);
        if (attempt === retries) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    // Store the value for future use (added this line)
    await this.setStoreValue(`dp${dp}_value`, parsedValue).catch(this.error);

    switch (dp) {
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangOne:
        if (!this.isSubDevice()) {
          const newValue = parsedValue === true || parsedValue === 1;
          if (this.getCapabilityValue("onoff") !== newValue) {
            this.log(`Updating capability 'onoff' for Gang 1 to: ${newValue}`);
            await this.setCapabilityValue("onoff", newValue).catch(this.error);
          } else {
            this.log(`Capability 'onoff' for Gang 1 already has value: ${newValue}, skipping update.`);
          }
        }
        break;
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangOne:
        if (!this.isSubDevice()) {
          const newValue = parsedValue / 1000;
          // Ensure value is within 0-1 range
          const clampedValue = Math.max(0, Math.min(1, newValue)); 
          if (this.getCapabilityValue("dim") !== clampedValue) {
            this.log(`Updating capability 'dim' for Gang 1 to: ${clampedValue}`);
            await this.setCapabilityValue("dim", clampedValue).catch(this.error);
          } else {
            this.log(`Capability 'dim' for Gang 1 already has value: ${clampedValue}, skipping update.`);
          }
        }
        break;
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.minimumBrightnessGangOne:
        if (!this.isSubDevice()) {
          const minBrightness = parsedValue / 1000;
          await this.setSettings({ minimumBrightness: minBrightness });
          this.log('Minimum brightness for Gang 1 set to:', minBrightness);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.maximumBrightnessGangOne:
        if (!this.isSubDevice()) {
          const maxBrightness = parsedValue / 1000;
          await this.setSettings({ maximumBrightness: maxBrightness });
          this.log('Maximum brightness for Gang 1 set to:', maxBrightness);
        }
        break;
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangTwo:
        if (this.isSubDevice() && this.getData().subDeviceId === "secondGang") {
          const newValue = parsedValue === true || parsedValue === 1;
          if (this.getCapabilityValue("onoff") !== newValue) {
            this.log(`Updating capability 'onoff' for Gang 2 to: ${newValue}`);
            await this.setCapabilityValue("onoff", newValue).catch(this.error);
          } else {
            this.log(`Capability 'onoff' for Gang 2 already has value: ${newValue}, skipping update.`);
          }
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangTwo:
        if (this.isSubDevice() && this.getData().subDeviceId === "secondGang") {
          const newValue = parsedValue / 1000;
          // Ensure value is within 0-1 range
          const clampedValue = Math.max(0, Math.min(1, newValue));
          if (this.getCapabilityValue("dim") !== clampedValue) {
            this.log(`Updating capability 'dim' for Gang 2 to: ${clampedValue}`);
            await this.setCapabilityValue("dim", clampedValue).catch(this.error);
          } else {
            this.log(`Capability 'dim' for Gang 2 already has value: ${clampedValue}, skipping update.`);
          }
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.minimumBrightnessGangTwo:
        if (this.isSubDevice() && this.getData().subDeviceId === 'secondGang') {
          const minBrightness = parsedValue / 1000;
          await this.setSettings({ minimumBrightness: minBrightness });
          this.log('Minimum brightness for Gang 2 set to:', minBrightness);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.maximumBrightnessGangTwo:
        if (this.isSubDevice() && this.getData().subDeviceId === 'secondGang') {
          const maxBrightness = parsedValue / 1000;
          await this.setSettings({ maximumBrightness: maxBrightness });
          this.log('Maximum brightness for Gang 2 set to:', maxBrightness);
        }
        break;
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.onOffGangThree:
        if (this.isSubDevice() && this.getData().subDeviceId === "thirdGang") {
          const newValue = parsedValue === true || parsedValue === 1;
          if (this.getCapabilityValue("onoff") !== newValue) {
            this.log(`Updating capability 'onoff' for Gang 3 to: ${newValue}`);
            await this.setCapabilityValue("onoff", newValue).catch(this.error);
          } else {
            this.log(`Capability 'onoff' for Gang 3 already has value: ${newValue}, skipping update.`);
          }
        }
        break;
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.brightnessGangThree:
        if (this.isSubDevice() && this.getData().subDeviceId === "thirdGang") {
          const newValue = parsedValue / 1000;
          // Ensure value is within 0-1 range
          const clampedValue = Math.max(0, Math.min(1, newValue));
          if (this.getCapabilityValue("dim") !== clampedValue) {
            this.log(`Updating capability 'dim' for Gang 3 to: ${clampedValue}`);
            await this.setCapabilityValue("dim", clampedValue).catch(this.error);
          } else {
            this.log(`Capability 'dim' for Gang 3 already has value: ${clampedValue}, skipping update.`);
          }
        }
        break;
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.minimumBrightnessGangThree:
        if (this.isSubDevice() && this.getData().subDeviceId === 'thirdGang') {
          const minBrightness = parsedValue / 1000;
          await this.setSettings({ minimumBrightness: minBrightness });
          this.log('Minimum brightness for Gang 3 set to:', minBrightness);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.maximumBrightnessGangThree:
        if (this.isSubDevice() && this.getData().subDeviceId === 'thirdGang') {
          const maxBrightness = parsedValue / 1000;
          await this.setSettings({ maximumBrightness: maxBrightness });
          this.log('Maximum brightness for Gang 3 set to:', maxBrightness);
        }
        break;
      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.powerOnStatusSetting:
        this.log('Received power on state:', parsedValue);
        if (!this.isSubDevice()) {
          const powerOnMap = { 0: 'off', 1: 'on', 2: 'memory' };
          const state = powerOnMap[parsedValue];
          await this.setStoreValue('powerOnState', state).catch(this.error);
          this.log('Power on state updated in store:', state);
        }
        break;

      case V2_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS.backlightMode:
        this.log('Received backlight mode:', parsedValue);
        if (!this.isSubDevice()) {
          const backlightMap = { 0: 'off', 1: 'normal', 2: 'inverted' };
          const mode = backlightMap[parsedValue];
          await this.setStoreValue('backlightMode', mode).catch(this.error);
          this.log('Backlight mode updated in store:', mode);
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    this.log('3 Gang controller removed');
  }
}

module.exports = Dimmer3GangTuya;