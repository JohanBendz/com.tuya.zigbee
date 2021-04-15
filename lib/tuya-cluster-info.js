    {

    //region Tuya Datapoint Functions
    _transactionID = 0;
    set transactionID(val) {
        this._transactionID = val % 256;
    }
    get transactionID() {
        return this._transactionID;
    }

    // Datatype 0: Raw
    /* return this.zclNode.endpoints[1].clusters.tuya.datapoint({
        status: 0,
        transid: this.transactionID++,
        dp,
        datatype: 0,
        length: value.length,
        data
    }); */

    // Datatype 1: Boolean
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

    // Datatype 2: int type value
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

    // Datatype 3: string
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

    // Datatype 4: enum
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

    // Datattype 5: bitmap
    /* return this.zclNode.endpoints[1].clusters.tuya.datapoint({
        status: 0,
        transid: this.transactionID++,
        dp,
        datatype: 5,
        length: 1/2/4, // Large end representation for lengths greater than 1 byte, length corresponds to the number of bytes of value
        data
    }); */

    //endregion

}