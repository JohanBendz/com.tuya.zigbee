'use strict';

/**
 * Tuya Data Points (DP)
 * 
 * This file defines a comprehensive list of Tuya-specific data points for various device types, 
 * such as thermostats, curtains, fans, and switches. These data points (DPs) represent device 
 * capabilities, such as on/off, temperature, brightness, and more.
 * 
 * How to use these Data Points in your driver:
 * 
 * 1. **Import the Data Points**:
 *    Include the necessary set of data points from this file into your `device.js` or driver file.
 *    Example:
 *    const { V1_THERMOSTAT_DATA_POINTS, V1_FAN_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');
 * 
 * 2. **Accessing Data Points**:
 *    Use these data points to refer to specific features or capabilities of the device. For example, 
 *    to control the on/off state of a thermostat, you can use:
 *    const dpOnOff = V1_THERMOSTAT_DATA_POINTS.onOff;
 *    This provides a clear and standardized reference to the associated data point (DP).
 *
 * 3. **Device-Specific Data Points**:
 *    Each device type (e.g., thermostat, curtain motor, fan switch) has its own data points representing 
 *    its functions. Refer to the sections below for details on specific data points for each device type.
 * 
 * 4. **Undocumented Data Points and New Device Types**:
 *    If you encounter undocumented DPs or need to add support for a new device type:
 *    1. Add new DPs to the relevant section or create a new section for the new device type.
 *    2. Follow consistent naming conventions and ensure each DP is commented with its data type 
 *    (e.g., Boolean, Enum) and valid values.
 *    3. Document any specific behavior related to the new device type (e.g., reporting intervals, edge cases).
 *    4. Please share the updates at Github to benefit the community.
 */

// Data points for Thermostat devices, version 1
const V1_THERMOSTAT_DATA_POINTS = {
    onOff: 1, // boolean | 0: off, 1: on
    mode: 2, // enum | 0: manual, 1: auto, 2: holiday
    openWindow: 8, // boolean | 0: off, 1: on
    frostProtection: 10, // boolean | 0: off, 1: on
    targetTemperature: 16, // integer | 5-30 °C (in steps of 0.5°C)
    holidayTemperature: 21, // integer | 5-30 °C (in steps of 0.5°C)
    currentTemperature: 24, // integer | 5-30 °C (in steps of 0.1°C)
    localTemperatureCalibration: 27, // integer | -9 to +9 °C (in steps of 0.1°C)
    batteryLevel: 35, // integer | 0-100 (percentage)
    childLock: 40, // Boolean
    openWindowTemperature: 102, // integer | 5-30 °C (in steps of 0.5°C)
    comfortTemperature: 104, // integer | 5-30 °C (in steps of 0.5°C)
    ecoTemperature: 105, // integer | 5-30 °C (in steps of 0.5°C)
    schedule: 106, // raw | schedule string in 10-minute intervals
    scheduleMonday: 108, // raw | schedule string for Monday
    scheduleWednesday: 109, // raw | schedule string for Wednesday
    scheduleFriday: 110, // raw | schedule string for Friday
    scheduleSunday: 111, // raw | schedule string for Sunday
    scheduleTuesday: 112, // raw | schedule string for Tuesday
    scheduleThursday: 113, // raw | schedule string for Thursday
    scheduleSaturday: 114, // raw | schedule string for Saturday
    workingDay: 31 // enum | 0: Mon-Sun, 1: Mon-Fri/Sat+Sun, 2: Separate
};

// Data points for Thermostatic Radiator Valve devices, version 1
const V1_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS = {
    onOff: 101, // boolean | 0: off, 1: on
    targetTemperature: 103, // integer | °C * 10
};

