<template>
  <div class="hello">
    <button v-on:click="destroyDB">Destroy Database</button>
  </div>
</template>

<script>
// import {Author} from 'iota-streams-wasm/web'

// import('iota-streams-wasm/web').then(async (streams) => {
//   // window.streams = streams;

//   console.log(streams);

//   streams.default();
//   streams.set_panic_hook();

//   console.log("Streams loaded!");
// });

import init from 'iota-streams-wasm/web/iota_streams_wasm.js'
import {SendOptions, Author, ChannelType, Subscriber, Address} from 'iota-streams-wasm/web'
import sha256 from 'crypto-js/sha256';
import enc from 'crypto-js/enc-hex';
import PouchDB from 'pouchdb-browser'
import PouchDBFind from 'pouchdb-find'


export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data() {
    return {
      db: undefined
    }
  },
  mounted() {
    this.createDB();
    this.createStream();
  },
  methods: {
    async createStream() {
      await init();
      let node = "https://chrysalis-nodes.iota.org/"
      // create sendOptions
      let options = new SendOptions(node, true);
      // create Author
      let author = new Author(this.createSeed(), options.clone(), ChannelType.MultiBranch);
      // announce the channel
      let response = await author.clone().send_announce();
      // get the announcement link
      let ann_link = response.get_link();
      // add channel to db
      this.addChannel('bsrhoad', author.channel_address(), ann_link.to_string());

      // create a Subscriber
      let sub = new  Subscriber(this.createSeed(), options.clone());
      // get the announcement link of the channel from the db
      let channel = await this.getChannel('bsrhoad');
      let channel_ann_link = channel.docs[0].link;
      // register the channel with the subscriber
      await sub.clone().receive_announcement(Address.from_string(channel_ann_link));
      console.log("Subscriber successfully registered channel? ", sub.is_registered());

      // Subscriber send subscription message
      let sub_response = await sub.clone().send_subscribe(Address.from_string(channel_ann_link));
      console.log(sub_response);
      let sub_link = sub_response.get_link();
      // add subscription to the db
      this.addSubscription('bsrhoad_sub', channel_ann_link, sub_link.to_string());

      // Author accepts & processes subsription
      let subscription = await this.getSubscription(ann_link.to_string())
      let auth_sub_link = subscription.docs[0].subscription_link; 
      await author.clone().receive_subscribe(Address.from_string(auth_sub_link));

      // Send Keyload message
      let keyload_resp = await author.clone().send_keyload_for_everyone(ann_link);
      let keyloadLink = keyload_resp.get_link();
      console.info("Keyload Link: ", keyloadLink.to_string());

      // Send Message
      await sub.clone().sync_state();
      let masked_payload = this.to_bytes("Masked Payload")
      let public_payload = this.to_bytes("Public Payload")

      let send_resp = await sub.clone().send_signed_packet(
          sub_link,
          public_payload,
          masked_payload
      );
      let msg_link = send_resp.get_link();
      console.log("New message sent by Sub at: ", msg_link.to_string());

      // Fetch message
      let next_msgs = await author.clone().fetch_next_msgs();
      for (let i = 0; i < next_msgs.length; i++) {
        console.info( "Found message number ", i+1);
        console.info(
          "Public: ",
          this.from_bytes(next_msgs[i].get_message().get_public_payload()),
          "\tMasked: ",
          this.from_bytes(next_msgs[i].get_message().get_masked_payload())
        );
      }
      
    },
    createSeed() {
      return sha256('afaijg v0ajhg gfi0ha giaqhg' + Math.random()).toString(enc);
    },
    createDB() {
      PouchDB.plugin(PouchDBFind)
      this.db = new PouchDB('mydb');
      this.db.createIndex({
        index: {fields: ['owner']}
      }).then((result) => {
        console.info(result);
      }).catch((err) => {
        console.log(err);
      });
      this.db.createIndex({
        index: {fields: ['channel_link']}
      }).then((result) => {
        console.info(result);
      }).catch((err) => {
        console.log(err);
      });
    },
    destroyDB() {
      this.db.destroy().then((response) => {
        console.info('destoying DB ', response);
      }).catch((err) => {
        console.log(err);
      })
    },
    addChannel(owner, address, link) {
      let channel = {
        _id: new Date().toISOString(),
        owner: owner,
        address: address,
        link: link
      };
      this.db.put(channel, (err, result) => {
        if (!err) {
          console.info(result);
        }
      });     
    },
    async getChannel(owner) {
      return await this.db.find({
        selector: {
          owner: owner
        }
      });
    },
    addSubscription(subscriber, channelLink, subscriptionLink) {
      let subscription = {
        _id: new Date().toISOString(),
        subscriber: subscriber,
        channel_link: channelLink,
        subscription_link: subscriptionLink
      };
      this.db.put(subscription, (err, result) => {
        if (!err) {
          console.info(result);
        }
      })
    },
    async getSubscription(channelLink) {
      return await this.db.find({
        selector: {
          channel_link: channelLink
        }
      });
    },
    to_bytes(str) {
      var bytes = [];
      for (var i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
      }
      return bytes;
    },
    from_bytes(bytes) {
      var str = "";
      for (var i = 0; i < bytes.length; ++i) {
        str += String.fromCharCode(bytes[i]);
      }
      return str;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
