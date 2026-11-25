'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function resolveHomey(request, ...args) {
  return request === 'homey' ? 'homey' : resolve.call(this, request, ...args);
};
require.cache.homey = { id: 'homey', loaded: true, exports: { Device: class {}, Driver: class {} } };
const app = require('../app.json');
const Frame = require('zigbee-clusters').ZCLStruct('test.trv', require('../lib/TuyaSpecificCluster').COMMANDS.reporting.args);

async function pairValve(Device) {
  const device = Object.create(Device.prototype);
  const handlers = {}, values = new Map(), tuya = new EventEmitter(), sent = [];
  device._transactionID = 0;
  device.zclNode = { endpoints: { 1: { clusters: { tuya } } } };
  device.getCapabilityValue = id => values.get(id);
  device.setCapabilityValue = async (id, value) => { values.set(id, value); };
  device.registerCapabilityListener = (id, fn) => { handlers[id] = fn; };
  device.error = assert.fail;
  await device.onNodeInit({ zclNode: device.zclNode });
  tuya.datapoint = async frame => { sent.push(new Frame(frame).toBuffer().toString('hex')); };
  return { handlers, values, sent, tuya, emit: (hex, event = 'reporting') =>
    tuya.emit(event, Frame.fromBuffer(Buffer.from('0001' + hex, 'hex'))) };
}

function exactProfile(manufacturer, id) {
  const owners = app.drivers.filter(d => [].concat(d.zigbee?.manufacturerName || []).includes(manufacturer)
    && [].concat(d.zigbee?.productId || []).includes('TS0601'));
  assert.deepEqual(owners.map(d => d.id), [id]);
  assert.deepEqual(owners[0].zigbee.manufacturerName, [manufacturer]);
  assert.deepEqual(owners[0].zigbee.productId, ['TS0601']);
  return owners[0];
}

test('TRV602Z exposes a writable setpoint and independently reported heat, opening and battery', async () => {
  const driver = exactProfile('_TZE204_ltwbm23f', 'radiator_trv602z');
  assert.deepEqual(driver.capabilities, ['target_temperature', 'measure_temperature', 'thermostat_heating',
    'measure_battery', 'measure_valve_opening']);
  assert.equal(app.capabilities.measure_valve_opening.setable, false);
  const { handlers, values, sent, emit, tuya } = await pairValve(require('../drivers/radiator_trv602z/device'));
  for (const temp of [5, 20.5, 35]) await handlers.target_temperature(temp);
  assert.deepEqual(sent, ['00000402000400000032', '000104020004000000cd', '0002040200040000015e']);
  for (const temp of [4.5, 35.5, 20.25, Infinity]) await assert.rejects(handlers.target_temperature(temp));
  assert.equal(values.size, 0);
  emit('04020004000000cd05020004ffffffd80602000400000000');
  emit('030400010172020004000001f4');
  assert.deepEqual([...values], [['target_temperature', 20.5], ['measure_temperature', -4], ['measure_battery', 0],
    ['thermostat_heating', true], ['measure_valve_opening', 50]]);
  emit('72020004000003e9');
  emit('0602000400000065');
  emit('0402000400000000');
  emit('0304000102');
  assert.equal(values.get('measure_valve_opening'), 50);
  assert.equal(values.get('measure_battery'), 0);
  assert.equal(values.get('target_temperature'), 20.5);
  assert.equal(values.get('thermostat_heating'), true);
  tuya.datapoint = async () => { throw new Error('offline'); };
  await assert.rejects(handlers.target_temperature(21), /offline/);
  emit('04020004000000b9', 'response');
  assert.equal(values.get('target_temperature'), 18.5);
});