// Data points for Thermostatic Radiator Valve devices, version 2
const V2_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS = {
    onOff: 1, // boolean | 0: off, 1: on
    mode: 2, // enum | 0: manual, 1: auto, 2: holiday
    targetTemperature: 3, // integer | °C * 10 (e.g., 250 = 25.0°C)
    currentTemperature: 4, // integer | °C * 10 (e.g., 220 = 22.0°C)
    openWindow: 7, // boolean | 0: off, 1: on
    frostProtection: 10, // boolean | 0: off, 1: on
    batteryLevel: 13, // integer | 0-100 (percentage)
    childLock: 14, // boolean | 0: unlocked, 1: locked
    valvePosition: 15, // integer | Valve position in percentage 0-100
    runningState: 16, // enum | 0: idle, 1: heating
    comfortTemperature: 102, // integer | °C * 10 (e.g., 220 = 22.0°C)
    ecoTemperature: 103, // integer | °C * 10 (e.g., 180 = 18.0°C)
    holidayTemperature: 105, // integer | °C * 10 (e.g., 150 = 15.0°C)
    openWindowTemperature: 106, // integer | °C * 10
    presetMode: 107, // enum | 0: schedule, 1: manual, 2: boost, 3: comfort, 4: eco, 5: away
    boostTime: 108, // integer | Boost time in minutes
    autoLock: 109, // boolean | 0: disabled, 1: enabled
    maxTemperature: 110, // integer | °C * 10
    minTemperature: 111, // integer | °C * 10
    workdaysSchedule: 112, // string | Schedule for workdays
    holidaysSchedule: 113 // string | Schedule for holidays
};

// Data points for Curtain Motor devices, version 1
const V1_CURTAIN_MOTOR_DATA_POINTS = {
    position: 2, // integer | 0-100 (percentage, 0: fully closed, 100: fully open)
    arrived: 3, // boolean | 0: false, 1: true (indicates if the motor has arrived at the target position)
    motorReverse: 4 // boolean | 0: forward, 1: reverse (controls motor direction)
};

// Data points for Curtain Motor devices, version 2
const V2_CURTAIN_MOTOR_DATA_POINTS = {
    state: 1, // enum | 0: OPEN, 1: STOP, 2: CLOSE
    position1: 2, // integer | Inverted position percentage, 0: fully open, 100: fully closed
    position2: 3, // integer | Inverted position percentage, 0: fully open, 100: fully closed
    openingMode: 4, // enum | 0: tilt, 1: lift (Have not tested)
    workState: 7, // enum | 0: standby, 1: success, 2: learning (Have not tested)
    battery: 13, // raw | Battery status (Not getting data back for this)
    motorDirection: 101, // enum | 0: normal, 1: reversed
    setUpperLimit: 102, // enum | 0: stop, 1: start
    motorSpeed: 105, // raw | Motor speed
    factoryReset: 107 // setLimit | Factory reset (Have not tested)
};

