const { ZigBeeDevice } = require('homey-zigbeedriver');
class Driver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    // capability registration here
  }
}
module.exports = Driver;
