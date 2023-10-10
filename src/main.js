import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import { createHash } from 'create-hash';

import path from 'path-browserify';
import os from 'os-browserify/browser';
import stream from 'stream-browserify';
import crypto from 'crypto-browserify';


const app = createApp(App);

app.config.globalProperties.$axios = axios;


app.use(router).mount('#app');


require('dotenv').config();


console.log(path.resolve(__dirname, 'myfile.txt'));
console.log(os.hostname());
console.log(crypto.createHash('sha256').update('my secret').digest('hex'));
console.log(stream.PassThrough); 

const hash = createHash('sha256', { encoding: 'hex' });

hash.update('my secret');

const digest = hash.digest();

console.log(digest);
