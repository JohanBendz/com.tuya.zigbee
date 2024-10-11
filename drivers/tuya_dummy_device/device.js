'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

// Add custom cluster handling for Tuya-specific messages
Cluster.addCluster(TuyaSpecificCluster);

class TuyaDiagnosticDevice extends require('homey-zigbeedriver').ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.printNode();
/*     debug(true);
    this.enableDebug(); */

    // Attach event listeners to log incoming data from Tuya clusters
    zclNode.endpoints[1].clusters.tuya.on("reporting", async (value) => {
      await this.processDatapoint(value);
    });

    zclNode.endpoints[1].clusters.tuya.on("response", async (value) => {
      await this.processDatapoint(value);
    });
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const dataType = data.datatype;
    let parsedValue;

    // Parse the datapoint value based on the Tuya data types
    switch (dataType) {
      case 0: // Raw data
        parsedValue = data.data.toString('hex');
        break;
      case 1: // Boolean
        parsedValue = data.data.readUInt8(0);
        break;
      case 2: // 4-byte value
        parsedValue = data.data.readUInt32BE(0);
        break;
      case 3: // String
        parsedValue = data.data.toString('utf8');
        break;
      case 4: // Enum
        parsedValue = data.data.readUInt8(0);
        break;
      case 5: // Bitmap
        parsedValue = data.data.length === 1 ? data.data.readUInt8(0) :
                      data.data.length === 2 ? data.data.readUInt16BE(0) :
                      data.data.readUInt32BE(0);
        break;
      default:
        parsedValue = data.data.toString('hex');  // Default raw value
    }

    // Log the processed datapoint
    this.log(`DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

  }

  onDeleted() {
    this.log('Tuya Diagnostic Device removed');
  }
}

module.exports = TuyaDiagnosticDevice;
