'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');

class wallcurtainswitch extends ZigBeeDevice {

    async onNodeInit({zclNode}) {

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
		this.log("Wall mounted curtain switch removed")
	}

}

module.exports = wallcurtainswitch;
