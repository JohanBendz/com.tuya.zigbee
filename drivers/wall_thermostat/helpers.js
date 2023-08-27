const getDataValue = (dpValue) => {
    const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
        let value = 0;

        for (let i = 0; i < chunks.length; i++) {
            value = value << 8;
            value += chunks[i];
        }

        return value;
    };

    switch (dpValue.datatype) {
        case TUYA_DATA_TYPES.raw:
            return dpValue.data;
        case TUYA_DATA_TYPES.bool:
            return dpValue.data[0] === 1;
        case TUYA_DATA_TYPES.value:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
        case TUYA_DATA_TYPES.string:
            let dataString = '';
            for (let i = 0; i < dpValue.data.length; ++i) {
                dataString += String.fromCharCode(dpValue.data[i]);
            }
            return dataString;
        case TUYA_DATA_TYPES.enum:
            return dpValue.data[0];
        case TUYA_DATA_TYPES.bitmap:
            return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    }
}

const TUYA_DATA_TYPES = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

module.exports = { getDataValue }
