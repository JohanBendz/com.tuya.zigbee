'use strict';

const { Cluster, BoundCluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_FINGER_BOT_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);
Cluster.addCluster(TuyaOnOffCluster);

const MODE = {
  click: 0,
  switch: 1,
  program: 2,
};

const DEFAULT_MODE = 'click';
const LOCAL_PRESS_SUPPRESS_MS = 2000;
const LOCAL_REPORT_IGNORE_MS = 3500;
const LOCAL_UI_RESET_DELAY_MS = 100;
const REMOTE_PRESS_DEBOUNCE_MS = 800;
const MOMENTARY_GUI_PULSE_MS = 700;
const BATTERY_LOW_THRESHOLD = 20;
const ZIGBEE_EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0);

const ZCL_STATUS_SUCCESS = 0x00;
const ZCL_STATUS_UNSUPPORTED_ATTRIBUTE = 0x01;
const ZCL_TYPE_UTC_TIME = 0xE2;
const ZCL_TYPE_BITMAP8 = 0x18;
const ZCL_TYPE_INT32 = 0x2B;

/**
 * Bound Time cluster responder.
 * The device binds cluster 10 (time) and periodically reads attribute 0x0007 (localTime).
 * We return a raw readAttributes response buffer to avoid the built-in parser issues.
 */
class FingerBotTimeBoundCluster extends BoundCluster {

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

class FingerBot extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('Initializing FingerBot device...');
    this.printNode();

