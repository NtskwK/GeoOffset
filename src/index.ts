import { createApp } from "vue";
import App from "./App.vue";
import "./index.css";

window.CESIUM_BASE_URL = "/cesium/";

import { Ion } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { createPinia } from "pinia";

// Your access token can be found at: https://ion.cesium.com/tokens.
// Replace `your_access_token` with your Cesium ion access token.

Ion.defaultAccessToken = import.meta.env.PUBLIC_CESIUM_TOKEN;

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
