import { expect } from 'chai';

describe('Dummy driver test', () => {
  it('should load driver config', () => {
    const config = require('../drivers/TS0001/driver.compose.json');
    expect(config.id).to.equal('TS0001');
  });
});
