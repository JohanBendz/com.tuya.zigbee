const { ZigBeeDriver } = require('homey-zigbeedriver');
module.exports = class extends ZigBeeDriver {
  onInit() { this.log('driver init'); }
};
