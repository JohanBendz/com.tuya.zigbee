'use strict';

const { Cluster, ZCLDataTypes} = require('zigbee-clusters');

const ATTRIBUTES = {

};

const COMMANDS = {
    datapoint: {
        id: 0,
        args: {
            'status': ZCLDataTypes.uint8,
            'transid':  ZCLDataTypes.uint8,
            'dp': ZCLDataTypes.uint8,
            'datatype': ZCLDataTypes.uint8,
            'length': ZCLDataTypes.data16,
            'data': ZCLDataTypes.buffer
        }
    },
    datapointResponse: {
        id: 1,
        args: {
            'status': ZCLDataTypes.uint8,
            'transid': ZCLDataTypes.uint8,
            'dp': ZCLDataTypes.uint8,
            'datatype': ZCLDataTypes.uint8,
            'length': ZCLDataTypes.data16,
            'data': ZCLDataTypes.buffer
        }
    }
};

class TuyaSpecificCluster extends Cluster {

    static get ID() {
        return 61184;
    }

    static get NAME() {
        return 'tuya';
    }

    static get ATTRIBUTES() {
        return ATTRIBUTES;
    }

    static get COMMANDS() {
        return COMMANDS;
    }

    onDatapointResponse(args) {

    }

}

Cluster.addCluster(TuyaSpecificCluster);

module.exports = TuyaSpecificCluster;