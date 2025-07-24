const { ZigbeeDevice } = require('homey-meshdriver');
class Driver extends ZigbeeDevice {
  async onInit({ zclNode }) {
    await super.onInit({ zclNode });
    // capability registration here
  }
}
module.exports = Driver;

