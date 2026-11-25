'use strict';

const BaseDevice = require('../switch_4_gang_ts0004/device');
const withInputType = require('../../lib/TuyaRelayModuleInputType');

module.exports = withInputType(BaseDevice, 4);
