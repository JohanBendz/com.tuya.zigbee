'use strict';
// Tuya Datapoints
// 
// To use in your driver, add this to your device.js file:
// const { *********_DATA_POINTS } = require('../../lib/TuyaDataPoints');

// Thermostat-specific data points for controlling various thermostat features
const THERMOSTAT_DATA_POINTS = {
    onOff: 1,
    preset: 2,
    openWindow: 8,
    frostProtection: 10,
    targetTemperature: 16,
    holidayTemperature: 21,
    currentTemperature: 24,
    localTemperatureCalibration: 27,
    batteryLevel: 35,
    openWindowTemperature: 102,
    comfortTemperature: 104,
    ecoTemperature: 105,
    schedule: 106,
    scheduleMonday: 108,
    scheduleWednesday: 109,
    scheduleFriday: 110,
    scheduleSunday: 111,
    scheduleTuesday: 112,
    scheduleThursday: 113,
    scheduleSaturday: 114,
    workingDay: 31
};

// Curtain motor-specific data points for controlling various curtain motor features
const CURTAIN_MOTOR_DATA_POINTS = {
    position: 2,
    arrived: 3,
    motorReverse: 4
};

// Automated curtain-specific data points for controlling various curtain features
const AUTOMATED_CURTAIN_DATA_POINTS = {
    curtainSwitchOne: 1, // enum | open, stop, close, continue
    percentControlOne: 2, // integer | 0-100
    accurateCalibrationOne: 3, // enum | start, end
    curtainSwitchTwo: 4, // enum | open, stop, close, continue
    percentControlTwo: 5, // integer | 0-100
    accurateCalibrationTwo: 6, // enum | start, end
    motorSteerOne: 8, // enum | forward, back
    motorSteerTwo: 9, // enum | forward, back
    quickCalibrationOne: 10, // integer | 1-180
    quickCalibrationTwo: 11, // integer | 1-180
    motorModeOne: 12, // enum | strong_power, dry_contact
    motorModeTwo: 13, // enum | strong_power, dry_contact
    lightMode: 14 // enum | relay, pos, none
};

// Fan switch-specific data points for controlling various fan switch features
const FAN_SWITCH_DATA_POINTS = {
    fanSwitch: 1, // Boolean
    fanCountdown: 2, // Integer | 0-86400 seconds
    fanSpeed: 3, // Enum | level_1, level_2, level_3, level_4, level_5
    fanSpeedPercent: 4, // Integer | 1-100
    fanLightSwitch: 5, // Boolean
    brightness: 6, // Integer | 10-1000
    fanLightCountdown: 7, // Integer | 0-86400 seconds
    minBrightness: 8, // Integer | 10-1000
    maxBrightness: 9, // Integer | 10-1000
    mode: 10, // Enum | white
    powerOnStateSetting: 11, // Enum | off, on, memory
    indicatorStatusSetting: 12, // Enum | none, relay, pos
    backlightSwitch: 13 // Boolean
};

// IR controller-specific data points for controlling Universal IR controller features
const IR_CONTROLLER_DATA_POINTS = {
    currentTemperature: 101, // Integer | 0-600 | 10x Celsius
    currentHumidity: 102, // Integer | 0-100 | %
    irCommands: 201 // JSON
};

// Temperature and humidity sensor-specific data points for controlling various temperature and humidity sensor features
const TEMPHUMID_SENSOR_DATA_POINTS = {
    currentTemperature: 1,
    currentHumidity: 2,
    batteryLevel: 4,
    unit_convert: 9,
    maxtemp: 10,
    mintemp: 11,
    maxhum: 12,
    minhum: 13,
    tempalarm: 14,
    humalarm: 15,
    tempreport: 17,
    humreport: 18,
    tempsens: 19,
    humsens:20
};

// Radar sensor-specific data points for controlling various radar sensor features
const RADAR_SENSOR_DATA_POINTS = {
    tshpsPresenceState: 1,
    tshpscSensitivity: 2,
    tshpsMinimumRange: 3,
    tshpsMaximumRange: 4,
    tshpsTargetDistance: 9,
    tshpsDetectionDelay: 101,
    tshpsFadingTime: 102,
    tshpsIlluminanceLux: 104
};

// Siren and temperature/humidity sensor-specific data points for controlling various siren and temperature/humidity sensor features
const SIREN_TEMPHUMID_SENSOR_DATA_POINTS = {
    TUYA_DP_VOLUME: 5,
	TUYA_DP_DURATION: 7,
	TUYA_DP_ALARM: 13,
	TUYA_DP_BATTERY: 15,
	TUYA_DP_MELODY: 21,
	NEO_DP_VOLUME: 116,
	NEO_DP_DURATION: 103,
	NEO_DP_ALARM: 104,
	NEO_DP_BATTERY: 101, //enum
	NEO_DP_MELODY: 102 //enum
};

// Smoke sensor-specific data points for controlling various smoke sensor features
const SMOKE_DATA_POINTS = {
    tsSmokeAlarm: 1, // 0=Smoke Alarm On, 1=Smoke Alarm Off
    tsTamperAlert: 4,
    tsBatteryState: 14 // dp14 0=20% 1=50% 2=90% [dp=14] battery low   value 2 (FULL)
};

// Soil sensor-specific data points for controlling various soil sensor features
const SOIL_SENSOR_DATA_POINTS = {
    humidity: 3,
    temperature: 5,
    temperature_unit: 9,
    battery_state: 14,
    battery: 15
};

