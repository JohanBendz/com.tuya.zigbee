'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const UnmappedDpLogLimiter = require('./unmapped-dp-log');

Cluster.addCluster(TuyaSpecificCluster);

/**
 * BEOK TGM50-ZB-WP floor-heating wall thermostat.
 *
 * Issue #1447 interview: manufacturer `_TZE204_cvub6xbb`, model `TS0601`,
 * mains router, endpoint 1 input clusters 0, 4, 5, 61184 and output
 * clusters 25 (OTA) and 10 (Time). There is no Thermostat cluster 0x0201.
 *
 * This driver is intentionally separate from `wall_thermostat`. That profile
 * is the BHT-002 map, where datapoint 2 is the manual/programming mode and
 * the setpoint is datapoint 16. On this thermostat datapoint 2 is the
 * setpoint. Do not add `_TZE204_cvub6xbb` there (#1479, #1501).
 *
 * Datapoint map, confirmed against:
 * - Zigbee2MQTT model TGM50-ZB (tuya.ts, manufacturers `_TZE204_mwomyz5n`,
 *   `_TZE204_cvub6xbb`, `_TZE284_cvub6xbb`), timeStart "1970"
 * - ZHA quirk for `_TZE204_cvub6xbb` / `_TZE284_cvub6xbb`
 *
 * Only `_TZE204_cvub6xbb` is manifested. The other two manufacturer IDs are
 * in those external converters and have no Homey interview here.
 *
 * DP1   bool   system mode, true = heat / on, false = off
 * DP2   value  setpoint °C × 10, range 5–35, step 0.5
 * DP3   value  measured temperature °C × 10
 * DP4   enum   preset 0 manual, 1 auto, 3 eco (2 is not defined)
 * DP9   bool   child lock
 * DP15  value  maximum temperature °C × 10, Zigbee2MQTT range 15–90, step 0.5
 * DP19  value  calibration °C × 10, signed, range -9.9–9.9, step 0.1
 * DP101 enum   running state, 0 idle, 1 heat
 * DP102 bool   frost protection
 * DP105 bool   button sound (ZHA only; absent from the Zigbee2MQTT exposes)
 * DP106 enum   sensor 0 internal, 1 external, 2 both
 * DP107 value  hysteresis °C × 10, range 0.5–10, step 0.5
 * DP110 enum   backlight 0 off, 1 low, 2 medium, 3 high
 *
 * Not exposed, and never written: DP103 factory reset, DP111 relay invert.
 * Floor-probe temperature, window detection, power-loss memory and the weekly
 * schedule have no confirmed datapoint. Any other datapoint is logged through
 * the same 60-second limiter as `wall_thermostat`, including DP103 and DP111.
 *
 * The shared `thermostat_preset` capability is not used. Its values are
 * 0 Automatic, 1 Manual, 3 Holiday, which do not match this preset enum.
 * `thermostat_heating` is the read-only capability also added by AVATTO
 * TRV PR #1535; the JSON is the same so either pull request can merge first.
 *
 * Time: Tuya command 0x24 is answered like `lcdtemphumidsensor_3`, with an
 * 8-byte big-endian Unix payload (UTC then local) and an explicit payloadSize.
 * Nothing is written during init. A reply is sent only after the device asks.
 */

const DP = {
  systemMode: 1,
  setpoint: 2,
  localTemperature: 3,
  preset: 4,
  childLock: 9,
  maxTemperature: 15,
  calibration: 19,
  runningState: 101,
  frostProtection: 102,
  sound: 105,
  sensor: 106,
  hysteresis: 107,
  backlight: 110,
};

const PRESET_VALUES = {
  0: '0',
  1: '1',
  3: '3',
};

const SENSOR_VALUES = {
  0: '0',
  1: '1',
  2: '2',
};

const BACKLIGHT_VALUES = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
};

const CAPABILITIES = [
  'onoff',
  'target_temperature',
  'measure_temperature',
  'beok_tgm50_preset',
  'thermostat_heating',
  'child_lock',
  'temp_calibration',
];

