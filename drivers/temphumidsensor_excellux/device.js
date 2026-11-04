'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const StandardSensor = require('../temphumidsensor3/device');
const { inspect, measurements, samplingFrame } = require('./protocol');

class ExcelluxSensor extends StandardSensor {
  async onNodeInit({ zclNode, node = this.node }) {
    this._detachExcellux();
    this._excelluxListeners = [];
    if (!this.hasCapability('measure_temperature.internal')) {
      await this.addCapability('measure_temperature.internal');
    }
    await this.setEnergy({ batteries: ['CR2450'] });
    // Install listeners only: standard init configures reporting and can block sleepy pairing.
    const endpoint = zclNode.endpoints[1];
    for (const [cluster, attribute, handler] of [
      [CLUSTER.TEMPERATURE_MEASUREMENT, 'measuredValue', this.onTemperatureMeasuredAttributeReport],
      [CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, 'measuredValue', this.onRelativeHumidityMeasuredAttributeReport],
      [CLUSTER.POWER_CONFIGURATION, 'batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport],
    ]) {
      const instance = endpoint.clusters[cluster.NAME];
      const listener = handler.bind(this);
      instance.on(`attr.${attribute}`, listener);
      this._excelluxListeners.push([instance, `attr.${attribute}`, listener]);
    }
    // EF00 is output/client only. Do not register a shared cluster or add a bind request.
    this._excelluxNode = node;
    this._previousFrameHandler = node.handleFrame;
    this._excelluxFrameHandler = async (endpointId, clusterId, frame, meta) => {
      if (endpointId !== 1 || clusterId !== 0xEF00) {
        return this._previousFrameHandler.call(node, endpointId, clusterId, frame, meta);
      }
      const decoded = inspect(frame);
      if (decoded.error) { this.error('Invalid Excellux datapoint frame:', decoded.error); return; }
      const values = measurements(decoded);
      if (values.probe !== undefined) this.onTemperatureMeasuredAttributeReport(Math.round(values.probe * 100));
      if (values.humidity !== undefined) this.onRelativeHumidityMeasuredAttributeReport(Math.round(values.humidity * 100));
      if (values.battery !== undefined) this.onBatteryPercentageRemainingAttributeReport(values.battery * 2);
      if (values.internal !== undefined) {
        const decimals = this.getSetting('temperature_decimals') === '2' ? 100 : 10;
        const value = Math.round(values.internal * decimals) / decimals;
        await this.setCapabilityValue('measure_temperature.internal', value).catch(error => this.error(error));
      }
      if (values.sampling !== undefined) {
        this._samplingConfirmation = `Sensor reported ${values.sampling} seconds`;
        this._scheduleSamplingStatus();
      }
    };
    node.handleFrame = this._excelluxFrameHandler;
  }

  // Preserve the existing shared formatting, offsets and low-battery behavior,
  // while rejecting ZCL unknown values before they reach capabilities.
  onTemperatureMeasuredAttributeReport(value) {
    if (Number.isInteger(value) && value >= -4000 && value <= 12000) {
      super.onTemperatureMeasuredAttributeReport(value);
    }
  }

  onRelativeHumidityMeasuredAttributeReport(value) {
    if (Number.isInteger(value) && value >= 0 && value <= 10000) {
      super.onRelativeHumidityMeasuredAttributeReport(value);
    }
  }

  onBatteryPercentageRemainingAttributeReport(value) {
    if (Number.isInteger(value) && value >= 0 && value <= 200) {
      super.onBatteryPercentageRemainingAttributeReport(value);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    if (!changedKeys.includes('sampling_interval')) return;
    if (!this._excelluxNode) throw new Error('Zigbee is not ready; wake the sensor and retry.');
    if (this._samplingPending) throw new Error('A sampling request is already running.');
    // The settings callback must not recursively call setSettings.
    this._samplingPending = true;
    try {
      this._sequence = ((this._sequence || 0) + 1) & 65535;
      const frame = samplingFrame(newSettings.sampling_interval, this._sequence);
      await this._excelluxNode.sendFrame(1, 0xEF00, frame);
      // Sending does not prove the firmware accepted it. Only an incoming DP101 confirms.
      if (!this._samplingConfirmation) this._samplingConfirmation = 'Awaiting a sensor report';
    } finally {
      this._samplingPending = false;
      this._scheduleSamplingStatus();
    }
  }

  _scheduleSamplingStatus() {
    if (this._samplingStatusTimer || !this._samplingConfirmation) return;
    this._samplingStatusTimer = this.homey.setTimeout(() => {
      this._samplingStatusTimer = null;
      if (this._samplingPending) { this._scheduleSamplingStatus(); return; }
      this.setSettings({ sampling_confirmation: this._samplingConfirmation })
        .catch(error => this.error('Could not update sampling confirmation:', error));
    }, 1000);
  }

  _detachExcellux() {
    if (this._samplingStatusTimer) this.homey.clearTimeout(this._samplingStatusTimer);
    this._samplingStatusTimer = null;
    for (const [cluster, event, listener] of this._excelluxListeners || []) {
      cluster.removeListener(event, listener);
    }
    this._excelluxListeners = [];
    if (this._excelluxNode && this._excelluxNode.handleFrame === this._excelluxFrameHandler) {
      this._excelluxNode.handleFrame = this._previousFrameHandler;
    }
    this._excelluxNode = null;
  }

  onUninit() { this._detachExcellux(); }
  onDeleted() {
    this._detachExcellux();
    return ZigBeeDevice.prototype.onDeleted.call(this);
  }
}

module.exports = ExcelluxSensor;
