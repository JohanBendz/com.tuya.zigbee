'use strict';

const { Cluster, BoundCluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const dataPoints = {
  POWER_MODE: 0x65,
  MELODY: 0x66,
  DURATION: 0x67,
  ALARM: 0x68,
  TEMPERATURE: 0x69,
  HUMIDITY: 0x6A,
  TEMP_MIN: 0x6B,
  TEMP_MAX: 0x6C,
  HUM_MIN: 0x6D,
  HUM_MAX: 0x6E,
  TEMP_UNIT: 0x70,
  TEMP_ALARM: 0x71,
  HUM_ALARM: 0x72,
  VOLUME: 0x74,

  // Optional on some Tuya variants only.
  // TUYA_BATTERY_PERCENTAGE: 0x0F,
};

const dataTypes = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

const melodiesMapping = new Map();
melodiesMapping.set(0, 'Doorbell 1');
melodiesMapping.set(1, 'For Elise');
melodiesMapping.set(2, 'Westminster');
melodiesMapping.set(3, '4 Key Chime');
melodiesMapping.set(4, 'William Tell');
melodiesMapping.set(5, 'Mozart Piano');
melodiesMapping.set(6, 'Space Alarm');
melodiesMapping.set(7, 'Klaxon');
melodiesMapping.set(8, 'Meep meep');
melodiesMapping.set(9, 'Wheep');
melodiesMapping.set(10, 'Barking dog');
melodiesMapping.set(11, 'Alarm Siren');
melodiesMapping.set(12, 'Doorbell 2');
melodiesMapping.set(13, 'Old Phone');
melodiesMapping.set(14, 'Police Siren');
melodiesMapping.set(15, 'Evacuation bell');
melodiesMapping.set(16, 'Clock alarm');
melodiesMapping.set(17, 'Fire alarm');

const volumeMapping = new Map();
volumeMapping.set('high', { volume: 100, tuya: 0 });
volumeMapping.set('medium', { volume: 66, tuya: 1 });
volumeMapping.set('low', { volume: 33, tuya: 2 });

const ZIGBEE_EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0);
const ZCL_STATUS_SUCCESS = 0x00;
const ZCL_STATUS_UNSUPPORTED_ATTRIBUTE = 0x86;
const ZCL_TYPE_UTC_TIME = 0xE2;
const ZCL_TYPE_BITMAP8 = 0x18;
const ZCL_TYPE_INT32 = 0x2B;

const convertMultiByteNumberPayloadToSingleDecimalNumber = chunks => {
  let value = 0;

  for (let i = 0; i < chunks.length; i++) {
    value <<= 8;
    value += chunks[i];
  }

  return value;
};

const getDataValue = dpValue => {
  if (!dpValue || !dpValue.data) return null;

  switch (dpValue.datatype) {
    case dataTypes.raw:
      return dpValue.data;
    case dataTypes.bool:
      return dpValue.data[0] === 1;
    case dataTypes.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string: {
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    }
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    default:
      return null;
  }
};

class SirenTimeBoundCluster extends BoundCluster {

