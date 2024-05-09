'use strict';

const Homey = require('homey');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

const DEFAULT_ONOFF_DURATION = 1000

/*
reversesd engineered DP's from Tuya:
====================================

1 - Switch
2 - Regulating water volume
3 - Flow state
10 - Weather Delay
11 - Irrigation time

101 - 倒计时剩余时间  countdown time remaining
102 - 倒计时剩余时间设置 countdown remaining time setting
103 - 开到底状态 open to the end
104 - 故障告警 fault alarm
105 - 默认倒计时开启 by default countdown is on
106 - 默认倒计时设置 default countdown settings
107 - 月使用时长 monthly usage time
108 - 月使用水容量 monthly water capacity
109 - 定时灌溉 regular irrigation
110 - 电池电量 battery power

Tuya developer GUI sends:
=========================

switch | Boolean | "{true,false}"
percent_control | Integer | {   "unit": "%",   "min": 0,   "max": 100,   "scale": 0,   "step": 5 }
weather_delay | Enum | {   "range": [     "cancel",     "24h",     "48h",     "72h"   ] }
countdown | Integer | {   "unit": "s",   "min": 0,   "max": 86400,   "scale": 0,   "step": 1
*/

const setDeviceDatapoints = (manufacturerName) => {
  switch (manufacturerName) {
    case "_TZE200_arge1ptm":
    case "_TZE200_xlppj4f5":
      return {
        valve_state_auto_shutdown: 2,
        water_flow: 3,

        shutdown_timer: 11,
        remaining_watering_time: 101,
        valve_state: 102, // countdown | Integer | {   "unit": "s",   "min": 0,   "max": 86400,   "scale": 0,   "step": 1

        last_watering_time: 107,
        battery: 110,

        // DP received but not usefull for Homey
        error: 104,
        max_min: 108,
      };
      break;
  }
};

const dataTypes = {
  raw: 0, // [ bytes ]
  bool: 1, // [0/1]
  value: 2, // [ 4 byte value ]
  string: 3, // [ N byte string ]
  enum: 4, // [ 0-255 ]
  bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  let value = 0;

  for (let i = 0; i < chunks.length; i++) {
    value = value << 8;
    value += chunks[i];
  }

  return value;
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw:
      return dpValue.data;
    case dataTypes.bool:
      return dpValue.data[0] === 1;
    case dataTypes.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
      let dataString = "";
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
};

class SmartWaterTimer extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();

    this.manufacturerName = this.getSetting("zb_manufacturer_name");
    this.dataPoints = setDeviceDatapoints(this.manufacturerName);

    zclNode.endpoints[1].clusters.tuya.on("response", (value) =>
      this.updateInformation(value)
    );

    this.registerCapability("onoff", CLUSTER.ON_OFF);

    this.registerCapabilityListener("onoff", async (value, options) => {
      this.log("value " + value);
      this.log("options " + options.duration);

      if (value == false) {
        value = 0;
      } else {
        value = 100;
      }
      this.writeInteger(this.dataPoints.valve_state, value);
    });

    // Handler for waterflow
    this.registerCapability("measure_water_flow", CLUSTER.SCENES);
    this.registerCapabilityListener("measure_water_flow", async (value, options) => {
      this.log("measure_water_flow value: " + value * 100);
      this.writeInteger(this.dataPoints.valve_state, value * 100);
      if(value <= 0) {
        this.setCapabilityValue("onoff", false);
      } else {
        this.setCapabilityValue("onoff", true);
      }
    });

    // measure_battery // alarm_battery
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].on(
      "attr.batteryPercentageRemaining",
      this.onBatteryPercentageRemainingAttributeReport.bind(this)
    );
  }

  async updateInformation(data) {
    const dp = data.dp;
    const value = getDataValue(data);

    switch (dp) {
      case this.dataPoints.water_flow:
        this.log("Current water flow in %: " + value);
        this.setCapabilityValue("meter_valve_state", value ).catch(
          this.error
        );
        // this.setCapabilityValue("water_flow", Boolean(value));
        break;

      case this.dataPoints.last_watering_time:
        this.log("Duration of the last watering in seconds: " + value);
        this.setCapabilityValue("last_watering_time", value).catch(this.error);
        // this.setCapabilityValue("last_watering_time", value);
        break;

      case this.dataPoints.remaining_watering_time:
        this.log("remaining_watering_time: " + value);
        this.setCapabilityValue("remaining_watering_time", value).catch(
          this.error
        );
        break;

      // case this.dataPoints.valve_state:
      //   this.log("Set valve to %: " + value/100);
      //   this.setCapabilityValue("meter_valve_state", value/100).catch(this.error);
      //   // this.setCapabilityValue("valve_state", value);
      //   break;

      case this.dataPoints.shutdown_timer:
        this.log("Auto shutdown in seconds.: " + value);
        this.setCapabilityValue("shutdown_timer", value).catch(this.error);
        break;

      case this.dataPoints.valve_state_auto_shutdown:
        this.log("Set valve to % with auto shutdown: " + value);
        this.setCapabilityValue("valve_state_auto_shutdown", value).catch(
          this.error
        );
        break;

      case this.dataPoints.battery:
        this.log("battery_level: " + value);
        this.setCapabilityValue(
          "measure_battery",
          value
        ).catch(this.error);
        break;

      default:
        this.log("dp value", dp, value);
    }
  }

  async onDeleted() {
    this.log("Smart Water Timer removed");
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes("valve_state")) {
      this.writeData32(this.dataPoints.valve_state, newSettings["valve_state"]);
    }

    if (changedKeys.includes("shutdown_timer")) {
      this.writeData32(
        this.dataPoints.shutdown_timer,
        newSettings["shutdown_timer"]
      );
    }

    if (changedKeys.includes("valve_state_auto_shutdown")) {
      this.writeData32(
        this.dataPoints.valve_state_auto_shutdown,
        newSettings["valve_state_auto_shutdown"]
      );
    }
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting("batteryThreshold") || 20;
    //override batteryPercentageRemaining...
    batteryPercentageRemaining = this.dataPoints.battery;
    this.log(
      "measure_battery | powerConfiguration - batteryPercentageRemaining (%): ",
      batteryPercentageRemaining
    );
    this.setCapabilityValue(
      "measure_battery",
      batteryPercentageRemaining
    ).catch(this.error);
    this.setCapabilityValue(
      "alarm_battery",
      batteryPercentageRemaining < batteryThreshold ? true : false
    ).catch(this.error);
  }
}

module.exports = SmartWaterTimer;
