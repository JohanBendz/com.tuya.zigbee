"use strict";

const Homey = require("homey");

const { debug, Cluster } = require("zigbee-clusters");
const TuyaSpecificCluster = require("../../lib/TuyaSpecificCluster");
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { V1_TANK_LEVEL_MONITOR_DATA_POINTS } = require("../../lib/TuyaDataPoints");

// Add custom cluster handling for Tuya-specific messages
Cluster.addCluster(TuyaSpecificCluster);

const TANK_STATE = {
  1: "low",
  0: "normal",
  2: "full",
};

const dp_lookup = {
  distance_to_top: V1_TANK_LEVEL_MONITOR_DATA_POINTS.distanceToTop,
  distance_to_bottom: V1_TANK_LEVEL_MONITOR_DATA_POINTS.distanceToBottom,
  min_level: V1_TANK_LEVEL_MONITOR_DATA_POINTS.minLevel,
  max_level: V1_TANK_LEVEL_MONITOR_DATA_POINTS.maxLevel,
};

class TankLevelMonitorDevice extends TuyaSpecificClusterDevice {
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit({ zclNode }) {
    zclNode.endpoints[1].clusters.tuya.on("response", (value) => this.handleUpdate(value));

    await zclNode.endpoints[1].clusters.basic
      .readAttributes([
        "manufacturerName",
        "zclVersion",
        "appVersion",
        "modelId",
        "powerSource",
        "attributeReportingStatus",
      ])
      .catch((err) => {
        this.error("Error when reading device attributes ", err);
      });

    await this.initTankMonitor();
  }

  // Initialize tank monitor with app settings on startup
  async initTankMonitor() {
    const settings = await this.getSettings();
    const keys = Object.keys(settings);
    await this.updateParams(keys, settings);
  }

  // Write the app settings to the Tank Level Monitor
  async updateParams(keys, settings) {
    for (const key of keys) {
      const dp = dp_lookup[key];
      if (dp) {
        const value = settings[key];
        if (value) {
          console.log(`Writing DP ${dp} with value ${value}`);
          await this.writeData32(dp, value);
        }
      }
    }
  }

  async handleUpdate(data) {
    const dp = data.dp;
    switch (dp) {
      case V1_TANK_LEVEL_MONITOR_DATA_POINTS.liquidLevelState:
        const state_value = data.data.readUInt8(0);
        const state = TANK_STATE[state_value];
        if (state) {
          this.log("State", state);
          this.setCapabilityValue("tank_state", state).catch(this.error);
        }
        break;
      case V1_TANK_LEVEL_MONITOR_DATA_POINTS.liquidLevel:
        const liquidLevel = data.data.readUInt32BE(0);
        this.log("Level", liquidLevel);
        this.setCapabilityValue("liquid_level", liquidLevel).catch(this.error);
        break;
      case V1_TANK_LEVEL_MONITOR_DATA_POINTS.liquidLevelFill:
        const fill = data.data.readUInt32BE(0);
        this.log("Level Fill", fill);
        this.setCapabilityValue("liquid_level_fill", fill).catch(this.error);
        break;
      case V1_TANK_LEVEL_MONITOR_DATA_POINTS.distanceToBottom:
        const distance_to_bottom = data.data.readUInt32BE(0);
        this.log("Distance to bottom", distance_to_bottom);
        break;
      case V1_TANK_LEVEL_MONITOR_DATA_POINTS.distanceToTop:
        const distance_to_top = data.data.readUInt32BE(0);
        this.log("Distance to top", distance_to_top);
        break;
      case V1_TANK_LEVEL_MONITOR_DATA_POINTS.minLevel:
        const minLevel = data.data.readUInt32BE(0);
        this.log("Min", minLevel);
        break;
      case V1_TANK_LEVEL_MONITOR_DATA_POINTS.maxLevel:
        const maxLevel = data.data.readUInt32BE(0);
        this.log("Max", maxLevel);
        break;
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log("TankLevelMonitor has been added");
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await this.updateParams(changedKeys, newSettings);
    this.log("TankLevelMonitor settings where changed");
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log("TankLevelMonitor was renamed");
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log("TankLevelMonitor has been deleted");
  }
}

module.exports = TankLevelMonitorDevice;
