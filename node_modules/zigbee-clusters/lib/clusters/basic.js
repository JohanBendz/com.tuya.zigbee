'use strict';

const Cluster = require('../Cluster');
const { ZCLDataTypes } = require('../zclTypes');

const POWER_SOURCES = {
  unknown: 0x00,
  mains: 0x01,
  mains3phase: 0x02,
  battery: 0x03,
  dc: 0x04,
  emergencyMains: 0x05,
  emergencyTransfer: 0x06,
};

const PHYSICAL_ENVIRONMENTS = {
  Unspecified: 0,
  Atrium: 1,
  Bar: 2,
  Courtyard: 3,
  Bathroom: 4,
  Bedroom: 5,
  BilliardRoom: 6,
  UtilityRoom: 7,
  Cellar: 8,
  StorageCloset: 9,
  Theater: 10,
  Office: 11,
  Deck: 12,
  Den: 13,
  DiningRoom: 14,
  ElectricalRoom: 15,
  Elevator: 16,
  Entry: 17,
  FamilyRoom: 18,
  MainFloor: 19,
  Upstairs: 20,
  Downstairs: 21,
  Basement: 22,
  Gallery: 23,
  GameRoom: 24,
  Garage: 25,
  Gym: 26,
  Hallway: 27,
  House: 28,
  Kitchen: 29,
  LaundryRoom: 30,
  Library: 31,
  MasterBedroom: 32,
  MudRoom: 33,
  Nursery: 34,
  Pantry: 35,
  // Office: 36, // Duplicate see zcl specification
  Outside: 37,
  Pool: 38,
  Porch: 39,
  SewingRoom: 40,
  SittingRoom: 41,
  Stairway: 42,
  Yard: 43,
  Attic: 44,
  HotTub: 45,
  LivingRoom: 46,
  Sauna: 47,
  Workshop: 48,
  GuestBedroom: 49,
  GuestBath: 50,
  PowderRoom: 51,
  BackYard: 52,
  FrontYard: 53,
  Patio: 54,
  Driveway: 55,
  SunRoom: 56,
  // LivingRoom: 57, // Duplicate see zcl specification
  Spa: 58,
  Whirlpool: 59,
  Shed: 60,
  EquipmentStorage: 61,
  HobbyRoom: 62,
  Fountain: 63,
  Pond: 64,
  ReceptionRoom: 65,
  BreakfastRoom: 66,
  Nook: 67,
  Garden: 68,
  Balcony: 69,
  PanicRoom: 70,
  Terrace: 71,
  Roof: 72,
  Toilet: 73,
  ToiletMain: 74,
  OutsideToilet: 75,
  ShowerRoom: 76,
  Study: 77,
  FrontGarden: 78,
  BackGarden: 79,
  Kettle: 80,
  Television: 81,
  Stove: 82,
  Microwave: 83,
  Toaster: 84,
  Vacuum: 85,
  Appliance: 86,
  FrontDoor: 87,
  BackDoor: 88,
  FridgeDoor: 89,
  MedicationCabinetDoor: 96,
  WardrobeDoor: 97,
  FrontCupboardDoor: 98,
  OtherDoor: 99,
  WaitingRoom: 100,
  TriageRoom: 101,
  DoctorsOffice: 102,
  PatientsPrivateRoom: 103,
  ConsultationRoom: 104,
  NurseStation: 105,
  Ward: 106,
  Corridor: 107,
  OperatingTheatre: 108,
  DentalSurgeryRoom: 109,
  MedicalImagingRoom: 110,
  DecontaminationRoom: 111,
  Unknown: 255,
};

const ATTRIBUTES = {
  zclVersion: {
    id: 0,
    type: ZCLDataTypes.uint8,
  },
  appVersion: {
    id: 1,
    type: ZCLDataTypes.uint8,
  },
  stackVersion: {
    id: 2,
    type: ZCLDataTypes.uint8,
  },
  hwVersion: {
    id: 3,
    type: ZCLDataTypes.uint8,
  },
  manufacturerName: {
    id: 4,
    type: ZCLDataTypes.string,
  },
  modelId: {
    id: 5,
    type: ZCLDataTypes.string,
  },
  dateCode: {
    id: 6,
    type: ZCLDataTypes.string,
  },
  powerSource: {
    id: 7,
    type: ZCLDataTypes.enum8(POWER_SOURCES),
  },
  appProfileVersion: {
    id: 8,
    type: ZCLDataTypes.uint8,
  },
  locationDesc: {
    id: 16,
    type: ZCLDataTypes.string,
  },
  physicalEnv: {
    id: 17,
    type: ZCLDataTypes.enum8(PHYSICAL_ENVIRONMENTS),
  },
  deviceEnabled: {
    id: 18,
    type: ZCLDataTypes.bool,
  },
  alarmMask: {
    id: 19,
    type: ZCLDataTypes.map8('hardwareFault', 'softwareFault'),
  },
  disableLocalConfig: {
    id: 20,
    type: ZCLDataTypes.map8('factoryResetDisabled', 'configurationDisabled'),
  },
  swBuildId: {
    id: 16384,
    type: ZCLDataTypes.string,
  },
};

const COMMANDS = {
  factoryReset: { id: 0 },
};

class BasicCluster extends Cluster {

  static get ID() {
    return 0;
  }

  static get NAME() {
    return 'basic';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

}

Cluster.addCluster(BasicCluster);

module.exports = BasicCluster;
