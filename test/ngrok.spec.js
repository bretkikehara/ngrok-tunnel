var assert = require('assert');
var ngrok = require('../dist/ngrok');
var NGROK_TOKEN = process.env.NGROK_TOKEN;

describe('ngrok', () => {
  it('should spawn process', async () => {
    await ngrok.init({
      authToken: NGROK_TOKEN,
      config: __dirname + '/ngrok.yml',
      debug: false,
    });
    const tunnels = await ngrok.tunnels();

    assert.equal(tunnels.length, 4);

    const names = {};
    tunnels.forEach((tunnel) => {
      const name = tunnel.name.replace(/^([^ ]+) .+$/, '$1');
      names[name] = 1 + (names[name] || 0);
    });
    assert.equal(names.svr, 2);
    assert.equal(names.pxy, 2);

    await ngrok.close();
  });

  it('should fail to re-initialize process', async () => {
    await ngrok.init({
      authToken: NGROK_TOKEN,
      config: __dirname + '/ngrok.yml',
      debug: false,
    });
    try {
      await ngrok.init({
        authToken: NGROK_TOKEN,
        config: __dirname + '/ngrok.yml',
        debug: false,
      });
      throw new Error('re-initialize should not pass');
    } catch (e) {
      assert.equal(e.message, 'cannot re-initialize ngrok process');
    }
  });

  it('should fail to close a uninitialized process', async () => {
    try {
      await ngrok.close();
    } catch (e) {
      assert.equal(e.message, 'ngrok process is not initialized');
    }
    await ngrok.init({
      authToken: NGROK_TOKEN,
      config: __dirname + '/ngrok.yml',
      debug: false,
    });
    await ngrok.close();
    try {
      await ngrok.close();
    } catch (e) {
      assert.equal(e.message, 'ngrok process is not initialized');
    }
  });
});
