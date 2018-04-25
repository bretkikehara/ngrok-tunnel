var ngrok = require('./dist/ngrok');

(async function() {
  try {
    await ngrok.init({
      config: __dirname + '/test/ngrok.yml',
      debug: true,
      tunnels: ['svr']
    });

    const tunnels = await ngrok.tunnels();
    console.log('tunnels', tunnels);

    await ngrok.exit();
  } catch (e) {
    console.error('err', e);
  }
})();