    this._suppressUntil = 0;
    this._ignoreOnOffReportsUntil = 0;
    this._lastBatteryLowState = false;
    this._lastRemotePressAt = 0;
    this._guiPulseTimeout = null;
    this._timeBoundCluster = null;

    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes([
        'manufacturerName',
        'zclVersion',
        'appVersion',
        'modelId',
        'powerSource',
        'attributeReportingStatus',
      ]);
    } catch (err) {
      this.error('Error when reading device attributes:', err);
    }

    this._registerOnOffHandling(zclNode);
    this._registerTuyaListeners(zclNode);
    this._registerTimeBoundCluster(zclNode);

    // Apply current settings once on init.
    await this.applyConfiguredSettings({ includeMode: true });

    this.log('FingerBot initialization complete.');
  }

  _registerOnOffHandling(zclNode) {
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async value => {
        this.log('FingerBot onoff triggered:', value);

        const mode = this._getConfiguredMode();

        if (mode === 'click') {
          // In click mode only "true" should trigger a physical press.
          // "false" is only the GUI reset and must not send a command.
          if (value !== true) return;
          await this.triggerFingerBotPress();
          return;
        }

        // In switch/program mode, pass through both states.
        try {
          if (value) {
            await zclNode.endpoints[1].clusters.onOff.setOn();
          } else {
            await zclNode.endpoints[1].clusters.onOff.setOff();
          }
        } catch (err) {
          this.error(`Failed to set FingerBot onoff (${value})`, err);
          throw err;
        }
      });
    }

    if (this.hasCapability('button.push')) {
      this.registerCapabilityListener('button.push', async () => {
        this.log('FingerBot button.push triggered');
        await this.triggerFingerBotPress();
      });
    }

    if (zclNode?.endpoints?.[1]?.clusters?.onOff) {
      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', value => {
        const now = Date.now();
        const mode = this._getConfiguredMode();

        if (mode === 'click') {
          // Ignore echo reports from our own local press.
          if (now < this._ignoreOnOffReportsUntil) {
            this.log('Ignoring onOff attr report during local press window:', value);
            return;
          }

          // In click mode, treat both true and false from the physical device
          // as a momentary button press, not as persistent state.
          if (now - this._lastRemotePressAt < REMOTE_PRESS_DEBOUNCE_MS) {
            this.log('Ignoring duplicated remote press report:', value);
            return;
          }

          this._lastRemotePressAt = now;
          this.log('Remote FingerBot press detected from onOff attr report:', value);

          this._pulseMomentaryGui();
          this._triggerFlowCard('fingerbot_button_pressed');
          return;
        }

        // In switch/program mode, use real persistent state.
        this.log('onOff attr report:', value);
        this._setCapabilitySafe('onoff', value, 'Failed to update onoff from onOff cluster');
      });
    }
  }

  _registerTuyaListeners(zclNode) {
    const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (!tuyaCluster) {
      this.error('FingerBot: Tuya cluster not available on endpoint 1');
      return;
    }

    if (this._tuyaListenersAttached) return;

    tuyaCluster.on('reporting', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya reporting frame:', err);
      }
    });

    tuyaCluster.on('response', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya response frame:', err);
      }
    });

    tuyaCluster.on('dataReport', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya dataReport frame:', err);
      }
    });

    tuyaCluster.on('reportingConfiguration', async data => {
      try {
        await this.processDatapoint(data);
      } catch (err) {
        this.error('Error processing Tuya reportingConfiguration frame:', err);
      }
    });

    this._tuyaListenersAttached = true;
  }

  _registerTimeBoundCluster(zclNode) {
    try {
      if (typeof zclNode?.endpoints?.[1]?.bind === 'function') {
        this._timeBoundCluster = new FingerBotTimeBoundCluster();
        zclNode.endpoints[1].bind('time', this._timeBoundCluster);
      }
    } catch (err) {
      this.error('Failed to register Time bound cluster', err);
    }
  }

  async triggerFingerBotPress() {
    if (Date.now() < this._suppressUntil) {
      this.log('FingerBot press suppressed');
      return;
    }

    this._suppressUntil = Date.now() + LOCAL_PRESS_SUPPRESS_MS;
    this._ignoreOnOffReportsUntil = Date.now() + LOCAL_REPORT_IGNORE_MS;

    try {
      // For app-triggered presses we ensure click mode.
      if (this._getConfiguredMode() !== 'click') {
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode, MODE.click);
      }

      await this.zclNode.endpoints[1].clusters.onOff.setOn();

      this._triggerFlowCard('fingerbot_button_pressed');

      // Reset GUI shortly after success.
      this.homey.setTimeout(() => {
        this._setCapabilitySafe(
          'onoff',
          false,
          'Failed to reset onoff after successful press',
        );
      }, LOCAL_UI_RESET_DELAY_MS);
    } catch (err) {
      this.error('Failed to trigger FingerBot press', err);
      throw err;
    }
  }

  _pulseMomentaryGui() {
    this._setCapabilitySafe('onoff', true, 'Failed to set momentary GUI state');

    if (this._guiPulseTimeout) {
      this.homey.clearTimeout(this._guiPulseTimeout);
    }

    this._guiPulseTimeout = this.homey.setTimeout(() => {
      this._setCapabilitySafe('onoff', false, 'Failed to reset momentary GUI state');
    }, MOMENTARY_GUI_PULSE_MS);
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);

    this.log(`FingerBot DP ${dp}:`, parsedValue);

    switch (dp) {
      case V1_FINGER_BOT_DATA_POINTS.battery: {
        if (this.hasCapability('measure_battery')) {
          await this._setCapabilitySafe(
            'measure_battery',
            parsedValue,
            'Failed to update battery',
          );
        }

        const isLow =
          typeof parsedValue === 'number' && parsedValue <= BATTERY_LOW_THRESHOLD;

        if (isLow && !this._lastBatteryLowState) {
          this._triggerFlowCard('fingerbot_battery_low');
        }

        this._lastBatteryLowState = isLow;
        break;
      }

      case V1_FINGER_BOT_DATA_POINTS.mode:
        this.log('FingerBot mode DP report:', parsedValue);
        break;

      case V1_FINGER_BOT_DATA_POINTS.lower:
        this.log('FingerBot lower limit DP report:', parsedValue);
        break;

      case V1_FINGER_BOT_DATA_POINTS.delay:
        this.log('FingerBot delay DP report:', parsedValue);
        break;

      case V1_FINGER_BOT_DATA_POINTS.reverse:
        this.log('FingerBot reverse DP report:', parsedValue);
        break;

      case V1_FINGER_BOT_DATA_POINTS.upper:
        this.log('FingerBot upper limit DP report:', parsedValue);
        break;

      case V1_FINGER_BOT_DATA_POINTS.touch:
        this.log('FingerBot touch DP report:', parsedValue);
        break;

      default:
        this.log('Unhandled FingerBot DP:', dp, 'value:', parsedValue);
    }
  }

  async applyConfiguredSettings({ includeMode = false } = {}) {
    const mode = this._getConfiguredMode();
    const lower = this.getSetting('lower_limit');
    const upper = this.getSetting('upper_limit');
    const delay = this.getSetting('sustain_time');
    const reverse = this.getSetting('reverse_direction');

    try {
      if (includeMode) {
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode, MODE[mode]);
      }

      if (typeof lower === 'number') {
        await this.writeData32(V1_FINGER_BOT_DATA_POINTS.lower, lower);
      }

      if (typeof upper === 'number') {
        await this.writeData32(V1_FINGER_BOT_DATA_POINTS.upper, upper);
      }

      if (typeof delay === 'number') {
        await this.writeData32(V1_FINGER_BOT_DATA_POINTS.delay, delay);
      }

      if (typeof reverse === 'boolean') {
        await this.writeEnum(
          V1_FINGER_BOT_DATA_POINTS.reverse,
          reverse ? 1 : 0,
        );
      }
    } catch (err) {
      this.error('Failed to apply FingerBot settings', err);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    this.log('FingerBot settings changed:', changedKeys);

    for (const key of changedKeys) {
      switch (key) {
        case 'fingerbot_mode':
          await this.writeEnum(
            V1_FINGER_BOT_DATA_POINTS.mode,
            MODE[this._normalizeMode(newSettings.fingerbot_mode)],
          );
          break;

        case 'lower_limit':
          await this.writeData32(
            V1_FINGER_BOT_DATA_POINTS.lower,
            newSettings.lower_limit,
          );
          break;

        case 'upper_limit':
          await this.writeData32(
            V1_FINGER_BOT_DATA_POINTS.upper,
            newSettings.upper_limit,
          );
          break;

        case 'sustain_time':
          await this.writeData32(
            V1_FINGER_BOT_DATA_POINTS.delay,
            newSettings.sustain_time,
          );
          break;

        case 'reverse_direction':
          if (typeof newSettings.reverse_direction === 'boolean') {
            await this.writeEnum(
              V1_FINGER_BOT_DATA_POINTS.reverse,
              newSettings.reverse_direction ? 1 : 0,
            );
          }
          break;

        default:
          this.log('Unhandled FingerBot setting change:', key);
      }
    }
  }

  _getConfiguredMode() {
    return this._normalizeMode(this.getSetting('fingerbot_mode'));
  }

  _normalizeMode(mode) {
    if (mode === 'switch' || mode === 'program') return mode;
    return DEFAULT_MODE;
  }

  async _setCapabilitySafe(capabilityId, value, errorMessage) {
    try {
      await this.setCapabilityValue(capabilityId, value);
    } catch (err) {
      this.error(errorMessage, err);
    }
  }

  _triggerFlowCard(id, tokens = {}, state = {}) {
    try {
      this.homey.flow
        .getDeviceTriggerCard(id)
        .trigger(this, tokens, state)
        .catch(err => this.error(`Failed to trigger flow card "${id}"`, err));
    } catch (err) {
      this.error(`Flow card "${id}" is not available`, err);
    }
  }

  onDeleted() {
    if (this._guiPulseTimeout) {
      this.homey.clearTimeout(this._guiPulseTimeout);
    }

    this.log('FingerBot device removed from Homey.');
  }
}

module.exports = FingerBot;