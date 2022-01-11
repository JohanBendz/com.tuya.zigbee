const {ZigBeeDevice} = require("homey-zigbeedriver");

/**
 * @abstract
 */
class TuyaSpecificDevice extends ZigBeeDevice {
  _transactionID = 0;

  set transactionID(val) {
    this._transactionID = val % 256;
  }

  get transactionID() {
    return this._transactionID;
  }

  async writeEnum(dp, value) {
    const data = Buffer.alloc(1);
    data.writeUInt8(value, 0);
    return this.zclNode.endpoints[1].clusters.tuya.datapoint({
      status: 0,
      transid: this.transactionID++,
      dp,
      datatype: 4,
      length: 1,
      data
    });
  }

  async writeData32 (dp, value) {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(value,0);
    return this.zclNode.endpoints[1].clusters.tuya.datapoint({
      status: 0,
      transid: this.transactionID++,
      dp,
      datatype: 2,
      length: 4,
      data
    });
  }

  async writeString(dp, value) {
    const data = Buffer.from(String(value),'latin1');
    return this.zclNode.endpoints[1].clusters.tuya.datapoint({
      status: 0,
      transid: this.transactionID++,
      dp,
      datatype: 3,
      length: value.length,
      data
    });
  }

  async writeBool(dp, value) {
    const data = Buffer.alloc(1);
    data.writeUInt8(value ? 0x01 : 0x00,0);
    return this.zclNode.endpoints[1].clusters.tuya.datapoint({
      status: 0,
      transid: this.transactionID++,
      dp,
      datatype: 1,
      length: 1,
      data
    });
  }
}

module.exports = TuyaSpecificDevice;