  async readAttributes({ attributes }) {
    const chunks = [];

    for (const attributeId of attributes) {
      switch (attributeId) {
        case 0x0007: { // localTime
          const localTime =
            Math.floor((Date.now() - ZIGBEE_EPOCH_MS) / 1000) +
            (-new Date().getTimezoneOffset() * 60);

          const buf = Buffer.alloc(8);
          buf.writeUInt16LE(0x0007, 0);
          buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
          buf.writeUInt8(ZCL_TYPE_UTC_TIME, 3);
          buf.writeUInt32LE(localTime >>> 0, 4);
          chunks.push(buf);
          break;
        }

        case 0x0000: { // time
          const utcTime = Math.floor((Date.now() - ZIGBEE_EPOCH_MS) / 1000);

          const buf = Buffer.alloc(8);
          buf.writeUInt16LE(0x0000, 0);
          buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
          buf.writeUInt8(ZCL_TYPE_UTC_TIME, 3);
          buf.writeUInt32LE(utcTime >>> 0, 4);
          chunks.push(buf);
          break;
        }

        case 0x0001: { // timeStatus
          const buf = Buffer.alloc(5);
          buf.writeUInt16LE(0x0001, 0);
          buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
          buf.writeUInt8(ZCL_TYPE_BITMAP8, 3);
          buf.writeUInt8(0x02, 4); // synchronized
          chunks.push(buf);
          break;
        }

        case 0x0002: { // timeZone
          const timeZone = -new Date().getTimezoneOffset() * 60;

          const buf = Buffer.alloc(8);
          buf.writeUInt16LE(0x0002, 0);
          buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
          buf.writeUInt8(ZCL_TYPE_INT32, 3);
          buf.writeInt32LE(timeZone, 4);
          chunks.push(buf);
          break;
        }

        default: {
          const buf = Buffer.alloc(3);
          buf.writeUInt16LE(attributeId, 0);
          buf.writeUInt8(ZCL_STATUS_UNSUPPORTED_ATTRIBUTE, 2);
          chunks.push(buf);
          break;
        }
      }
    }

    return {
      attributes: Buffer.concat(chunks),
    };
  }
}

