<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useCesiumStore } from '@/store/cesium';
import { CESIUM_HOME_POSITION, CESIUM_HOME_HEADING, CESIUM_HOME_PITCH, CESIUM_HOME_ROLL } from '@/constants';
import { Viewer, Math as CesiumMath } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const cesiumStore = useCesiumStore();

onMounted(() => {
    const newViewer = new Viewer("cesium-container", {
        // Options can go here
    });
    
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
  <div class="h-full w-full p-4">
    <div id="cesium-container" class="h-full w-full bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden"></div>
  </div>
</template>
