'use strict';

const { Cluster, BoundCluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');

Cluster.addCluster(TuyaSpecificCluster);

/**
 * AVATTO / Tuya TS0601 thermostatic radiator valve.
 *
 * Zigbee2MQTT model TS0601_thermostat_14
 * (zigbee-herdsman-converters src/devices/tuya.ts, manufacturers
 * _TZE204_vjpaih9f and _TZE284_vjpaih9f).
 *
 * This is a separate driver from thermostatic_radiator_valve. That driver
 * uses a different map (target temperature on DP 16, measured temperature
 * on DP 24). Do not add these manufacturers there.
 *
 * Encoding follows this app's Tuya writers (bool / enum / uint32 BE) and
 * getDataValue(). Zigbee2MQTT divideBy10 is the same as value/10 on read
 * and value*10 on write. JS bitwise shifts in getDataValue already yield a
 * signed 32-bit number, which is what negative calibration needs.
 *
 * Time: Tuya command 0x24 is answered like drivers/lcdtemphumidsensor_3
 * (Unix epoch, timeStart "1970", with payloadSize). The Zigbee Time cluster
 * responder uses the 2000 epoch. This valve asks for time in a burst.
 * At most one 0x24 reply is sent every 20 seconds (TIME_ANSWER_COOLDOWN_MS).
 * A dataQuery is sent at most once per hour. A reply on every request was
 * stacking writes on the sleepy MCU so a target-temperature datapoint never
 * got on the air.
 *
 * DP 15 is a reported window status. It uses the read-only capability
 * window_open_status. The shared window_open capability stays setable for
 * the other thermostat drivers.
 *
 * Weekly schedule DPs 28-34 are left out of this version.
 */

const DP = {
  preset: 2,
  runningState: 3,
  targetTemperature: 4,
  currentTemperature: 5,
  battery: 6,
  childLock: 7,
  windowDetection: 14,
  windowOpen: 15,
  holidayTemperature: 21,
  batteryLow: 35,
  frostProtection: 36,
  temperatureCalibration: 47,
  ecoTemperature: 103,
  comfortTemperature: 104,
  frostProtectionTemperature: 105,
};

const PRESET_LABELS = {
  0: 'manual',
  1: 'schedule',
  2: 'eco',
  3: 'comfort',
  4: 'frost_protection',
  5: 'holiday',
  6: 'off',
};

const ZIGBEE_EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0);
const ZCL_STATUS_SUCCESS = 0x00;
const ZCL_STATUS_UNSUPPORTED_ATTRIBUTE = 0x86;
const ZCL_TYPE_UTC_TIME = 0xE2;
const ZCL_TYPE_BITMAP8 = 0x18;
const ZCL_TYPE_INT32 = 0x2B;
const TIME_UPDATE_INTERVAL_MS = 3600 * 1000;
const TIME_ANSWER_COOLDOWN_MS = 20 * 1000;
const SETPOINT_WRITE_TIMEOUT_MS = 10 * 1000;
const SUPERSEDED_SETPOINT = 'Superseded by a newer target temperature';

class AvattoTimeBoundCluster extends BoundCluster {

