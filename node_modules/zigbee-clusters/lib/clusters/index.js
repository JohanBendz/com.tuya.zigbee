'use strict';

const Cluster = require('../Cluster');
const BasicCluster = require('./basic');
const PowerConfigurationCluster = require('./powerConfiguration');
const DeviceTemperatureCluster = require('./deviceTemperature');
const IdentifyCluster = require('./identify');
const GroupsCluster = require('./groups');
const ScenesCluster = require('./scenes');
const OnOffCluster = require('./onOff');
const OnOffSwitchCluster = require('./onOffSwitch');
const LevelControlCluster = require('./levelControl');
const AlarmsCluster = require('./alarms');
const TimeCluster = require('./time');
const AnalogInputCluster = require('./analogInput');
const AnalogOutputCluster = require('./analogOutput');
const AnalogValueCluster = require('./analogValue');
const BinaryInputCluster = require('./binaryInput');
const BinaryOutputCluster = require('./binaryOutput');
const BinaryValueCluster = require('./binaryValue');
const MultistateInputCluster = require('./multistateInput');
const MultistateOutputCluster = require('./multistateOutput');
const MultistateValueCluster = require('./multistateValue');
const OTACluster = require('./ota');
const PowerProfileCluster = require('./powerProfile');
const PollControlCluster = require('./pollControl');
const ShadeConfigurationCluster = require('./shadeConfiguration');
const DoorLockCluster = require('./doorLock');
const WindowCoveringCluster = require('./windowCovering');
const ThermostatCluster = require('./thermostat');
const PumpConfigurationAndControlCluster = require('./pumpConfigurationAndControl');
const FanControlCluster = require('./fanControl');
const DehumidificationControlCluster = require('./dehumidificationControl');
const ColorControlCluster = require('./colorControl');
const BallastConfigurationCluster = require('./ballastConfiguration');
const IlluminanceMeasurementCluster = require('./illuminanceMeasurement');
const IlluminanceLevelSensingCluster = require('./illuminanceLevelSensing');
const TemperatureMeasurementCluster = require('./temperatureMeasurement');
const PressureMeasurementCluster = require('./pressureMeasurement');
const FlowMeasurementCluster = require('./flowMeasurement');
const RelativeHumidityCluster = require('./relativeHumidity');
const OccupancySensingCluster = require('./occupancySensing');
const IASZoneCluster = require('./iasZone');
const IASACECluster = require('./iasACE');
const IASWDCluster = require('./iasWD');
const MeteringCluster = require('./metering');
const ElectricalMeasurementCluster = require('./electricalMeasurement');
const DiagnosticsCluster = require('./diagnostics');
const TouchLinkCluster = require('./touchlink');

/**
 * Destructure desired constant properties from Cluster classes.
 * @param {number} ID
 * @param {string} NAME
 * @param {object} ATTRIBUTES
 * @param {object} COMMANDS
 * @returns {Readonly<{ATTRIBUTES: *, COMMANDS: *, ID: *, NAME: *}>}
 * @private
 */
function destructConstProps({
  ID, NAME, ATTRIBUTES, COMMANDS,
}) {
  return Object.freeze({
    ID, NAME, ATTRIBUTES, COMMANDS,
  });
}

