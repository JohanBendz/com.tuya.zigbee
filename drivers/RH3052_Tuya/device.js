const { ZigBeeDevice } = require('homey-zigbeedriver');
class Driver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // capabilities
  }
}
module.exports = Driver;
