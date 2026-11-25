'use strict';

// Homey may still be saving a previous report when an identical report or
// the opposite transition arrives. Preserve edge order independently per tile.
const pendingByDevice = new WeakMap();

module.exports = function updateReportedValue(device, id, value) {
  let pending = pendingByDevice.get(device);
  if (!pending) {
    pending = new Map();
    pendingByDevice.set(device, pending);
  }
  const prior = pending.get(id);
  if (prior ? prior.value === value : device.getCapabilityValue(id) === value) return;
  const entry = { value };
  pending.set(id, entry);
  const write = async () => device.setCapabilityValue(id, value);
  entry.done = (prior ? prior.done.then(write) : write())
    .catch(error => device.error(error))
    .finally(() => {
      if (pending.get(id) === entry) pending.delete(id);
    });
};
