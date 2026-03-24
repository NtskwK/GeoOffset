<script setup lang="ts">
import CesiumView from "./CesiumView.vue";
import BottomViews from "./BottomViews/Index.vue";
import ControllerViews from "./ControllerViews/Index.vue";
</script>

<template>
  <div class="h-full flex flex-row overflow-hidden">
    <!-- 左侧主区域：3D视图 + 底部面板 -->
    <div class="flex-[3] flex flex-col h-full min-w-0">
      <!-- 3D 地图视图 -->
      <div class="flex-[5] h-full relative">
        <CesiumView />
      </div>
      <!-- 底部面板 -->
      <div class="flex-1 bg-slate-800/50 border-t border-slate-700/50 min-h-0">
        <BottomViews />
      </div>
    </div>
    <!-- 右侧控制面板 -->
    <div class="flex-1 min-h-0 bg-slate-800/80 border-l border-slate-700/50">
      <ControllerViews />
    </div>
  </div>
</template>

<style scoped></style>
