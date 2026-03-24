<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useCesiumStore } from "@/store/cesium";
import {
  CESIUM_HOME_POSITION,
  CESIUM_HOME_HEADING,
  CESIUM_HOME_PITCH,
  CESIUM_HOME_ROLL,
} from "@/constants";
import { Viewer, Math as CesiumMath, UrlTemplateImageryProvider } from "cesium";
import { getBaseMapList } from "@/api/basemap";
import BaseLayerPicker from "@/components/BaseLayerPicker.vue";
import "cesium/Build/Cesium/Widgets/widgets.css";

const cesiumStore = useCesiumStore();

onMounted(() => {
  // 使用第一个底图作为默认底图
  const baseMaps = getBaseMapList();
  const defaultBaseMap = baseMaps[0];

  const newViewer = new Viewer("cesium-container", {
    baseLayerPicker: false,
    homeButton: true,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    navigationHelpButton: false,
    geocoder: false,
  });

  // 添加默认底图（插入到最底层）
  const imageryProvider = new UrlTemplateImageryProvider({
    url: defaultBaseMap.url,
    maximumLevel: defaultBaseMap.maxLevel ?? 18,
  });
  const baseImageryLayer = newViewer.imageryLayers.addImageryProvider(imageryProvider);
  // 保存底图引用到 store
  cesiumStore.setBaseLayer(baseImageryLayer);

  const initialOrientation = {
    heading: CesiumMath.toRadians(CESIUM_HOME_HEADING),
    pitch: CesiumMath.toRadians(CESIUM_HOME_PITCH),
    roll: CesiumMath.toRadians(CESIUM_HOME_ROLL),
  };

  // Set initial camera position and orientation
  newViewer.camera.setView({
    destination: CESIUM_HOME_POSITION,
    orientation: initialOrientation,
  });

  // Override Home button behavior
  if (newViewer.homeButton) {
    newViewer.homeButton.viewModel.command.beforeExecute.addEventListener((commandInfo) => {
      commandInfo.cancel = true;
      newViewer.camera.flyTo({
        destination: CESIUM_HOME_POSITION,
        orientation: initialOrientation,
      });
    });
  }

  cesiumStore.setViewer(newViewer);
});

onUnmounted(() => {
  cesiumStore.destroyViewer();
});
</script>

<template>
  <div class="h-full w-full p-4 relative">
    <div
      id="cesium-container"
      class="h-full w-full bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden"
    ></div>

    <!-- 自定义底图选择器 -->
    <div class="absolute bottom-8 right-8">
      <BaseLayerPicker />
    </div>
  </div>
</template>

<style scoped>
/* Hide Cesium credits Logo */
#cesium-container :deep(.cesium-widget-credits) {
  display: none !important;
}
</style>
