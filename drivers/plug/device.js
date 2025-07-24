'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class plug extends ZigbeeDevice {
		
	async onInit({zclNode}) {

    this.printNode();

    this.registerCapability('onoff', 'genOnOff', {
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
		this.log("Plug removed")
	}

}

module.exports = plug;