module.exports = {
  Cluster,
  BasicCluster, // 0
  PowerConfigurationCluster, // 1
  DeviceTemperatureCluster, // 2
  IdentifyCluster, // 3
  GroupsCluster, // 4
  ScenesCluster, // 5
  OnOffCluster, // 6
  OnOffSwitchCluster, // 7
  LevelControlCluster, // 8
  AlarmsCluster, // 9
  TimeCluster, // 0x000A => 10
  AnalogInputCluster, // 0x000c => 12
  AnalogOutputCluster, // 0x000d => 13
  AnalogValueCluster, // 0x000e => 14
  BinaryInputCluster, // 0x000f => 15
  BinaryOutputCluster, // 0x0010 => 16
  BinaryValueCluster, // 0x0011 => 17
  MultistateInputCluster, // 0x0012 => 18
  MultistateOutputCluster, // 0x0013 => 19
  MultistateValueCluster, // 0x0014 => 20
  OTACluster, // 0x0019 => 25
  PowerProfileCluster, // 0x001a => 26
  PollControlCluster, // 0x0020 => 32
  ShadeConfigurationCluster, // 0x0100 => 256
  DoorLockCluster, // 0x0101 => 257
  WindowCoveringCluster, // 0x0102 => 258
  ThermostatCluster, // 0x0201 => 513
  PumpConfigurationAndControlCluster, // 0x0200 => 512
  FanControlCluster, // 0x0202 => 514
  DehumidificationControlCluster, // 0x0203 => 515
  ColorControlCluster, // 0x0300 => 768
  BallastConfigurationCluster, // 0x0301 => 769
  IlluminanceMeasurementCluster, // 0x0400 => 1024
  IlluminanceLevelSensingCluster, // 0x0401 => 1025
  TemperatureMeasurementCluster, // 0x0402 => 1026
  PressureMeasurementCluster, //  0x0403 => 1027
  FlowMeasurementCluster, // 0x0404 => 1028
  RelativeHumidityCluster, // 0x0405 => 1029
  OccupancySensingCluster, // 0x0406 => 1030
  IASZoneCluster, // 0x0500 => 1280
  IASACECluster, // 0x0501 => 1281
  IASWDCluster, // 0x0502 => 1282
  MeteringCluster, // 0x0702 => 1794
  ElectricalMeasurementCluster, // 0x0b04 => 2820
  DiagnosticsCluster, // 0x0b05 => 2821
  TouchLinkCluster, // 0x1000 => 4096
  CLUSTER: {
    BASIC: destructConstProps(BasicCluster),
    POWER_CONFIGURATION: destructConstProps(PowerConfigurationCluster),
    DEVICE_TEMPERATURE: destructConstProps(DeviceTemperatureCluster),
    IDENTIFY: destructConstProps(IdentifyCluster),
    GROUPS: destructConstProps(GroupsCluster),
    SCENES: destructConstProps(ScenesCluster),
    ON_OFF: destructConstProps(OnOffCluster),
    ON_OFF_SWITCH: destructConstProps(OnOffSwitchCluster),
    LEVEL_CONTROL: destructConstProps(LevelControlCluster),
    ALARMS: destructConstProps(AlarmsCluster),
    TIME: destructConstProps(TimeCluster),
    ANALOG_INPUT: destructConstProps(AnalogInputCluster),
    ANALOG_OUTPUT: destructConstProps(AnalogOutputCluster),
    ANALOG_VALUE: destructConstProps(AnalogValueCluster),
    BINARY_INPUT: destructConstProps(BinaryInputCluster),
    BINARY_OUTPUT: destructConstProps(BinaryOutputCluster),
    BINARY_VALUE: destructConstProps(BinaryValueCluster),
    MULTI_STATE_INPUT: destructConstProps(MultistateInputCluster),
    MULTI_STATE_OUTPUT: destructConstProps(MultistateOutputCluster),
    MULTI_STATE_VALUE: destructConstProps(MultistateValueCluster),
    OTA: destructConstProps(OTACluster),
    POWER_PROFILE: destructConstProps(PowerProfileCluster),
    POLL_CONTROL: destructConstProps(PollControlCluster),
    SHADE_CONFIGURATION: destructConstProps(ShadeConfigurationCluster),
    DOOR_LOCK: destructConstProps(DoorLockCluster),
    WINDOW_COVERING: destructConstProps(WindowCoveringCluster),
    THERMOSTAT: destructConstProps(ThermostatCluster),
    PUMP_CONFIGURATION_AND_CONTROL: destructConstProps(PumpConfigurationAndControlCluster),
    FAN_CONTROL: destructConstProps(FanControlCluster),
    COLOR_CONTROL: destructConstProps(ColorControlCluster),
    BALLAST_CONFIGURATION: destructConstProps(BallastConfigurationCluster),
    ILLUMINANCE_MEASUREMENT: destructConstProps(IlluminanceMeasurementCluster),
    ILLUMINANCE_LEVEL_SENSING: destructConstProps(IlluminanceLevelSensingCluster),
    TEMPERATURE_MEASUREMENT: destructConstProps(TemperatureMeasurementCluster),
    PRESSURE_MEASUREMENT: destructConstProps(PressureMeasurementCluster),
    FLOW_MEASUREMENT: destructConstProps(FlowMeasurementCluster),
    RELATIVE_HUMIDITY_MEASUREMENT: destructConstProps(RelativeHumidityCluster),
    OCCUPANCY_SENSING: destructConstProps(OccupancySensingCluster),
    IAS_ZONE: destructConstProps(IASZoneCluster),
    IAS_ACE: destructConstProps(IASACECluster),
    IAS_WD: destructConstProps(IASWDCluster),
    METERING: destructConstProps(MeteringCluster),
    ELECTRICAL_MEASUREMENT: destructConstProps(ElectricalMeasurementCluster),
    DIAGNOSTICS: destructConstProps(DiagnosticsCluster),
    TOUCHLINK: destructConstProps(TouchLinkCluster),
  },
};
