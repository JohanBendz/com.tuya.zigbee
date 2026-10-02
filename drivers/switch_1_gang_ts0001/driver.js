'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// Exact-identity pairing for independently interviewed TS0001 relays.
class Ts0001SingleGangDriver extends ZigBeeDriver {}

module.exports = Ts0001SingleGangDriver;