class sensortemphumidsensor extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();

    this._timeBoundCluster = null;

    await this.ensureCapability('measure_temperature');
    await this.ensureCapability('measure_humidity');
    // await this.ensureCapability('measure_battery');
    await this.ensureCapability('alarm_battery');
    await this.ensureCapability('alarm_siren');

    this._registerTimeBoundCluster(zclNode);
    this._registerTuyaListeners(zclNode);

    this.registerCapabilityListener('onoff', async value => {
      this.log('onoff:', value);
      await this.writeBool(dataPoints.ALARM, value);

      this.homey.setTimeout(() => {
        this.queryAll().catch(this.error);
      }, 1200);
    });

    this.homey.setTimeout(() => {
      this.bootstrap().catch(this.error);
    }, 5000);
  }

  _registerTimeBoundCluster(zclNode) {
    try {
      if (typeof zclNode?.endpoints?.[1]?.bind === 'function') {
        this._timeBoundCluster = new SirenTimeBoundCluster();
        zclNode.endpoints[1].bind('time', this._timeBoundCluster);
        this.log('Registered Time bound cluster (0x000A)');
      }
    } catch (err) {
      this.error('Failed to register Time bound cluster', err);
    }
  }

  _registerTuyaListeners(zclNode) {
    const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster) {
      this.error('Tuya cluster not available on endpoint 1');
      return;
    }

    tuyaCluster.on('response', data => {
      this.processTuyaMessage('response', data).catch(this.error);
    });

    tuyaCluster.on('reporting', data => {
      this.processTuyaMessage('reporting', data).catch(this.error);
    });

    tuyaCluster.on('datapoint', data => {
      this.processTuyaMessage('datapoint', data).catch(this.error);
    });

    tuyaCluster.on('reportingConfiguration', data => {
      this.processTuyaMessage('reportingConfiguration', data).catch(this.error);
    });

    tuyaCluster.on('timeSync', data => {
      this.onTuyaTimeSync(data).catch(this.error);
    });

    tuyaCluster.on('mcuVersionResponse', data => {
      this.onMcuVersionResponse(data).catch(this.error);
    });
  }

  async ensureCapability(capabilityId) {
    if (!this.hasCapability(capabilityId)) {
      await this.addCapability(capabilityId);
    }
  }

  async bootstrap() {
    await this.bootstrapBasicRead();
    await this.forceCelsiusMode();
    await this.sendMcuVersionRequest();
    await this.queryAll();
  }

  async bootstrapBasicRead() {
    try {
      const basicCluster = this.zclNode?.endpoints?.[1]?.clusters?.basic;
      if (!basicCluster) return;

      this.log('Bootstrap read: basic cluster');

      const result = await basicCluster.readAttributes([
        'manufacturerName',
        'zclVersion',
        'appVersion',
        'modelId',
        'powerSource',
        'attributeReportingStatus',
      ]);

      this.log('Bootstrap read result:', result);
    } catch (error) {
      this.error('Bootstrap read failed', error);
    }
  }

  async forceCelsiusMode() {
    try {
      this.log('Setting Tuya temperature unit DP 0x70 => Celsius');
      await this.writeBool(dataPoints.TEMP_UNIT, true);
    } catch (error) {
      this.error('Failed to set Celsius mode', error);
    }
  }

  async sendMcuVersionRequest() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster || typeof tuyaCluster.mcuVersionRequest !== 'function') {
        this.log('Tuya mcuVersionRequest not available');
        return;
      }

      const payload = Buffer.from([0x00, this.transactionID & 0xff]);
      this.transactionID += 1;

      this.log('Sending Tuya mcuVersionRequest (0x10), payload=', payload);
      await tuyaCluster.mcuVersionRequest({ payload });
    } catch (error) {
      this.error('Failed to send Tuya mcuVersionRequest', error);
    }
  }

  async queryAll() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster || typeof tuyaCluster.dataQuery !== 'function') {
        this.log('Tuya dataQuery not available');
        return;
      }

      this.log('Sending Tuya dataQuery (0x03)');
      await tuyaCluster.dataQuery({});
    } catch (error) {
      this.error('Failed to send Tuya dataQuery', error);
    }
  }

  async onTuyaTimeSync(data) {
    this.log('[Tuya timeSync request] raw=', data);

    try {
      const utcSeconds = Math.floor(Date.now() / 1000);
      const localSeconds = utcSeconds - (new Date().getTimezoneOffset() * 60);

      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds >>> 0, 0);
      payload.writeUInt32BE(localSeconds >>> 0, 4);

      this.log(
        '[Tuya timeSync response] utc=',
        utcSeconds,
        'local=',
        localSeconds,
        'payload=',
        payload,
      );

      await this.zclNode.endpoints[1].clusters.tuya.timeSync({ payload });

      this.homey.setTimeout(() => {
        this.queryAll().catch(this.error);
      }, 500);
    } catch (error) {
      this.error('Failed to respond to Tuya timeSync request', error);
    }
  }

  async onMcuVersionResponse(data) {
    this.log('[Tuya mcuVersionResponse 0x11] raw=', data);

    if (data?.payload?.length) {
      const payload = Buffer.from(data.payload);
      const versionByte = payload[payload.length - 1];
      this.log('[Tuya mcuVersionResponse 0x11] versionByte=', versionByte);
    }

    this.homey.setTimeout(() => {
      this.queryAll().catch(this.error);
    }, 500);
  }

  async processTuyaMessage(source, data) {
    const dp = data?.dp;
    const measuredValue = getDataValue(data);

    this.log(
      `[Tuya ${source}] dp=${dp} datatype=${data?.datatype} value=`,
      measuredValue,
      'raw=',
      data,
    );

    switch (dp) {
      case dataPoints.ALARM:
        await this.safeSetCapabilityValue('onoff', !!measuredValue);
        await this.safeSetCapabilityValue('alarm_siren', !!measuredValue);
        break;

      case dataPoints.TEMPERATURE:
        this.reportTemperatureCapacity(measuredValue);
        break;

      case dataPoints.HUMIDITY:
        this.reportHumidityCapacity(measuredValue);
        break;

      case dataPoints.POWER_MODE:
        this.handlePowerMode(measuredValue);
        break;

      case dataPoints.VOLUME:
        await this.safeSetSettings({ alarmvolume: String(measuredValue) });
        break;

      case dataPoints.DURATION:
        await this.safeSetSettings({ alarmsoundtime: measuredValue });
        break;

      case dataPoints.MELODY:
        await this.safeSetSettings({ alarmtune: String(measuredValue) });
        break;

/*       case dataPoints.TUYA_BATTERY_PERCENTAGE:
        this.reportBatteryPercentageCapacity(measuredValue);
        break; */

      case dataPoints.TEMP_UNIT:
      case dataPoints.TEMP_ALARM:
      case dataPoints.HUM_ALARM:
      case dataPoints.TEMP_MIN:
      case dataPoints.TEMP_MAX:
      case dataPoints.HUM_MIN:
      case dataPoints.HUM_MAX:
        this.log(`Known DP ${dp}, current value:`, measuredValue);
        break;

      default:
        this.log(`UNHANDLED Tuya ${source}: dp=${dp}, value=${measuredValue}`, data);
        break;
    }
  }

  handlePowerMode(measuredValue) {
    switch (measuredValue) {
      case 0:
      case 1:
        this.log('Power mode: battery');
        this.reportAlarmBatteryCapacity(false);
        break;

      case 2:
      case 3:
      case 4:
        this.log('Power mode: dc/usb');
        this.reportAlarmBatteryCapacity(false);
        break;

      default:
        this.log('Unknown power mode:', measuredValue);
        break;
    }
  }

  async safeSetCapabilityValue(capabilityId, value) {
    try {
      await this.setCapabilityValue(capabilityId, value);
    } catch (error) {
      this.error(`Failed to set capability ${capabilityId} to ${value}`, error);
    }
  }

  async safeSetSettings(settings) {
    try {
      await this.setSettings(settings);
    } catch (error) {
      this.error('Failed to update settings', settings, error);
    }
  }

  reportHumidityCapacity(measuredValue) {
    const humidityOffset = Number(this.getSetting('humidity_offset') || 0);
    const parsedValue = Number(measuredValue);

    this.log(
      'measure_humidity | relative humidity:',
      parsedValue,
      '+ humidity offset',
      humidityOffset,
    );

    this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this.error);
  }

  reportTemperatureCapacity(measuredValue) {
    const temperatureOffset = Number(this.getSetting('temperature_offset') || 0);
    const parsedValue = Number(measuredValue) / 10;

    this.log(
      'measure_temperature | temperature:',
      parsedValue,
      '+ temperature offset',
      temperatureOffset,
    );

    this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
  }

