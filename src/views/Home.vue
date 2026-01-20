<script setup lang="ts">
import CesiumView from './CesiumView.vue';
</script>

<template>
  <div class="h-full flex flex-row overflow-hidden">
    <div class="flex-3 flex flex-col h-full">
      <div class="flex-5 h-full bg-blue-500">
        <CesiumView/>
      </div>
      <div class="flex-1  bg-yellow-500">form</div>
    </div>
    <div class="flex-1 min-h-0 p-10 bg-red-500">controller</div>
  </div>
</template>

<style scoped>
</style>
