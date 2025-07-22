'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER, Cluster, ZCLDataTypes} = require('zigbee-clusters');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');

Cluster.addCluster(TuyaOnOffCluster);

class wall_switch_1_gang extends ZigBeeDevice {

  async onNodeInit({zclNode}) {

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF);

    try {
        const indicatorMode = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['indicatorMode']);     
        this.log("Indicator Mode supported by device");
        await this.setSettings({
          indicator_mode: ZCLDataTypes.enum8IndicatorMode.args[0][indicatorMode.indicatorMode].toString()
        });
    } catch (error) {
      this.log("This device does not support Indicator Mode", error);
    }
  
    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

  }

  onDeleted(){
		this.log("1 Gang Wall Switch removed")
	}

  async onSettings({oldSettings, newSettings, changedKeys}) {
    let parsedValue = 0;
    if (changedKeys.includes('indicator_mode')) {
      parsedValue = parseInt(newSettings.indicator_mode);
      await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({ indicatorMode: parsedValue });
    }
  }
  
}

module.exports = wall_switch_1_gang;