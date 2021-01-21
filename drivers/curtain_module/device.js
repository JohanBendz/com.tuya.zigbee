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

    }

    onDeleted(){
		this.log("Curtain Module removed")
	}

}

module.exports = curtainmodule;