  async readAttributes({ attributes }) {
    const chunks = [];

    for (const attributeId of attributes) {
      switch (attributeId) {
        case 0x0007: { // localTime, Zigbee epoch 2000
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

class AvattoThermostaticRadiatorValve extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    await this._ensureCapabilities();
    this._lastStableTarget = this.getCapabilityValue('target_temperature');

    this.registerCapabilityListener('target_temperature', async value => {
      await this.setTargetTemperature(value);
    });

    this.registerCapabilityListener('avatto_thermostat_preset', async value => {
      await this.setPreset(value);
    });

    this._registerTimeBoundCluster(zclNode);
    this._registerTuyaListeners(zclNode);

    // One state query. Time is answered when the valve asks (0x24), not from here.
    this._scheduleQueryOnce(3000);

    this.log('AVATTO thermostatic radiator valve initialized:', this.getName());
  }

  async _ensureCapabilities() {
    const capabilities = [
      'target_temperature',
      'measure_temperature',
      'avatto_thermostat_preset',
      'thermostat_heating',
      'window_open_status',
      'measure_battery',
      'alarm_battery',
    ];

    for (const capabilityId of capabilities) {
      if (!this.hasCapability(capabilityId)) {
        await this.addCapability(capabilityId);
      }
    }
  }

  _registerTimeBoundCluster(zclNode) {
    try {
      if (typeof zclNode?.endpoints?.[1]?.bind === 'function') {
        this._timeBoundCluster = new AvattoTimeBoundCluster();
        zclNode.endpoints[1].bind('time', this._timeBoundCluster);
        this.log('Registered Time bound cluster (0x000A), Zigbee epoch 2000');
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

    const onData = (source, data) => {
      this.processDatapoint(source, data).catch(err => this.error(`Failed to process ${source}`, err));
    };

    tuyaCluster.on('reporting', data => onData('reporting', data));
    tuyaCluster.on('response', data => onData('response', data));
    tuyaCluster.on('datapoint', data => onData('datapoint', data));
    tuyaCluster.on('reportingConfiguration', data => onData('reportingConfiguration', data));
    tuyaCluster.on('timeSync', data => {
      this.onTuyaTimeSync(data).catch(err => this.error('Tuya timeSync failed', err));
    });
  }

  async onTuyaTimeSync(data) {
    this._trace('[Tuya timeSync request]', data);

    if (this._timeSyncInFlight) {
      this._trace('Tuya timeSync already in flight');
      return;
    }

    const since = this._lastTimeAnswerAt ? Date.now() - this._lastTimeAnswerAt : null;
    if (since !== null && since < TIME_ANSWER_COOLDOWN_MS) {
      this._trace('Tuya timeSync skipped, cooldown ms=', since);
      return;
    }

    this._timeSyncInFlight = true;
    try {
      await this.sendTuyaTime('request');
    } finally {
      this._timeSyncInFlight = false;
    }
  }

  /**
   * Tuya MCU time, Unix epoch (timeStart "1970").
   * 4 byte UTC + 4 byte local, big-endian. payloadSize is required by
   * TuyaSpecificCluster: without it zigbee-clusters writes a length of 0.
   */
  async sendTuyaTime(reason) {
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

    this._trace(
      '[Tuya timeSync response] reason=',
      reason,
      'timeStart=1970 utc=',
      utcSeconds,
      'local=',
      localSeconds,
    );

    await tuyaCluster.timeSync({
      payloadSize: payload.length,
      payload,
    });
    this._lastTimeAnswerAt = Date.now();
    this._nextLocalTimeUpdate = this._lastTimeAnswerAt + TIME_UPDATE_INTERVAL_MS;
    this._trace('Tuya timeSync response sent, reason=', reason);
    this._scheduleQueryOnce(1500);
  }

  /**
   * dataQuery makes this valve report, then ask for time again.
   * One query per hour is enough. Extra queries were crowding out DP 4 writes.
   */
  _scheduleQueryOnce(delayMs) {
    if (this._queryTimer) return;
    if (this._nextQueryAt != null && Date.now() < this._nextQueryAt) return;

    this._queryTimer = this._delay(delayMs, () => {
      this._queryTimer = null;
      this._nextQueryAt = Date.now() + TIME_UPDATE_INTERVAL_MS;
      this.queryAll().catch(err => this.error('queryAll failed', err));
    });
  }

  async queryAll() {
    const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster || typeof tuyaCluster.dataQuery !== 'function') {
      this._trace('Tuya dataQuery not available');
      return;
    }

    this._trace('Sending Tuya dataQuery (0x03)');
    await tuyaCluster.dataQuery({});
  }

  /**
   * pending: the DP 4 write is in flight, or the radio accepted it and the
   * valve has not yet reported the same value.
   * acknowledged: a DP 4 report arrived with the same raw value.
   * failed: the write was rejected or timed out. target_temperature is put
   * back to the previous value and the caller gets the error.
   *
   * Only the latest requested setpoint is written. An older request that has
   * not reached the radio is rejected as superseded.
   */
  async setTargetTemperature(celsius) {
    const clamped = this._clampStep(celsius, 5, 35, 0.5);
    const raw = Math.round(clamped * 10);
    const job = this._createSetpointJob(clamped, raw);
    this._enqueueSetpoint(job);
    return job.promise;
  }

  get setpointState() {
    return this._setpointState || null;
  }

  _createSetpointJob(celsius, raw) {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {
      celsius,
      raw,
      previous: undefined,
      state: 'pending',
      promise,
      resolve,
      reject,
      settled: false,
    };
  }

  _enqueueSetpoint(job) {
    if (this._queuedSetpoint) {
      this._rejectSetpoint(this._queuedSetpoint, new Error(SUPERSEDED_SETPOINT));
    }
    this._queuedSetpoint = job;
    this._drainSetpoints();
  }

  _drainSetpoints() {
    if (this._setpointDraining) return;
    this._setpointDraining = true;

    const step = () => {
      const job = this._queuedSetpoint;
      if (!job) {
        this._setpointDraining = false;
        if (this._queuedSetpoint) this._drainSetpoints();
        return;
      }
      this._queuedSetpoint = null;
      Promise.resolve(this._runSetpoint(job)).then(step, err => {
        this.error('Setpoint queue failed', err);
        step();
      });
    };

    step();
  }

  async _runSetpoint(job) {
    if (job.settled) return;
    if (job.previous === undefined) {
      job.previous = this._stableTargetTemperature(job.celsius);
    }

    this._activeSetpoint = job;
    job.state = 'pending';
    this._setpointState = 'pending';
    this._trace('Writing DP 4 target temperature raw=', job.raw, 'celsius=', job.celsius);

    try {
      await this._setTargetCapability(job.celsius);
      if (job.settled) return;
      if (this._queuedSetpoint) {
        this._rejectSetpoint(job, new Error(SUPERSEDED_SETPOINT));
        return;
      }

      await this._writeTargetTemperature(job);
      if (job.settled) return;
      if (job.state !== 'acknowledged') {
        job.state = 'pending';
        this._setpointState = 'pending';
      }
      this._resolveSetpoint(job);
    } catch (err) {
      if (job.settled) return;
      job.state = 'failed';
      this._setpointState = 'failed';
      this.error('DP 4 target temperature write failed raw=', job.raw, err);

      if (this._queuedSetpoint) {
        if (this._queuedSetpoint.previous === undefined) {
          this._queuedSetpoint.previous = job.previous;
        }
        this._rejectSetpoint(job, err);
        return;
      }

      try {
        await this._setTargetCapability(job.previous);
        this._lastStableTarget = job.previous;
      } catch (restoreErr) {
        this.error('Failed to restore target_temperature', restoreErr);
      }
      this._rejectSetpoint(job, err);
    }
  }

  _stableTargetTemperature(requested) {
    const current = this.getCapabilityValue('target_temperature');
    if (current !== requested) return current;
    if (this._lastStableTarget !== undefined && this._lastStableTarget !== requested) {
      return this._lastStableTarget;
    }
    return current;
  }

  async _writeTargetTemperature(job) {
    const timeoutMs = this.setpointWriteTimeoutMs ?? SETPOINT_WRITE_TIMEOUT_MS;
    const data = Buffer.alloc(4);
    data.writeUInt32BE(job.raw, 0);
    if (typeof this._transactionID !== 'number' || Number.isNaN(this._transactionID)) {
      this._transactionID = 0;
    }

    let timedOut = false;
    const writePromise = this.zclNode.endpoints[1].clusters.tuya.datapoint({
      status: 0,
      transid: this.transactionID++,
      dp: DP.targetTemperature,
      datatype: 2,
      length: 4,
      data,
    }).then(result => {
      if (timedOut || job.state === 'failed' || job.state === 'acknowledged') return undefined;
      return result;
    }, err => {
      if (timedOut || job.state === 'failed') return undefined;
      throw err;
    });

    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = this._delay(timeoutMs, () => {
        timedOut = true;
        reject(new Error(`DP 4 target temperature write timed out after ${timeoutMs} ms`));
      });
    });

    try {
      await Promise.race([writePromise, timeoutPromise]);
    } finally {
      if (timer) this._cancelDelay(timer);
    }
  }

  _resolveSetpoint(job) {
    if (job.settled) return;
    job.settled = true;
    job.resolve();
  }

  _rejectSetpoint(job, err) {
    if (job.settled) return;
    job.settled = true;
    job.reject(err);
  }

  _noteTargetReport(raw) {
    if (!this._activeSetpoint || this._activeSetpoint.raw !== raw) return;
    this._activeSetpoint.state = 'acknowledged';
    this._setpointState = 'acknowledged';
    this._lastStableTarget = this._activeSetpoint.celsius;
  }

  async setPreset(preset) {
    const numeric = Number(preset);
    if (!Number.isInteger(numeric) || PRESET_LABELS[numeric] === undefined) {
      throw new Error(`Invalid AVATTO preset: ${preset}`);
    }

    this._trace('Writing DP 2 preset raw=', numeric, 'label=', PRESET_LABELS[numeric]);
    await this.writeEnum(DP.preset, numeric);
    await this._setCapability('avatto_thermostat_preset', String(numeric));
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('temperatureCalibration')) {
      const celsius = this._clampStep(newSettings.temperatureCalibration, -9.5, 9.5, 0.5);
      const raw = Math.round(celsius * 10);
      // writeData32 uses uint32. Negative calibration is two's complement.
      const encoded = raw < 0 ? raw + 0x100000000 : raw;
      this._trace('Writing DP 47 temperature calibration raw=', raw, 'encoded=', encoded, 'celsius=', celsius);
      await this.writeData32(DP.temperatureCalibration, encoded);
    }

    if (changedKeys.includes('childLock')) {
      this._trace('Writing DP 7 child lock=', !!newSettings.childLock);
      await this.writeBool(DP.childLock, !!newSettings.childLock);
    }

    if (changedKeys.includes('windowDetection')) {
      this._trace('Writing DP 14 window detection=', !!newSettings.windowDetection);
      await this.writeBool(DP.windowDetection, !!newSettings.windowDetection);
    }

    if (changedKeys.includes('ecoTemperature')) {
      const celsius = this._clampStep(newSettings.ecoTemperature, 5, 35, 0.5);
      const raw = Math.round(celsius * 10);
      this._trace('Writing DP 103 eco temperature raw=', raw, 'celsius=', celsius);
      await this.writeData32(DP.ecoTemperature, raw);
    }

    if (changedKeys.includes('comfortTemperature')) {
      const celsius = this._clampStep(newSettings.comfortTemperature, 5, 35, 0.5);
      const raw = Math.round(celsius * 10);
      this._trace('Writing DP 104 comfort temperature raw=', raw, 'celsius=', celsius);
      await this.writeData32(DP.comfortTemperature, raw);
    }
  }

  async processDatapoint(source, data) {
    const dp = data?.dp;
    let parsedValue;
    try {
      parsedValue = getDataValue(data);
    } catch (err) {
      this.error(`[Tuya ${source}] dp=${dp} parse failed`, err);
      return;
    }

    this._trace(`[Tuya ${source}] dp=${dp} datatype=${data?.datatype} value=`, parsedValue);

    switch (dp) {
      case DP.preset: {
        const label = PRESET_LABELS[parsedValue];
        this._trace('DP 2 preset raw=', parsedValue, 'label=', label || 'unknown');
        if (label) await this._setCapability('avatto_thermostat_preset', String(parsedValue));
        break;
      }

      case DP.runningState: {
        const heating = parsedValue === 1;
        this._trace('DP 3 running_state raw=', parsedValue, 'heating=', heating);
        await this._setCapability('thermostat_heating', heating);
        break;
      }

      case DP.targetTemperature: {
        const celsius = parsedValue / 10;
        this._trace('DP 4 target temperature raw=', parsedValue, 'celsius=', celsius);
        this._noteTargetReport(parsedValue);
        await this._setCapability('target_temperature', celsius);
        break;
      }

      case DP.currentTemperature: {
        const celsius = parsedValue / 10;
        this._trace('DP 5 measured temperature raw=', parsedValue, 'celsius=', celsius);
        await this._setCapability('measure_temperature', celsius);
        break;
      }

      case DP.battery: {
        const percent = this._batteryPercent(parsedValue);
        this._trace('DP 6 battery raw=', parsedValue, 'percent=', percent);
        if (percent !== null) await this._setCapability('measure_battery', percent);
        break;
      }

      case DP.childLock:
        this._trace('DP 7 child lock=', parsedValue);
        await this._setSetting('childLock', !!parsedValue);
        break;

      case DP.windowDetection:
        this._trace('DP 14 window detection=', parsedValue);
        await this._setSetting('windowDetection', !!parsedValue);
        break;

      case DP.windowOpen:
        await this._onWindowOpen(parsedValue === 1 || parsedValue === true);
        break;

      case DP.holidayTemperature:
        this._trace('DP 21 holiday temperature raw=', parsedValue, 'celsius=', parsedValue / 10);
        break;

      case DP.batteryLow: {
        // Zigbee2MQTT errorOrBatteryLow: numeric 1 means battery low.
        // The other TRV driver treats its own DP 35 as low when the value is 0.
        const low = parsedValue === 1 || parsedValue === true;
        this._trace('DP 35 battery_low raw=', parsedValue, 'alarm_battery=', low);
        await this._setCapability('alarm_battery', low);
        break;
      }

      case DP.frostProtection:
        this._trace('DP 36 frost protection=', parsedValue);
        break;

      case DP.temperatureCalibration: {
        const celsius = parsedValue / 10;
        this._trace('DP 47 temperature calibration raw=', parsedValue, 'celsius=', celsius);
        await this._setSetting('temperatureCalibration', this._clampStep(celsius, -9.5, 9.5, 0.5));
        break;
      }

      case DP.ecoTemperature: {
        const celsius = parsedValue / 10;
        this._trace('DP 103 eco temperature raw=', parsedValue, 'celsius=', celsius);
        await this._setSetting('ecoTemperature', this._clampStep(celsius, 5, 35, 0.5));
        break;
      }

      case DP.comfortTemperature: {
        const celsius = parsedValue / 10;
        this._trace('DP 104 comfort temperature raw=', parsedValue, 'celsius=', celsius);
        await this._setSetting('comfortTemperature', this._clampStep(celsius, 5, 35, 0.5));
        break;
      }

      case DP.frostProtectionTemperature:
        this._trace('DP 105 frost protection temperature raw=', parsedValue, 'celsius=', parsedValue / 10);
        break;

      case 101:
        // Bool on this valve. Not in the TS0601_thermostat_14 map and not a temperature.
        this._trace('DP 101 unmapped bool=', parsedValue);
        break;

      default:
        if (dp >= 28 && dp <= 34) {
          this._trace(`DP ${dp} weekly schedule ignored in this version`);
        } else {
          this._trace('Unhandled datapoint', dp, parsedValue);
        }
    }
  }

  async _onWindowOpen(isOpen) {
    const previous = this.getCapabilityValue('window_open_status');
    this._trace('DP 15 window open raw=', isOpen ? 1 : 0, 'previous=', previous);
    await this._setCapability('window_open_status', isOpen);

    if (typeof previous !== 'boolean' || previous === isOpen) return;

    const cardId = isOpen ? 'avatto_trv_window_opened' : 'avatto_trv_window_closed';
    try {
      await this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, {}, {});
    } catch (err) {
      this.error(`Failed to trigger flow card ${cardId}`, err);
    }
  }

