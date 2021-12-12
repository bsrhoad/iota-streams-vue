import { createApp } from 'vue'
import App from './App.vue'
// import Streams from './plugins/iota-streams'

const app = createApp(App)
// app.use(Streams, {url:"https://chrysalis-nodes.iota.org/"})
app.mount('#app')
