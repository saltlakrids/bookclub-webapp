import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import { createHash } from 'create-hash';

// Import the polyfills
import path from 'path-browserify';
import os from 'os-browserify/browser';
import stream from 'stream-browserify';
import crypto from 'crypto-browserify';


const app = createApp(App);

// Set up global axios instance
app.config.globalProperties.$axios = axios;

// Use router and mount the app
app.use(router).mount('#app');

// Load Environment Variables
require('dotenv').config();

// Use the polyfills
console.log(path.resolve(__dirname, 'myfile.txt'));
console.log(os.hostname());
console.log(crypto.createHash('sha256').update('my secret').digest('hex'));
console.log(stream.PassThrough); // { PassThrough }

// Create a hash object using the stream polyfill
const hash = createHash('sha256', { encoding: 'hex' });

// Update the hash with some data
hash.update('my secret');

// Get the hash digest
const digest = hash.digest();

console.log(digest);