// Switch-specific data points for controlling various switch features
const SINGLE_SWITCH_DATA_POINTS = {
    onOff: 1, // Boolean
    countDown: 2, // Integer | 0-86400 seconds
    current: 3, // Integer | 0-30000 mA
    power: 4, // Integer | 0-50000 W
    voltage: 5 // Integer | 0-5000 V
};

// Data points for multi-switch devices
const MULTI_SWITCH_DATA_POINTS = {
    onOffSwitchOne: 1, // Boolean
    onOffSwitchTwo: 2, // Boolean
    onOffSwitchThree: 3, // Boolean
    onOffSwitchFour: 4, // Boolean
    onOffSwitchFive: 5, // Boolean
    onOffSwitchSix: 6, // Boolean
    onOffSwitchSeven: 7, // Boolean
    onOffSwitchEight: 8, // Boolean
    countdownSwitchOne: 9, // integer | 0-86400 seconds
    countdownSwitchTwo: 10, // integer | 0-86400 seconds
    countdownSwitchThree: 11, // integer | 0-86400 seconds
    countdownSwitchFour: 12, // integer | 0-86400 seconds
    countdownSwitchFive: 13, // integer | 0-86400 seconds
    countdownSwitchSix: 14, // integer | 0-86400 seconds
    countdownSwitchSeven: 15, // integer | 0-86400 seconds
    countdownSwitchEight: 16, // integer | 0-86400 seconds
    addElectricity: 17, // Integer | 0-50000 kWh
    current: 18, // Integer | 0-30000 mA
    power: 19, // Integer | 0-50000 W
    voltage: 20, // Integer | 0-5000 V
    testBit: 21, // Integer | 0-5
    voltageCoeff: 22, // Integer | 0-1000000
    currentCoeff: 23, // Integer | 0-1000000
    powerCoeff: 24, // Integer | 0-1000000
    electricityCoeff: 25, // Integer | 0-1000000
    fault: 26,
    powerOnStateSetting: 38, // Enum | off, on, memory
    overchargeSwitch: 39, // Boolean
    indicatorStatusSetting: 40, // Enum | none, on, relay, pos
    childLock: 41 // Boolean
};

// Data points for dimmer switch devices
const SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS = {
    onOff: 1, // Boolean | Controls the on/off
    brightness: 2, // Integer | 10-1000 | Controls the brightness
    minBrightness: 3, // Integer | 10-1000
    lightSourceType: 4, // Enum | LED, incandescent, halogen
    mode: 5, // Enum | white
};

const MULTI_GANG_DIMMER_SWITCH_DATA_POINTS = {
    onOffGangOne: 1, // Boolean | Controls the on/off state of the first gang
    brightnessGangOne: 2, // Integer | 10-1000 | Controls the brightness of the first gang
    onOffGangTwo: 3, // Boolean | Controls the on/off state of the second gang
    brightnessGangTwo: 4, // Integer | 10-1000 | Controls the brightness of the second gang
};

// Data points for motion sensor devices
const MOTION_SENSOR_DATA_POINTS = {
    pir_state: 1,
    battery_percentage: 4,
    interval_time: 102,
    pir_sensitivity: 9,
    pir_time: 10,
    illuminance_value: 12
};

// Data points for light devices, there are at least two versions of light device datapoints
const V1_LIGHT_DATA_POINTS = {
    onOff: 1, // Boolean
    mode: 2, // Enum | white, color, scene, music
    whiteDimLevel: 3, // Integer | Range: 10-1000, Pitch: 1, Scale: 0
    colorDimLevel: 4, // Integer | Range: 10-1000, Pitch: 1, Scale: 0
    color: 5, // Hexstring | r:0-255, g:0-255, b:0-255, h:0-360, s:0-255, v:0-255
    effect: 6
};
const V2_LIGHT_DATA_POINTS = {
    onOff: 20, // Boolean
    mode: 21, // Enum | white, color, scene, music
    bright: 22, // Integer | Range: 10-1000, Pitch: 1, Scale: 0
    colorTemp: 23, // Integer | Range: 10-1000, Pitch: 1, Scale: 0
    color: 24, // Hexstring | h:0-360, s:0-1000, v:0-1000 hsv
    scene: 25, // String
    leftTime: 26, // Integer | Range: 0-86400 seconds
    music: 27, // String
    debugger: 28, // String
    debug: 29, // String
};

module.exports = {
    THERMOSTAT_DATA_POINTS,
    CURTAIN_MOTOR_DATA_POINTS,
    TEMPHUMID_SENSOR_DATA_POINTS,
    RADAR_SENSOR_DATA_POINTS,
    SIREN_TEMPHUMID_SENSOR_DATA_POINTS,
    SMOKE_DATA_POINTS,
    SOIL_SENSOR_DATA_POINTS,
    SINGLE_SWITCH_DATA_POINTS,
    MULTI_SWITCH_DATA_POINTS,
    MOTION_SENSOR_DATA_POINTS,
    V1_LIGHT_DATA_POINTS,
    V2_LIGHT_DATA_POINTS,
    SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS,
    MULTI_GANG_DIMMER_SWITCH_DATA_POINTS,
    AUTOMATED_CURTAIN_DATA_POINTS,
    FAN_SWITCH_DATA_POINTS,
    IR_CONTROLLER_DATA_POINTS
};
