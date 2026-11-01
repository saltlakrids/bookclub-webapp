import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { refreshPushSubscription, registerServiceWorker } from './push';


const app = createApp(App);

app.use(router).mount('#app');

registerServiceWorker();
refreshPushSubscription();