/*   reportBatteryPercentageCapacity(measuredValue) {
    const parsedValue = Number(measuredValue);

    this.log('measure_battery | battery percentage remaining:', parsedValue, '%');
    this.setCapabilityValue('measure_battery', parsedValue).catch(this.error);
  } */

  reportAlarmBatteryCapacity(measuredValue) {
    this.log('alarm_battery | battery alarm:', measuredValue);
    this.setCapabilityValue('alarm_battery', measuredValue).catch(this.error);
  }

  async onSettings({ newSettings, changedKeys }) {
    for (const updatedSetting of changedKeys) {
      switch (updatedSetting) {
        case 'alarmvolume':
          await this.sendAlarmVolume(Number(newSettings[updatedSetting]));
          break;

        case 'alarmsoundtime':
          await this.sendAlarmDuration(Number(newSettings[updatedSetting]));
          break;

        case 'alarmtune':
          await this.sendAlarmTune(Number(newSettings[updatedSetting]));
          break;

        default:
          break;
      }
    }
  }

  async sendAlarmVolume(volume) {
    this.log('Sending alarm volume:', volume);
    await this.writeEnum(dataPoints.VOLUME, volume);
  }

  async sendAlarmDuration(duration) {
    this.log('Sending alarm duration:', duration, 's');
    await this.writeData32(dataPoints.DURATION, duration);
  }

  async sendAlarmTune(tune) {
    this.log('Sending alarm tune:', melodiesMapping.get(tune), '(', tune, ')');
    await this.writeEnum(dataPoints.MELODY, tune);
  }

  onDeleted() {
    this.log('sensortemphumidsensor removed');
  }
}

module.exports = sensortemphumidsensor;