import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';

const app = createApp(App);

// Set up global axios instance
app.config.globalProperties.$axios = axios;

// Use router and mount the app
app.use(router).mount('#app');
