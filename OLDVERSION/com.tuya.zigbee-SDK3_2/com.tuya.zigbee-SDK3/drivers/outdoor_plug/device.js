'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class outdoorplug extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 15000,
				getOnOnline: true,
	    }
    });

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

  }

	onDeleted(){
		this.log("Outdoor plug removed")
	}

}

module.exports = outdoorplug;