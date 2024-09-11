'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");

Cluster.addCluster(TuyaSpecificCluster);

class dimmer_1_gang_tuya extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.printNode();
    debug(true);

    await zclNode.endpoints[1].clusters.basic.readAttributes('manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus')
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

    // Listen for Tuya-specific reports (manual state changes)
    zclNode.endpoints[1].clusters[TuyaSpecificCluster.NAME].on('report', (report) => {
      this.log('Received Tuya-specific report:', report);

      if (report.dp === 1) {
        const onOffState = report.data[0] === 1;
        this.setCapabilityValue('onoff', onOffState).catch(this.error);
        this.log('onoff updated to:', onOffState);
      }

      if (report.dp === 2) {
        const dimLevel = report.data[0] / 1000; // Scaling back from 0-1000 to 0-1
        this.setCapabilityValue('dim', dimLevel).catch(this.error);
        this.log('dim updated to:', dimLevel);
      }
    });

    this.registerCapabilityListener('onoff', async value => {
      this.log('onoff: ', value);
      await this.writeBool(1, value);
    });

    this.registerCapabilityListener('dim', async value => {
        this.log("brightness: ", value * 1000);
        await this.writeData32(2, value * 1000);
    });
  }

  onDeleted() {
    this.log('1 Gang Dimmer removed');
  }

}

module.exports = dimmer_1_gang_tuya;