  _batteryPercent(parsedValue) {
    const numeric = Number(parsedValue);
    if (!Number.isFinite(numeric)) return null;
    if (numeric < 0 || numeric > 100) {
      this._trace('DP 6 battery outside 0-100, not stored:', numeric);
      return null;
    }
    return Math.round(numeric);
  }

  _clampStep(value, min, max, step) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new Error(`Invalid number: ${value}`);
    }
    const clamped = Math.min(max, Math.max(min, numeric));
    const steps = Math.round(clamped / step);
    return Math.round(steps * step * 10) / 10;
  }

  async _setCapability(capabilityId, value) {
    const current = this.getCapabilityValue(capabilityId);
    if (current === value) return;
    try {
      await this.setCapabilityValue(capabilityId, value);
    } catch (err) {
      this.error(`Failed to set ${capabilityId} to ${value}`, err);
    }
  }

  async _setTargetCapability(value) {
    if (this.getCapabilityValue('target_temperature') === value) return;
    await this.setCapabilityValue('target_temperature', value);
  }

  async _setSetting(id, value) {
    try {
      const current = this.getSetting(id);
      if (current === value) return;
      await this.setSettings({ [id]: value });
    } catch (err) {
      this.error(`Failed to store setting ${id}`, err);
    }
  }

  _trace(...args) {
    let enabled = false;
    try {
      enabled = this.getSetting('debugLogging') === true;
    } catch (err) {
      enabled = false;
    }
    if (enabled) this.log(...args);
  }

  _delay(ms, fn) {
    if (this.homey && typeof this.homey.setTimeout === 'function') {
      return this.homey.setTimeout(fn, ms);
    }
    return setTimeout(fn, ms);
  }

  _cancelDelay(timer) {
    if (this.homey && typeof this.homey.clearTimeout === 'function') {
      this.homey.clearTimeout(timer);
      return;
    }
    clearTimeout(timer);
  }

  onDeleted() {
    if (this._queryTimer) this._cancelDelay(this._queryTimer);
    this.log('AVATTO thermostatic radiator valve removed:', this.getName());
  }
}

module.exports = AvattoThermostaticRadiatorValve;
