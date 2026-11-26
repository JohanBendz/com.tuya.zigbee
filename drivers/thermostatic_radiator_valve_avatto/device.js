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
 * Time: Tuya command 0x24 is Unix epoch (timeStart "1970"), 4 byte UTC plus
 * 4 byte local. The Zigbee Time cluster uses the 2000 epoch. Those epochs
 * stay distinct. Homey SDK v3 runs the app with process timezone UTC, so
 * Date.getTimezoneOffset() is 0 even when Homey is set to Europe/Stockholm.
 * Local offset comes from homey.clock.getTimezone() and Intl.DateTimeFormat
 * for the actual instant. The Time bound cluster gets that provider from
 * this driver only.
 *
 * This valve asks for time in a burst. At most one 0x24 reply is sent every 20 seconds
 * (TIME_ANSWER_COOLDOWN_MS). A dataQuery is sent at most once per hour.
 *
 * DP 4: the last reported setpoint is the device value. The capability can
 * show an optimistic target before a report arrives. A failed or timed-out
 * request rolls back to the last reported value, not to an earlier
 * unconfirmed optimistic write. A Promise.race timeout does not cancel the
 * Zigbee write. The next DP 4 command waits until that write settles. A
 * late transport result does not retry the write and does not turn a failed
 * request into a success. A later physical report still updates the
 * displayed value.
 *
 * DP 15 is a reported window status. It uses the read-only capability
 * window_open_status. The shared window_open capability stays setable for
 * the other thermostat drivers.
 *
 * Weekly schedule DPs 28-34 are left out of this version.
 *
 * This is the same SDK timezone issue as #1545. It does not change the
 * other device.
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

const DATA_TYPE_BOOL = 1;
const DATA_TYPE_VALUE = 2;
const DATA_TYPE_ENUM = 4;

const ZIGBEE_EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0);
const ZCL_STATUS_SUCCESS = 0x00;
const ZCL_STATUS_UNSUPPORTED_ATTRIBUTE = 0x86;
const ZCL_TYPE_UINT32 = 0x23;
const ZCL_TYPE_UTC_TIME = 0xE2;
const ZCL_TYPE_BITMAP8 = 0x18;
const ZCL_TYPE_INT32 = 0x2B;
const TIME_UPDATE_INTERVAL_MS = 3600 * 1000;
const TIME_ANSWER_COOLDOWN_MS = 20 * 1000;
const SETPOINT_WRITE_TIMEOUT_MS = 10 * 1000;
const CONFIRM_EXPIRY_MS = 30 * 1000;
const SUPERSEDED_SETPOINT = 'Superseded by a newer target temperature';

/**
 * Seconds east of UTC for Homey's configured zone at this instant.
 * Positive east of UTC. Independent of the process TZ, which SDK v3 forces
 * to UTC.
 */
function localOffsetSeconds(timeZone, instant) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (typeof timeZone !== 'string' || timeZone.length === 0) {
    throw new Error('Homey timezone is required');
  }
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const localUnix = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  ) / 1000;
  const utcUnix = Math.floor(date.getTime() / 1000);
  return localUnix - utcUnix;
}

class AvattoTimeBoundCluster extends BoundCluster {

  constructor(provider) {
    super();
    this._provider = provider;
  }

  _offsetSeconds(instant) {
    return this._provider.offsetSeconds(instant || new Date());
  }

