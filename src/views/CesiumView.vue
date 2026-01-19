<script setup lang="ts">
import { Viewer } from 'cesium';
import { onMounted, onUnmounted } from 'vue';
import { useCesiumStore } from '@/store/cesium';
import { CESIUM_HOME_POSITION, CESIUM_HOME_HEADING, CESIUM_HOME_PITCH } from '@/constants';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const cesiumStore = useCesiumStore();

onMounted(() => {
    const newViewer = new Viewer("cesium-container", {
        // Options can go here
    });
    
    // Set initial camera position and orientation
    newViewer.camera.setView({
        destination: CESIUM_HOME_POSITION,
        orientation: {
            heading: CESIUM_HOME_HEADING,
            pitch: CESIUM_HOME_PITCH,
            roll: 0,
        },
    });
    
    cesiumStore.setViewer(newViewer);
});

onUnmounted(() => {
    cesiumStore.destroyViewer();
});
</script>

<template>
  <div class="h-full w-full p-4">
    <div id="cesium-container" class="h-full w-full bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden"></div>
  </div>
</template>
