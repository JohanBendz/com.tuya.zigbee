'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class curtainmodule extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

        this.enableDebug();
        debug(true);
        this.printNode();

        this._reportDebounceEnabled = false;
        
        this.registerCapability('windowcoverings_set', CLUSTER.WINDOW_COVERING, {
            reportOpts: {
            configureAttributeReporting: {
                minInterval: 0, // No minimum reporting interval
                maxInterval: 30000, // Maximally every ~8 hours
                minChange: 5, // Report when value changed by 5
            },
            },
        });

        // Calibration
        if (!this.hasCapability('button.start_calibration')) await this.addCapability('button.start_calibration');
        if (!this.hasCapability('button.stop_calibration')) await this.addCapability('button.stop_calibration');
        
        if (this.hasCapability('button.start_calibration')) {
            this.registerCapabilityListener('button.start_calibration', async () => {
                await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({calibration: 1});
                this.log("Calibration start, status: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(calibration));
                return;
            });
            this.registerCapabilityListener('button.stop_calibration', async () => {
                await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({calibration: 0});
                this.log("Calibration stopped, status: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(calibration));
                return;
            });
        }

    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {

        if (changedKeys.includes('reverse')) {

            const motorReversed = newSettings['reverse'];
            if (motorReversed === 0) {
                await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({motorReversal: 0});
                this.log("Calibration stopped, status: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(motorReversal));
            } else {
                await this.zclNode.endpoints[1].clusters.windowCovering.writeAttributes({motorReversal: 1});
                this.log("Calibration stopped, status: ", await this.zclNode.endpoints[1].clusters.windowCovering.readAttributes(motorReversal));
            }

        }

    }

    onDeleted(){
		this.log("Curtain Module removed")
	}

}

module.exports = curtainmodule;