  async readAttributes({ attributes }) {
    if (!this._provider || this._provider.alive() !== true) {
      return { attributes: Buffer.alloc(0) };
    }

    const chunks = [];
    const instant = new Date(Date.now());
    const utcZigbee = Math.floor((instant.getTime() - ZIGBEE_EPOCH_MS) / 1000);

    for (const attributeId of attributes) {
      switch (attributeId) {
        case 0x0007: { // localTime, Zigbee epoch 2000 plus the Homey offset
          const localTime = utcZigbee + this._offsetSeconds(instant);
          const buf = Buffer.alloc(8);
          buf.writeUInt16LE(0x0007, 0);
          buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
          buf.writeUInt8(ZCL_TYPE_UINT32, 3);
          buf.writeUInt32LE(localTime >>> 0, 4);
          chunks.push(buf);
          break;
        }

        case 0x0000: { // time, Zigbee epoch 2000, UTC, no local offset
          const buf = Buffer.alloc(8);
          buf.writeUInt16LE(0x0000, 0);
          buf.writeUInt8(ZCL_STATUS_SUCCESS, 2);
          buf.writeUInt8(ZCL_TYPE_UTC_TIME, 3);
          buf.writeUInt32LE(utcZigbee >>> 0, 4);
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

        case 0x0002: { // timeZone, seconds east of UTC
          const timeZone = this._offsetSeconds(instant);
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
    this._stopWork('reinitialized');
    this._alive = true;

    await this._ensureCapabilities();
    this._ensureDeviceTarget();

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

  async onUninit() {
    this._stopWork('uninitialized');
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

  _timezoneProvider(generation) {
    return {
      alive: () => this._alive === true && this._generation === generation,
      offsetSeconds: instant => localOffsetSeconds(
        this.homey.clock.getTimezone(),
        instant || new Date(),
      ),
    };
  }

  _registerTimeBoundCluster(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (typeof endpoint?.bind === 'function') {
        const generation = this._generation;
        this._timeEndpoint = endpoint;
        this._timeBoundCluster = new AvattoTimeBoundCluster(this._timezoneProvider(generation));
        endpoint.bind('time', this._timeBoundCluster);
        this.log('Registered Time bound cluster (0x000A), Zigbee epoch 2000');
      }
    } catch (err) {
      this.error('Failed to register Time bound cluster', err);
    }
  }

  _registerTuyaListeners(zclNode) {
    this._detachOwnedListeners();
    const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster || typeof tuyaCluster.on !== 'function') {
      this.error('Tuya cluster not available on endpoint 1');
      return;
    }

    const generation = this._generation;
    const onData = (source, data) => {
      if (generation !== this._generation || this._alive !== true) return;
      this.processDatapoint(source, data).catch(err => this.error(`Failed to process ${source}`, err));
    };

    this._listenerCluster = tuyaCluster;
    this._ownedListeners = [];
    const add = (event, fn) => {
      tuyaCluster.on(event, fn);
      this._ownedListeners.push([event, fn]);
    };

    add('reporting', data => onData('reporting', data));
    add('response', data => onData('response', data));
    add('datapoint', data => onData('datapoint', data));
    add('reportingConfiguration', data => onData('reportingConfiguration', data));
    add('timeSync', data => {
      if (generation !== this._generation || this._alive !== true) return;
      this.onTuyaTimeSync(data).catch(err => this.error('Tuya timeSync failed', err));
    });
  }

  _detachOwnedListeners() {
    if (this._listenerCluster && this._ownedListeners) {
      for (const [event, fn] of this._ownedListeners) {
        if (typeof this._listenerCluster.removeListener === 'function') {
          this._listenerCluster.removeListener(event, fn);
        } else if (typeof this._listenerCluster.off === 'function') {
          this._listenerCluster.off(event, fn);
        }
      }
    }
    this._ownedListeners = null;
    this._listenerCluster = null;

    if (
      this._timeEndpoint
      && this._timeBoundCluster
      && typeof this._timeEndpoint.unbind === 'function'
    ) {
      try {
        this._timeEndpoint.unbind('time', this._timeBoundCluster);
      } catch (err) {
        this.error('Failed to unbind Time cluster', err);
      }
    }
    this._timeBoundCluster = null;
    this._timeEndpoint = null;
  }

  async onTuyaTimeSync(data) {
    if (this._alive === false) return;
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

    const generation = this._generation;
    this._timeSyncInFlight = true;
    try {
      await this.sendTuyaTime('request', generation);
    } finally {
      if (generation === this._generation) this._timeSyncInFlight = false;
    }
  }

  /**
   * Tuya MCU time, Unix epoch (timeStart "1970").
   * 4 byte UTC + 4 byte local wall clock, big-endian. payloadSize is required
   * by TuyaSpecificCluster: without it zigbee-clusters writes a length of 0.
   * The Zigbee Time cluster answers with the 2000 epoch instead.
   */
  async sendTuyaTime(reason, generation = this._generation) {
    if (this._alive === false) return;
    const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster || typeof tuyaCluster.timeSync !== 'function') {
      this.error('Tuya timeSync command not available');
      return;
    }

    const instant = new Date(Date.now());
    const utcSeconds = Math.floor(instant.getTime() / 1000);
    const offset = localOffsetSeconds(this.homey.clock.getTimezone(), instant);
    const localSeconds = utcSeconds + offset;
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
      'offset=',
      offset,
    );

    await tuyaCluster.timeSync({
      payloadSize: payload.length,
      payload,
    });
    if (this._alive === false || generation !== this._generation) return;
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
    if (this._alive === false) return;
    if (this._queryTimer) return;
    if (this._nextQueryAt != null && Date.now() < this._nextQueryAt) return;

    const generation = this._generation;
    this._queryTimer = this._delay(delayMs, () => {
      this._queryTimer = null;
      if (generation !== this._generation || this._alive !== true) return;
      this._nextQueryAt = Date.now() + TIME_UPDATE_INTERVAL_MS;
      this.queryAll().catch(err => this.error('queryAll failed', err));
    }, 'query');
  }

  async queryAll() {
    if (this._alive === false) return;
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
   * acknowledged: a DP 4 report arrived with the same raw value while the
   * request was still open.
   * failed: the write was rejected or timed out. The caller is rejected.
   * The UI returns to the last reported setpoint, not to an unconfirmed
   * optimistic value. A late report may move the UI again without turning
   * the failed request into a success.
   * expired: the radio accepted the write and no matching report arrived
   * before CONFIRM_EXPIRY_MS. The caller already succeeded. A later report
   * updates the device value and does not acknowledge the expired request.
   *
   * Only the latest requested setpoint is written, and only after any
   * earlier Zigbee write has settled. The timeout does not cancel that
   * write, and this driver does not retry it.
   */
  async setTargetTemperature(celsius) {
    if (this._alive === false) {
      throw new Error('AVATTO TRV stopped');
    }
    this._ensureDeviceTarget();
    const clamped = this._clampStep(celsius, 5, 35, 0.5);
    const raw = Math.round(clamped * 10);
    const job = this._createSetpointJob(clamped, raw);
    this._enqueueSetpoint(job);
    return job.promise;
  }

  get setpointState() {
    return this._setpointState || null;
  }

  _ensureDeviceTarget() {
    if (this._deviceTarget !== undefined) return;
    const current = this.getCapabilityValue('target_temperature');
    this._deviceTarget = typeof current === 'number' && Number.isFinite(current) ? current : null;
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
      terminal: false,
      generation: this._generation,
      promise,
      resolve,
      reject,
      settled: false,
    };
  }

  _enqueueSetpoint(job) {
    if (this._alive === false) {
      this._rejectSetpoint(job, new Error('AVATTO TRV stopped'));
      return;
    }
    if (this._queuedSetpoint) {
      this._queuedSetpoint.state = 'superseded';
      this._queuedSetpoint.terminal = true;
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
      if (!job || this._alive === false) {
        this._setpointDraining = false;
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
    if (job.generation !== this._generation || this._alive === false) {
      this._rejectSetpoint(job, new Error('AVATTO TRV stopped'));
      return;
    }

    this._ensureDeviceTarget();
    job.previous = this._deviceTarget;
    this._activeSetpoint = job;
    job.state = 'pending';
    this._setpointState = 'pending';
    this._optimisticTarget = job.celsius;
    this._trace('Writing DP 4 target temperature raw=', job.raw, 'celsius=', job.celsius);

    try {
      await this._setTargetCapability(job.celsius);
    } catch (err) {
      job.state = 'failed';
      job.terminal = true;
      this._setpointState = 'failed';
      this._rejectSetpoint(job, err);
      return;
    }

    if (job.settled || job.generation !== this._generation || this._alive === false) {
      if (!job.settled) this._rejectSetpoint(job, new Error('AVATTO TRV stopped'));
      return;
    }

    // Not on the air yet. A newer request replaces this one.
    if (this._queuedSetpoint) {
      job.state = 'superseded';
      job.terminal = true;
      if (this._activeSetpoint === job) this._activeSetpoint = null;
      this._rejectSetpoint(job, new Error(SUPERSEDED_SETPOINT));
      return;
    }

    const generation = this._generation;
    const writePromise = this._sendTargetDatapoint(job);
    // The timeout below cannot cancel writePromise. _runSetpoint does not
    // return, and the queue does not send another DP 4, until writePromise
    // settles. A late resolve or reject is not a retry.
    this._unresolvedWrite = writePromise;
    const timeoutMs = this.setpointWriteTimeoutMs ?? SETPOINT_WRITE_TIMEOUT_MS;
    let timer;
    try {
      await Promise.race([
        writePromise,
        new Promise((_, reject) => {
          timer = this._delay(timeoutMs, () => {
            reject(new Error(`DP 4 target temperature write timed out after ${timeoutMs} ms`));
          }, 'setpoint-timeout');
        }),
      ]);
      if (job.settled || generation !== this._generation || this._alive === false) return;
      if (this._deviceRaw === job.raw) this._acknowledge(job);
      this._resolveSetpoint(job);
      this._armConfirmationExpiry(job, generation);
    } catch (err) {
      if (job.settled || generation !== this._generation || this._alive === false) return;
      job.state = 'failed';
      job.terminal = true;
      this._setpointState = 'failed';
      this.error('DP 4 target temperature write failed raw=', job.raw, err);
      if (!this._queuedSetpoint) {
        try {
          await this._setTargetCapability(this._deviceTarget);
        } catch (restoreErr) {
          this.error('Failed to restore target_temperature', restoreErr);
        }
      } else if (this._queuedSetpoint.previous === undefined) {
        this._queuedSetpoint.previous = this._deviceTarget;
      }
      this._rejectSetpoint(job, err);
    } finally {
      if (timer) this._cancelDelay(timer);
      try {
        await writePromise;
      } catch (transportErr) {
        this._trace(
          'DP 4 transport settled after the caller finished; not retried',
          transportErr && transportErr.message,
        );
      }
      if (this._unresolvedWrite === writePromise) this._unresolvedWrite = null;
      if (
        !job.terminal
        && job.settled
        && job.state === 'pending'
        && this._deviceRaw === job.raw
        && generation === this._generation
        && this._alive !== false
      ) {
        this._acknowledge(job);
      }
    }
  }

  _sendTargetDatapoint(job) {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(job.raw, 0);
    if (typeof this._transactionID !== 'number' || Number.isNaN(this._transactionID)) {
      this._transactionID = 0;
    }
    return this.zclNode.endpoints[1].clusters.tuya.datapoint({
      status: 0,
      transid: this.transactionID++,
      dp: DP.targetTemperature,
      datatype: DATA_TYPE_VALUE,
      length: 4,
      data,
    });
  }

  _armConfirmationExpiry(job, generation) {
    if (job.terminal || job.state === 'acknowledged') return;
    const timeoutMs = this.confirmationExpiryMs ?? CONFIRM_EXPIRY_MS;
    this._confirmTimer = this._delay(timeoutMs, () => {
      if (generation !== this._generation || this._alive === false) return;
      if (job.terminal || job.state !== 'pending') return;
      job.state = 'expired';
      job.terminal = true;
      if (this._activeSetpoint === job) this._setpointState = 'expired';
    }, 'confirm-expiry');
  }

  _resolveSetpoint(job) {
    if (job.settled) return;
    job.settled = true;
    job.resolve();
  }

  _rejectSetpoint(job, err) {
    if (!job || job.settled) return;
    job.settled = true;
    job.terminal = true;
    job.reject(err);
  }

  _acknowledge(job) {
    if (!job || job.terminal) return;
    if (job.state === 'failed' || job.state === 'superseded' || job.state === 'expired') return;
    job.state = 'acknowledged';
    job.terminal = true;
    this._setpointState = 'acknowledged';
    if (this._confirmTimer) this._cancelDelay(this._confirmTimer);
    this._confirmTimer = null;
  }

  /**
   * A matching report acknowledges only an open request. Failed, superseded
   * and expired requests stay terminal. The reported value itself is stored
   * by processDatapoint before this runs.
   */
  _noteTargetReport(raw) {
    const job = this._activeSetpoint;
    if (!job || job.raw !== raw) return;
    if (job.terminal || job.state === 'failed' || job.state === 'superseded' || job.state === 'expired') {
      return;
    }
    // The write is still unresolved. Remember the report and reconcile when
    // the transport settles, including when that settlement is a rejection.
    if (this._unresolvedWrite) return;
    if (job.settled && job.state === 'pending') this._acknowledge(job);
  }

  async setPreset(preset) {
    if (this._alive === false) throw new Error('AVATTO TRV stopped');
    const numeric = Number(preset);
    if (!Number.isInteger(numeric) || PRESET_LABELS[numeric] === undefined) {
      throw new Error(`Invalid AVATTO preset: ${preset}`);
    }

    this._trace('Writing DP 2 preset raw=', numeric, 'label=', PRESET_LABELS[numeric]);
    await this.writeEnum(DP.preset, numeric);
    if (this._alive === false) return;
    await this._setCapability('avatto_thermostat_preset', String(numeric));
  }

  async onSettings({ newSettings, changedKeys }) {
    if (this._alive === false) return;
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
    if (this._alive === false) return;
    const dp = data?.dp;
    const generation = this._generation;

    this._trace(`[Tuya ${source}] dp=${dp} datatype=${data?.datatype}`);

    switch (dp) {
      case DP.preset: {
        const numeric = this._enumByte(data, 0, 6);
        if (numeric === null) return;
        const label = PRESET_LABELS[numeric];
        this._trace('DP 2 preset raw=', numeric, 'label=', label || 'unknown');
        if (label) await this._setCapability('avatto_thermostat_preset', String(numeric));
        break;
      }

      case DP.runningState: {
        const numeric = this._bit(data);
        if (numeric === null) return;
        const heating = numeric === 1;
        this._trace('DP 3 running_state raw=', numeric, 'heating=', heating);
        await this._setCapability('thermostat_heating', heating);
        break;
      }

      case DP.targetTemperature: {
        const raw = this._setpointRaw(data);
        if (raw === null) {
          this._trace('DP 4 ignored, not a valid 4-byte setpoint');
          return;
        }
        const celsius = raw / 10;
        this._deviceTarget = celsius;
        this._deviceRaw = raw;
        this._trace('DP 4 target temperature raw=', raw, 'celsius=', celsius);
        this._noteTargetReport(raw);
        await this._setCapability('target_temperature', celsius);
        break;
      }

      case DP.currentTemperature: {
        const raw = this._valueRaw(data, -400, 800, null);
        if (raw === null) return;
        const celsius = raw / 10;
        this._trace('DP 5 measured temperature raw=', raw, 'celsius=', celsius);
        await this._setCapability('measure_temperature', celsius);
        break;
      }

      case DP.battery: {
        const raw = this._valueRaw(data, 0, 100, null);
        if (raw === null) return;
        const percent = this._batteryPercent(raw);
        this._trace('DP 6 battery raw=', raw, 'percent=', percent);
        if (percent !== null) await this._setCapability('measure_battery', percent);
        break;
      }

      case DP.childLock: {
        const numeric = this._bit(data);
        if (numeric === null) return;
        this._trace('DP 7 child lock=', numeric);
        await this._setSetting('childLock', numeric === 1);
        break;
      }

      case DP.windowDetection: {
        const numeric = this._bit(data);
        if (numeric === null) return;
        this._trace('DP 14 window detection=', numeric);
        await this._setSetting('windowDetection', numeric === 1);
        break;
      }

      case DP.windowOpen: {
        const isOpen = this._windowOpenBit(data);
        if (isOpen === null) {
          this._trace('DP 15 ignored, not an explicit open or close');
          return;
        }
        await this._onWindowOpen(isOpen);
        break;
      }

      case DP.holidayTemperature:
        this._trace('DP 21 holiday temperature');
        break;

      case DP.batteryLow: {
        const numeric = this._bit(data);
        if (numeric === null) return;
        const low = numeric === 1;
        this._trace('DP 35 battery_low raw=', numeric, 'alarm_battery=', low);
        await this._setCapability('alarm_battery', low);
        break;
      }

      case DP.frostProtection:
        this._trace('DP 36 frost protection');
        break;

      case DP.temperatureCalibration: {
        const raw = this._valueRaw(data, -95, 95, 5);
        if (raw === null) return;
        const celsius = raw / 10;
        this._trace('DP 47 temperature calibration raw=', raw, 'celsius=', celsius);
        await this._setSetting('temperatureCalibration', this._clampStep(celsius, -9.5, 9.5, 0.5));
        break;
      }

      case DP.ecoTemperature: {
        const raw = this._setpointRaw(data);
        if (raw === null) return;
        const celsius = raw / 10;
        this._trace('DP 103 eco temperature raw=', raw, 'celsius=', celsius);
        await this._setSetting('ecoTemperature', this._clampStep(celsius, 5, 35, 0.5));
        break;
      }

      case DP.comfortTemperature: {
        const raw = this._setpointRaw(data);
        if (raw === null) return;
        const celsius = raw / 10;
        this._trace('DP 104 comfort temperature raw=', raw, 'celsius=', celsius);
        await this._setSetting('comfortTemperature', this._clampStep(celsius, 5, 35, 0.5));
        break;
      }

      case DP.frostProtectionTemperature:
        this._trace('DP 105 frost protection temperature');
        break;

      case 101:
        this._trace('DP 101 unmapped');
        break;

      default:
        if (dp >= 28 && dp <= 34) {
          this._trace(`DP ${dp} weekly schedule ignored in this version`);
        } else {
          this._trace('Unhandled datapoint', dp);
        }
    }

    if (generation !== this._generation) return undefined;
    return undefined;
  }

  _buffer(data) {
    if (!data || data.data == null) return null;
    if (Buffer.isBuffer(data.data)) return data.data;
    if (Array.isArray(data.data) || ArrayBuffer.isView(data.data)) return Buffer.from(data.data);
    return null;
  }

  _lengthMatches(data, length) {
    if (data.length == null) return true;
    return data.length === length;
  }

  _valueRaw(data, min, max, step) {
    const buf = this._buffer(data);
    if (!buf || data.datatype !== DATA_TYPE_VALUE || buf.length !== 4) return null;
    if (!this._lengthMatches(data, 4)) return null;
    let raw;
    try {
      raw = getDataValue(data);
    } catch (err) {
      return null;
    }
    if (!Number.isInteger(raw) || raw < min || raw > max) return null;
    if (step != null && raw % step !== 0) return null;
    return raw;
  }

  _setpointRaw(data) {
    return this._valueRaw(data, 50, 350, 5);
  }

  _enumByte(data, min, max) {
    const buf = this._buffer(data);
    if (!buf || buf.length !== 1 || data.datatype !== DATA_TYPE_ENUM) return null;
    if (!this._lengthMatches(data, 1)) return null;
    const numeric = buf[0];
    if (numeric < min || numeric > max) return null;
    return numeric;
  }

  _bit(data) {
    const buf = this._buffer(data);
    if (!buf || buf.length !== 1) return null;
    if (data.datatype !== DATA_TYPE_BOOL && data.datatype !== DATA_TYPE_ENUM) return null;
    if (!this._lengthMatches(data, 1)) return null;
    if (buf[0] !== 0 && buf[0] !== 1) return null;
    return buf[0];
  }

  _windowOpenBit(data) {
    const bit = this._bit(data);
    if (bit === null) return null;
    return bit === 1;
  }

  async _onWindowOpen(isOpen) {
    const previous = this.getCapabilityValue('window_open_status');
    this._trace('DP 15 window open raw=', isOpen ? 1 : 0, 'previous=', previous);
    await this._setCapability('window_open_status', isOpen);
    if (this._alive === false) return;

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
    if (this._alive === false) return;
    const current = this.getCapabilityValue(capabilityId);
    if (current === value) return;
    try {
      await this.setCapabilityValue(capabilityId, value);
    } catch (err) {
      this.error(`Failed to set ${capabilityId} to ${value}`, err);
    }
  }

  async _setTargetCapability(value) {
    if (this._alive === false) return;
    if (this.getCapabilityValue('target_temperature') === value) return;
    await this.setCapabilityValue('target_temperature', value);
  }

  async _setSetting(id, value) {
    if (this._alive === false) return;
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

  _delay(ms, fn, kind) {
    const generation = this._generation;
    const record = {
      cancelled: false,
      kind: kind || 'timer',
      generation,
      fn: null,
      handle: null,
    };
    const wrapped = () => {
      if (record.cancelled) return;
      if (generation !== this._generation) return;
      if (this._alive === false && kind !== 'setpoint-timeout') return;
      fn();
    };
    record.fn = wrapped;
    const handle = (this.homey && typeof this.homey.setTimeout === 'function')
      ? this.homey.setTimeout(wrapped, ms)
      : setTimeout(wrapped, ms);
    record.handle = handle;
    if (!this._timers) this._timers = [];
    this._timers.push(record);
    return record;
  }

  _cancelDelay(timer) {
    if (!timer) return;
    if (typeof timer === 'object') timer.cancelled = true;
    const handle = timer && timer.handle ? timer.handle : timer;
    if (this.homey && typeof this.homey.clearTimeout === 'function') {
      this.homey.clearTimeout(handle);
      return;
    }
    clearTimeout(handle);
  }

  _clearTimers() {
    for (const timer of this._timers || []) this._cancelDelay(timer);
    this._timers = [];
    this._queryTimer = null;
    this._confirmTimer = null;
  }

  _stopWork(reason) {
    this._alive = false;
    this._generation = (this._generation || 0) + 1;
    this._clearTimers();
    this._detachOwnedListeners();
    const err = new Error(`AVATTO TRV ${reason}`);
    const jobs = [];
    if (this._queuedSetpoint) jobs.push(this._queuedSetpoint);
    if (this._activeSetpoint && this._activeSetpoint !== this._queuedSetpoint) {
      jobs.push(this._activeSetpoint);
    }
    this._queuedSetpoint = null;
    this._activeSetpoint = null;
    for (const job of jobs) {
      job.state = 'failed';
      job.terminal = true;
      this._rejectSetpoint(job, err);
    }
    if (jobs.length) this._setpointState = 'failed';
    this._timeSyncInFlight = false;
  }

  onDeleted() {
    this._stopWork('removed');
    this.log('AVATTO thermostatic radiator valve removed:', this.getName());
  }
}

AvattoThermostaticRadiatorValve.localOffsetSeconds = localOffsetSeconds;
AvattoThermostaticRadiatorValve.ZIGBEE_EPOCH_MS = ZIGBEE_EPOCH_MS;
AvattoThermostaticRadiatorValve.AvattoTimeBoundCluster = AvattoTimeBoundCluster;
AvattoThermostaticRadiatorValve.CONFIRM_EXPIRY_MS = CONFIRM_EXPIRY_MS;

module.exports = AvattoThermostaticRadiatorValve;
