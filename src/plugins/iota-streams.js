import * as Streams from 'iota-streams-wasm/web';

export  default {
  install:  (app, options) => {
    app.config.globalProperties.$iota_streams = new Streams.SendOptions(options.url, true);
  }
}