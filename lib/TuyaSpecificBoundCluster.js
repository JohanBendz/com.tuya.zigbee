/**
 * File: TuyaSpecificBoundCluster.js
 * Version: 2.1.0 - Enhanced for 4-Gang Wall Switch
 * Date: 2025-07-11
 * Description:
 * Enhanced Tuya-specific BoundCluster for handling physical commands and state reports.
 * Supports generic data payloads, on/off commands, and attribute reports.
 */

'use strict';

const { BoundCluster } = require('zigbee-clusters');

class TuyaSpecificBoundCluster extends BoundCluster {
  constructor({ onData, onError, debug }) {
    super();
    this._onData = onData || (() => {});
    this._onError = onError || (() => {});
    this._debug = debug || { error: () => {}, info: () => {}, debug: () => {} };
    this._isActive = false;
    this._dataCount = 0;
  }

  // Generic data handler for Tuya payloads
  data(payload) {
    try {
      this._isActive = true;
      this._dataCount++;
      this._debug.debug(`Received data: DP${payload.dp} = ${payload.data}`);
      this._onData(payload);
    } catch (error) {
      this._debug.error('Data processing failed', error);
      this._onError(error);
    }
  }

  // Handle on/off commands (e.g., from physical buttons)
  on(dp) {
    try {
      this._isActive = true;
      this._dataCount++;
      this._debug.info(`Physical on command for DP${dp}`);
      this._onData({ dp, datatype: 1, data: Buffer.from([0x01]) });
    } catch (error) {
      this._debug.error('On command processing failed', error);
      this._onError(error);
    }
  }

  off(dp) {
    try {
      this._isActive = true;
      this._dataCount++;
      this._debug.info(`Physical off command for DP${dp}`);
      this._onData({ dp, datatype: 1, data: Buffer.from([0x00]) });
    } catch (error) {
      this._debug.error('Off command processing failed', error);
      this._onError(error);
    }
  }

  // Handle attribute reports (e.g., state changes)
  onAttributeReport(attributes) {
    try {
      this._isActive = true;
      this._dataCount++;
      if (attributes.dp && attributes.value !== undefined) {
        this._debug.debug(`Attribute report: DP${attributes.dp} = ${attributes.value}`);
        this._onData({ dp: attributes.dp, datatype: 1, data: Buffer.from([attributes.value ? 0x01 : 0x00]) });
      }
    } catch (error) {
      this._debug.error('Attribute report processing failed', error);
      this._onError(error);
    }
  }

  error(error) {
    this._debug.error('BoundCluster error', error);
    this._onError(error);
  }

  isActive() {
    return this._isActive;
  }

  getDataCount() {
    return this._dataCount;
  }

  reset() {
    this._isActive = false;
    this._dataCount = 0;
    this._debug.info('BoundCluster reset');
  }
}

module.exports = TuyaSpecificBoundCluster;