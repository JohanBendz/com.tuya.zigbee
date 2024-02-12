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

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    onDeleted(){
		this.log("Wall mounted curtain switch removed")
	}

}

module.exports = wallcurtainswitch;