class BeokTgm50WallThermostat extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    if (zclNode) this.zclNode = zclNode;
    this._unmappedDpLogLimiter = this._unmappedLogger();

    await this._ensureCapabilities();

    this.registerCapabilityListener('onoff', value => this.setOnOff(value));
    this.registerCapabilityListener('target_temperature', value => this.setTargetTemperature(value));
    this.registerCapabilityListener('beok_tgm50_preset', value => this.setPreset(value));
    this.registerCapabilityListener('child_lock', value => this.setChildLock(value));
    this.registerCapabilityListener('temp_calibration', value => this.setCalibration(value));

    this._registerTuyaListeners(this.zclNode);
    this.log('BEOK TGM50 floor-heating thermostat initialized');
  }

  async _ensureCapabilities() {
    for (const capabilityId of CAPABILITIES) {
      if (!this.hasCapability(capabilityId)) {
        await this.addCapability(capabilityId);
      }
    }
  }

  _registerTuyaListeners(zclNode) {
    const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.error('Tuya cluster not available on endpoint 1');
      return;
    }

    const onData = data => {
      this.processDatapoint(data).catch(err => this.error('Failed to process Tuya datapoint', err));
    };

    tuyaCluster.on('reporting', onData);
    tuyaCluster.on('response', onData);
    tuyaCluster.on('datapoint', onData);
    tuyaCluster.on('reportingConfiguration', onData);
    tuyaCluster.on('timeSync', data => {
      this.onTuyaTimeSync(data).catch(err => this.error('Tuya timeSync failed', err));
    });
  }

  /**
   * Tuya MCU time, Unix epoch (Zigbee2MQTT timeStart "1970").
   * Four big-endian UTC seconds followed by four big-endian local seconds.
   * payloadSize is required by TuyaSpecificCluster on zigbee-clusters 2.4.1.
   */
  async onTuyaTimeSync(data) {
    const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster || typeof tuyaCluster.timeSync !== 'function') {
      this.error('Tuya timeSync command not available');
      return;
    }

    const utcSeconds = Math.floor(Date.now() / 1000);
    const localSeconds = utcSeconds - (new Date().getTimezoneOffset() * 60);
    const payload = Buffer.alloc(8);
    payload.writeUInt32BE(utcSeconds >>> 0, 0);
    payload.writeUInt32BE(localSeconds >>> 0, 4);

    this.log(
      'Tuya timeSync response timeStart=1970 utc=',
      utcSeconds,
      'local=',
      localSeconds,
      'request=',
      data
    );

    await tuyaCluster.timeSync({
      payloadSize: payload.length,
      payload,
    });
  }

  async setOnOff(onOff) {
    const enabled = !!onOff;
    await this._commitCapability('onoff', enabled, () => this.writeBool(DP.systemMode, enabled));
  }

  async setTargetTemperature(celsius) {
    const clamped = this._clampStep(celsius, 5, 35, 0.5);
    const raw = Math.round(clamped * 10);
    await this._commitCapability(
      'target_temperature',
      clamped,
      () => this.writeData32(DP.setpoint, raw)
    );
  }

  async setPreset(preset) {
    const numeric = this._enumValue(preset, PRESET_VALUES, 'preset');
    await this._commitCapability(
      'beok_tgm50_preset',
      PRESET_VALUES[numeric],
      () => this.writeEnum(DP.preset, numeric)
    );
  }

  async setChildLock(locked) {
    const enabled = !!locked;
    await this._commitCapability('child_lock', enabled, () => this.writeBool(DP.childLock, enabled));
  }

  async setCalibration(celsius) {
    const clamped = this._clampStep(celsius, -9.9, 9.9, 0.1);
    const raw = Math.round(clamped * 10);
    const encoded = raw < 0 ? raw + 0x100000000 : raw;
    await this._commitCapability(
      'temp_calibration',
      clamped,
      () => this.writeData32(DP.calibration, encoded)
    );
  }

  async onSettings({ newSettings, changedKeys }) {
    for (const key of changedKeys) {
      switch (key) {
        case 'sensorSelect': {
          const numeric = this._enumValue(newSettings.sensorSelect, SENSOR_VALUES, 'sensor');
          await this._commitSetting(
            'sensorSelect',
            SENSOR_VALUES[numeric],
            () => this.writeEnum(DP.sensor, numeric)
          );
          break;
        }
        case 'hysteresis': {
          const celsius = this._clampStep(newSettings.hysteresis, 0.5, 10, 0.5);
          await this._commitSetting(
            'hysteresis',
            celsius,
            () => this.writeData32(DP.hysteresis, Math.round(celsius * 10))
          );
          break;
        }
        case 'maxTemperature': {
          const celsius = this._clampStep(newSettings.maxTemperature, 15, 90, 0.5);
          await this._commitSetting(
            'maxTemperature',
            celsius,
            () => this.writeData32(DP.maxTemperature, Math.round(celsius * 10))
          );
          break;
        }
        case 'frostProtection': {
          const enabled = !!newSettings.frostProtection;
          await this._commitSetting(
            'frostProtection',
            enabled,
            () => this.writeBool(DP.frostProtection, enabled)
          );
          break;
        }
        case 'backlightMode': {
          const numeric = this._enumValue(newSettings.backlightMode, BACKLIGHT_VALUES, 'backlight');
          await this._commitSetting(
            'backlightMode',
            BACKLIGHT_VALUES[numeric],
            () => this.writeEnum(DP.backlight, numeric)
          );
          break;
        }
        case 'soundEnabled': {
          const enabled = !!newSettings.soundEnabled;
          await this._commitSetting(
            'soundEnabled',
            enabled,
            () => this.writeBool(DP.sound, enabled)
          );
          break;
        }
        default:
          break;
      }
    }
  }

  async processDatapoint(data) {
    const dp = data?.dp;
    let parsed;
    try {
      parsed = getDataValue(data);
    } catch (err) {
      this._unmappedLogger().record(dp, data?.data);
      return;
    }

    switch (dp) {
      case DP.systemMode:
        await this._setCapability('onoff', parsed === true || parsed === 1);
        return;

      case DP.setpoint:
        await this._setScaledTemperature('target_temperature', parsed, 5, 35, 0.5);
        return;

      case DP.localTemperature:
        await this._setScaledTemperature('measure_temperature', parsed, -50, 100, 0.1);
        return;

      case DP.preset: {
        const preset = PRESET_VALUES[parsed];
        if (preset === undefined) {
          this.log('Ignoring unknown BEOK preset', parsed);
          return;
        }
        await this._setCapability('beok_tgm50_preset', preset);
        return;
      }

      case DP.childLock:
        await this._setCapability('child_lock', parsed === true || parsed === 1);
        return;

      case DP.maxTemperature:
        await this._setScaledSetting('maxTemperature', parsed, 15, 90, 0.5);
        return;

      case DP.calibration:
        await this._setScaledTemperature('temp_calibration', parsed, -9.9, 9.9, 0.1);
        return;

      case DP.runningState:
        if (parsed === 1 || parsed === true) {
          await this._setCapability('thermostat_heating', true);
        } else if (parsed === 0 || parsed === false) {
          await this._setCapability('thermostat_heating', false);
        } else {
          this.log('Ignoring unknown BEOK running state', parsed);
        }
        return;

      case DP.frostProtection:
        await this._setSetting('frostProtection', parsed === true || parsed === 1);
        return;

      case DP.sound:
        await this._setSetting('soundEnabled', parsed === true || parsed === 1);
        return;

      case DP.sensor: {
        const sensor = SENSOR_VALUES[parsed];
        if (sensor === undefined) {
          this.log('Ignoring unknown BEOK sensor select', parsed);
          return;
        }
        await this._setSetting('sensorSelect', sensor);
        return;
      }

      case DP.hysteresis:
        await this._setScaledSetting('hysteresis', parsed, 0.5, 10, 0.5);
        return;

      case DP.backlight: {
        const backlight = BACKLIGHT_VALUES[parsed];
        if (backlight === undefined) {
          this.log('Ignoring unknown BEOK backlight', parsed);
          return;
        }
        await this._setSetting('backlightMode', backlight);
        return;
      }

      default:
        this._unmappedLogger().record(dp, parsed);
    }
  }

  async _setScaledTemperature(capabilityId, raw, min, max, step) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      this.log('Ignoring non-numeric temperature datapoint', capabilityId, raw);
      return;
    }
    await this._setCapability(capabilityId, this._clampStep(raw / 10, min, max, step));
  }

  async _setScaledSetting(id, raw, min, max, step) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      this.log('Ignoring non-numeric setting datapoint', id, raw);
      return;
    }
    await this._setSetting(id, this._clampStep(raw / 10, min, max, step));
  }

  async _commitCapability(capabilityId, next, write) {
    const previous = this.getCapabilityValue(capabilityId);
    if (previous !== next) {
      await this.setCapabilityValue(capabilityId, next);
    }
    try {
      await write();
    } catch (err) {
      if (previous !== next) {
        try {
          await this.setCapabilityValue(capabilityId, previous);
        } catch (restoreErr) {
          this.error(`Failed to roll back ${capabilityId}`, restoreErr);
        }
      }
      throw err;
    }
  }

  async _commitSetting(id, next, write) {
    const previous = this.getSetting(id);
    if (previous !== next) {
      await this.setSettings({ [id]: next });
    }
    try {
      await write();
    } catch (err) {
      if (previous !== next) {
        try {
          await this.setSettings({ [id]: previous });
        } catch (restoreErr) {
          this.error(`Failed to roll back setting ${id}`, restoreErr);
        }
      }
      throw err;
    }
  }

  async _setCapability(capabilityId, value) {
    if (this.getCapabilityValue(capabilityId) === value) return;
    try {
      await this.setCapabilityValue(capabilityId, value);
    } catch (err) {
      this.error(`Failed to set ${capabilityId}`, err);
    }
  }

  async _setSetting(id, value) {
    try {
      if (this.getSetting(id) === value) return;
      await this.setSettings({ [id]: value });
    } catch (err) {
      this.error(`Failed to store setting ${id}`, err);
    }
  }

  _enumValue(value, allowed, label) {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || allowed[numeric] === undefined) {
      throw new Error(`Invalid BEOK ${label}: ${value}`);
    }
    return numeric;
  }

  _clampStep(value, min, max, step) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new Error(`Invalid number: ${value}`);
    }
    const clamped = Math.min(max, Math.max(min, numeric));
    const steps = Math.round((clamped - min) / step);
    const stepped = min + (steps * step);
    return Math.round(stepped * 10) / 10;
  }

  _unmappedLogger() {
    if (!this._unmappedDpLogLimiter) {
      this._unmappedDpLogLimiter = new UnmappedDpLogLimiter((...args) => this.log(...args));
    }
    return this._unmappedDpLogLimiter;
  }

  onDeleted() {
    this.log('BEOK TGM50 floor-heating thermostat removed');
  }

}

module.exports = BeokTgm50WallThermostat;
