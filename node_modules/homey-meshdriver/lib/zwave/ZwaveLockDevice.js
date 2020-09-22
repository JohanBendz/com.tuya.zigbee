'use strict';

const Homey = require('homey');
const ZwaveDevice = require('./ZwaveDevice');

/**
 * The ZwaveLockDevice class has built-in functionality for the lockJammed FlowCardTrigger. Note: this FlowCardAction
 * will only be triggered if the NOTIFICATION command class is registered for the 'locked' capability.
 * @extends ZwaveDevice
 * @example
 *
 * // device.js
 * const ZwaveLockDevice = require('homey-meshdriver').ZwaveLockDevice;
 *
 * class myDevice extends ZwaveLockDevice {
 *
 *  async onMeshInit() {
 *      await super.onMeshInit();
 *      this.registerCapability('locked', 'DOOR_LOCK');
 *      this.registerCapability('locked', 'NOTIFICATION');
 *      this.registerCapability('measure_battery', 'BATTERY');
 *  }
 * }
 *
 * // app.json (or see zwave/system/flows.json)
 * flow: {
 *      triggers: [
 *          {
 *              "id": "lockJammed",
 *              "title": {
 *                  "en": "The lock is jammed",
 *                  "nl": "Het slot is geblokkeerd"
 *              },
 *              "hint": {
 *                  "en": "While trying to close the lock something obstructed the lock from closing completely.",
 *                  "nl": "Tijdens het sluiten van het slot blokkeerde er iets waardoor het slot niet kon worden gesloten."
 *              },
 *              "args": [
 *                  {
 *                      "name": "device",
 *                      "type": "device",
 *                      "filter": "<driver_id>"
 *                  }
 *              ]
 *          }
 *      ]
 * }
 */
class ZwaveLockDevice extends ZwaveDevice {
	async onMeshInit() {

		// Register Flow card trigger
		const lockJammedFlowTrigger = new Homey.FlowCardTriggerDevice('lockJammed');
		lockJammedFlowTrigger.register();

		// Check if Flow card is registered in app manifest
		if (!(lockJammedFlowTrigger instanceof Error)) {

			// Handle lock jammed notification
			this.on('lockJammedNotification', async () => {
				this.log('lock jammed notification');
				try {
					await lockJammedFlowTrigger.trigger(this, {}, {});
				} catch (err) {
					this.error('failed_to_trigger_lock_jammed_flow', err);
				}
			});
		} else this.error('missing_lockJammed_flow_card_in_manifest');
	}
}

module.exports = ZwaveLockDevice;
