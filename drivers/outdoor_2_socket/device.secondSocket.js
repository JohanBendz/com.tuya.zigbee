'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class outdoor2socket_2 extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    this.printNode();
    
    const { subDeviceId } = this.getData();
    this.log('Device data: ', subDeviceId);

    // onOff
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: 2,
      getOpts: {
        getOnStart: true,
        pollInterval: 60000
	    }
    });
    
  }

  onDeleted() {
    this.log("Double Outdoor Smart 2 Socket removed");
  }
}

module.exports = outdoor2socket_2;
