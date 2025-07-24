'use strict';

const Homey = require('homey');
const { ZigbeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class switch_1_gang extends ZigbeeDevice {

    async onInit({zclNode}) {

        this.printNode();
/*     debug(true);
    this.enableDebug(); */

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

        this.registerCapability('onoff', 'genOnOff');

    }

    onDeleted(){
		this.log("1 Gang Switch removed")
	}

}

module.exports = switch_1_gang;
