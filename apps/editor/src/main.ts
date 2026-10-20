import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { setupGlobalErrorHandlers } from './utils/errorHandler';
import './index.css';

const app = createApp(App);
const pinia = createPinia();

setupGlobalErrorHandlers(app);

app.use(pinia);
app.use(router);
app.mount('#root');