// Data points for Automated Curtain devices, version 1
const V1_AUTOMATED_CURTAIN_DATA_POINTS = {
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

// Data points for Fan Switch devices, version 1
const V1_FAN_SWITCH_DATA_POINTS = {
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

// Data points for IR Controller devices, version 1
const V1_IR_CONTROLLER_DATA_POINTS = {
    currentTemperature: 101, // Integer | 0-600 | 10x Celsius
    currentHumidity: 102, // Integer | 0-100 | %
    irCommands: 201 // JSON
};

// Data points for Temperature/Humidity Sensor devices, version 1
const V1_TEMPHUMID_SENSOR_DATA_POINTS = {
    currentTemperature: 1, // integer | 0.1°C precision
    currentHumidity: 2, // integer | 0.1% precision
    batteryLevel: 4, // integer | 0-100 (percentage)
    unitConvert: 9, // enum | 0: Celsius, 1: Fahrenheit
    maximumTemperature: 10, // integer | °C
    minimumTemperature: 11, // integer | °C
    maximumHumidity: 12, // integer | %RH
    minimumHumidity: 13, // integer | %RH
    temperatureAlarm: 14, // boolean | 0: off, 1: on
    humidityAlarm: 15, // boolean | 0: off, 1: on
    temperatureReport: 17, // boolean | 0: off, 1: on
    humidityReport: 18, // boolean | 0: off, 1: on
    temperatureSensitivity: 19, // integer | °C sensitivity
    humiditySensitivity: 20 // integer | %RH sensitivity
};

// Data points for Radar Sensor devices, version 1
const V1_RADAR_SENSOR_DATA_POINTS = {
    presenceState: 1, // boolean | 0: no presence, 1: presence detected
    sensitivity: 2, // integer | 0-100 (adjustable sensitivity level)
    minimumRange: 3, // integer | distance in cm
    maximumRange: 4, // integer | distance in cm
    targetDistance: 9, // integer | detected object distance in cm
    detectionDelay: 101, // integer | delay before presence detection is reported (seconds)
    fadingTime: 102, // integer | time in seconds before reporting no presence after movement stops
    illuminanceLux: 104 // integer | ambient light level in lux
};

// Data points for Radar Sensor devices, version 2
const V2_RADAR_SENSOR_DATA_POINTS = {
    illuminanceLux: 104,       // integer | ambient light level in lux
    presenceState: 105,        // boolean | 0: no presence, 1: presence detected
    radarSensitivity: 106,     // integer | sensitivity level (raw value)
    maximumRange: 107,         // integer | distance in meters (divided by 100)
    minimumRange: 108,         // integer | distance in meters (divided by 100)
    targetDistance: 109,       // integer | distance to the detected object in meters (divided by 100)
    fadingTime: 110,           // integer | time in seconds before no presence is reported (divided by 10)
    detectionDelay: 111        // integer | delay in seconds before presence is detected (divided by 10)
};

// Data points for Siren and Temperature/Humidity Sensor devices, version 1
const V1_SIREN_TEMPHUMID_SENSOR_DATA_POINTS = {
    volume: 5, // enum | high, medium, low
    duration: 7, // integer | 0-1800 (seconds)
    alarm: 13, // boolean | on, off
    battery: 15, // integer | 0-100 (percentage)
    melody: 21, // enum | 0-17 (Doorbell 1, For Elise, etc.)
    neoVolume: 116, // enum | high, medium, low
    neoDuration: 103, // integer | 0-1800 (seconds)
    neoAlarm: 104, // boolean | on, off
    neoBattery: 101, // enum | battery_full, battery_high, battery_medium, battery_low, usb
    neoMelody: 102 // enum | 0-17 (Doorbell 1, For Elise, etc.)
};

// Data points for Smoke Sensor devices, version 1
const V1_SMOKE_DATA_POINTS = {
    smokeAlarm: 1, // 0=Smoke Alarm On, 1=Smoke Alarm Off
    tamperAlert: 4,
    batteryState: 14 // dp14 0=20% 1=50% 2=90% [dp=14] battery low, value 2 (FULL)
};

// Data points for Soil Sensor devices, version 1
const V1_SOIL_SENSOR_DATA_POINTS = {
    humidity: 3, // integer | 0-100% (soil moisture level)
    temperature: 5, // integer | temperature in °C or °F (depending on temperatureUnit)
    temperatureUnit: 9, // enum | 0: Celsius, 1: Fahrenheit
    batteryState: 14, // enum | 0: low, 1: warning, 2: good
    batteryPercentage: 15 // integer | 0-100% (battery level)
};

// Data points for Air Quality Detection devices, version 1
const V1_AIR_QUALITY_DATA_POINTS = {
    co2: 2, // Integer | CO2 level
    temperature: 18, // Integer | Temperature (reported in 0.1°C)
    humidity: 19, // Integer | Humidity (reported in 0.1%)
    formaldehyde: 21, // Integer | Formaldehyde level (was reported to be 12)
    voc: 22 // Integer | VOC level    
};

// Data points for Single-switch devices, version 1
const V1_SINGLE_SWITCH_DATA_POINTS = {
    onOff: 1, // Boolean
    countDown: 2, // Integer | 0-86400 seconds
    current: 3, // Integer | 0-30000 mA
    power: 4, // Integer | 0-50000 W
    voltage: 5 // Integer | 0-5000 V
};

// Data points for Multi-switch devices, version 1
const V1_MULTI_SWITCH_DATA_POINTS = {
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

// Data points for Multi-switch devices, version 2
const V2_MULTI_SWITCH_DATA_POINTS = {
    onOffSwitchOne: 1, // Boolean
    onOffSwitchTwo: 2, // Boolean
    onOffSwitchThree: 3, // Boolean
    onOffSwitchFour: 4, // Boolean
    onOffSwitchFive: 5, // Boolean
    onOffSwitchSix: 6, // Boolean
    countdownSwitchOne: 7, // integer | 0-4320 seconds
    countdownSwitchTwo: 8, // integer | 0-4320 seconds
    countdownSwitchThree: 9, // integer | 0-4320 seconds
    countdownSwitchFour: 10, // integer | 0-4320 seconds
    countdownSwitchFive: 11, // integer | 0-4320 seconds
    countdownSwitchSix: 12, // integer | 0-4320 seconds
    masterSwitch: 13, // Boolean
    powerStatusSetting: 14, // Enum | off, on, memory
    indicatorLightStatusSetting: 15, // Enum | none, on, relay, pos
    backlightSwitch: 16, // Boolean
    inchingSwitch: 19, // String
    batteryCapacityUp: 20, // Integer | 0-1000 | pitch of 1 | scale of 0
    actualCurrent: 21, // Integer | 0-30,000 | pitch of 1 | scale of 0 (mA)
    actualVoltage: 22, // Integer | 0-1,000 | pitch of 1 | scale of 1 (V)
    actualPower: 23, // Integer | 0-50,000 | pitch of 1 | scale of 1 (W)
    productionTestResults: 24, // Integer | 0-5 | pitch of 1 | scale of 0
    powerStatisticsCalibration: 25, // Integer | 0-1,000,000 | pitch of 1 | scale of 0
    powerCalibrationFactor: 27, // Integer | 0-1,000,000 | pitch of 1 | scale of 0
    powerStatusSettingSwitchOne: 29, // Enum | off, on, memory
    powerStatusSettingSwitchTwo: 30, // Enum | off, on, memory
    powerStatusSettingSwitchThree: 31, // Enum | off, on, memory
    powerStatusSettingSwitchFour: 32, // Enum | off, on, memory
    powerStatusSettingSwitchFive: 33, // Enum | off, on, memory
    powerStatusSettingSwitchSix: 34, // Enum | off, on, memory
    cycleTimingRaw: 209, // Raw | System DP
    randomTimingRaw: 210 // Raw | System DP
};

// Data points for Dimmer Switch devices, version 1
const V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS = {
    onOff: 1, // Boolean | Controls the on/off
    brightness: 2, // Integer | 10-1000 | Controls the brightness
    minimumBrightness: 3, // Integer | 10-1000
    typeOfLightSource: 4, // Enum | LED, incandescent, halogen
    mode: 5 // Enum | white, color, scene, music
};

// Data points for Multi-gang Dimmer Switch devices, version 1
const V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS = {
    onOffGangOne: 1, // Boolean | On/Off control for first gang
    brightnessGangOne: 2, // Integer | Brightness level for first gang | 0-1000 scale
    minimumBrightnessGangOne: 3, // Integer | Minimum brightness level for first gang | 0-1000 scale
    typeOfLightSourceGangOne: 4, // Enum | Type of light source for first gang | Different light types
    maximumBrightnessGangOne: 5, // Integer | Maximum brightness level for first gang | 0-1000 scale
    countdownGangOne: 6, // Integer | Countdown timer for first gang | 0-4320 seconds
    onOffGangTwo: 7, // Boolean | On/Off control for second gang
    brightnessGangTwo: 8, // Integer | Brightness level for second gang | 0-1000 scale
    minimumBrightnessGangTwo: 9, // Integer | Minimum brightness level for second gang | 0-1000 scale
    typeOfLightSourceGangTwo: 10, // Enum | Type of light source for second gang | Different light types
    maximumBrightnessGangTwo: 11, // Integer | Maximum brightness level for second gang | 0-1000 scale
    countdownGangTwo: 12, // Integer | Countdown timer for second gang | 0-4320 seconds
    powerOnStatusSetting: 14, // Enum | Power on status setting | Off, On, Memory
    switchType: 17 // Enum | Switch type | Various switch types (rocker, momentary, etc.)
};

// Data points for Motion Sensor devices, version 1
const V1_MOTION_SENSOR_DATA_POINTS = {
    pirState: 1, // enum | 0: none, 1: pir (human motion detected)
    batteryPercentage: 4, // integer | 0-100% (battery level)
    pirSensitivity: 9, // enum | low, medium, high | sensitivity level
    pirTime: 10, // enum | 10, 30, 60, 120 | Time in seconds before motion resets (motion inactive time)
    illuminanceValue: 12, // integer | ambient light level in lux (Max Illuminance: 1000 Lux ?)
    intervalTime: 102 // integer | delay in seconds between motion detection events
};

// Data points for Light devices, version 1
const V1_LIGHT_DATA_POINTS = {
    onOff: 1, // Boolean
    mode: 2, // Enum | white, color, scene, music
    whiteDimLevel: 3, // Integer | Range: 10-1000, Pitch: 1, Scale: 0
    colorDimLevel: 4, // Integer | Range: 10-1000, Pitch: 1, Scale: 0
    color: 5, // Hexstring | r:0-255, g:0-255, b:0-255, h:0-360, s:0-255, v:0-255
    effect: 6
};

// Data points for Light devices, version 2
const V2_LIGHT_DATA_POINTS = {
    onOff: 20, // Boolean
    mode: 21, // Enum | white, color, scene, music
    brightness: 22, // Integer | Range: 10-1000, Pitch: 1, Scale: 0
    colorTemperature: 23, // Integer | Range: 0-1000, Pitch: 1, Scale: 0
    color: 24, // Hexstring | h:0-360, s:0-1000, v:0-1000 hsv
    scene: 25, // String | https://developer.tuya.com/en/docs/iot/product-function-definition?id=K9s9rhj576ypf#title-8-DP25%3A%20scene
    timer: 26, // Integer | Range: 0-86400 seconds
    musicSync: 27, // String | https://developer.tuya.com/en/docs/iot/product-function-definition?id=K9s9rhj576ypf#title-10-DP27%3A%20music%20sync
    realtimeAdjustment: 28, // String
    gammaDebug: 29, // String
    biorhythm: 30, // RAW
    lightToSleep: 31, // RAW
    lightToWake: 32, // RAW
    poweroffMemory: 33, // RAW
    doNotDisturb: 34, // RAW
    cycleTiming: 209, // RAW
    vacationTiming: 210 // RAW
};

// Data points for Fingerbot devices, version 1
const V1_FINGER_BOT_DATA_POINTS = {
    onOff: 1,        // Boolean
    mode: 101,       // Enum | 0: click, 1: switch, 2: program
    lowerLimit: 102, // Integer
    upperLimit: 106, // Integer
    delay: 103,      // Integer
    reverse: 104,    // Boolean
    touch: 107,      // Boolean
    battery: 105     // Integer | Battery level percentage
};

// Data points for Rain Sensor devices, version 1
const V1_RAIN_SENSOR_DATA_POINTS = {
    illuminance: 101, // RAW
    illuminance_average_20min: 102, // RAW
    illuminance_maximum_today: 103, // RAW
    cleaning_reminder: 104, // Boolean
    rain_intensity: 105 // RAW
};

module.exports = {
    V1_THERMOSTAT_DATA_POINTS,
    V1_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS,
    V2_THERMOSTATIC_RADIATOR_VALVE_DATA_POINTS,
    V1_CURTAIN_MOTOR_DATA_POINTS,
    V2_CURTAIN_MOTOR_DATA_POINTS,
    V1_AUTOMATED_CURTAIN_DATA_POINTS,
    V1_FAN_SWITCH_DATA_POINTS,
    V1_IR_CONTROLLER_DATA_POINTS,
    V1_TEMPHUMID_SENSOR_DATA_POINTS,
    V1_RADAR_SENSOR_DATA_POINTS,
    V2_RADAR_SENSOR_DATA_POINTS,
    V1_SIREN_TEMPHUMID_SENSOR_DATA_POINTS,
    V1_SMOKE_DATA_POINTS,
    V1_SOIL_SENSOR_DATA_POINTS,
    V1_AIR_QUALITY_DATA_POINTS,
    V1_SINGLE_SWITCH_DATA_POINTS,
    V1_MULTI_SWITCH_DATA_POINTS,
    V2_MULTI_SWITCH_DATA_POINTS,
    V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS,
    V1_MULTI_GANG_DIMMER_SWITCH_DATA_POINTS,
    V1_MOTION_SENSOR_DATA_POINTS,
    V1_LIGHT_DATA_POINTS,
    V2_LIGHT_DATA_POINTS,
    V1_FINGER_BOT_DATA_POINTS,
    V1_RAIN_SENSOR_DATA_POINTS
    // Add new device types here
};
