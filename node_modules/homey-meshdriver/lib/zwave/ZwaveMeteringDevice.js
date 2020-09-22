'use strict';

const ZwaveDevice = require('./ZwaveDevice');

/**
 * The ZwaveMeteringDevice class. Warning, the METER_RESET FlowCardAction should not be used, remove the FlowCard from your app manifest
 * @extends ZwaveDevice
 * @example
 *
 * // device.js
 * const ZwaveMeteringDevice = require('homey-meshdriver').ZwaveMeteringDevice;
 *
 * class myDevice extends ZwaveMeteringDevice {
 *
 *  async onMeshInit() {
 *      await super.onMeshInit();
 *      this.registerCapability('measure_power', 'METER');
 *      this.registerCapability('meter_power', 'METER');
 *  }
 * }
 *
 */
class ZwaveMeteringDevice extends ZwaveDevice {
	async onMeshInit() {
		this.log('WARNING: the METER_RESET FlowCardAction should not be used, remove the FlowCard from your app manifest.');
	}
}

module.exports = ZwaveMeteringDevice;
