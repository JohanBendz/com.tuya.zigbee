const dataPoints = {
    pir_state: 1,
    battery_percentage: 4,
    interval_time: 102,
    pir_sensitivity: 9,
    pir_time: 10,
    illuminance_value: 12
}

const dataTypes = {
    value: 2, // [ 4 byte value ]
    enum: 4, // [ 0-255 ]
};

const getDataValue = (dpValue) => {
    switch (dpValue.datatype) {
        case dataTypes.value:
            return parseInt(dpValue.data.toString('hex'), 16);
        case dataTypes.enum:
            return dpValue.data[0];
    }
}

module.exports = {
    dataPoints,
    getDataValue
}
