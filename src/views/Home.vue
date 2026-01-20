<script setup lang="ts">
import CesiumView from './CesiumView.vue';
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <p class="flex-none text-center opacity-50 text-sm">This is the Home view component.</p>
    <div class="flex-1 min-h-0 p-10">
      <CesiumView/>
    </div>
  </div>
</template>

<style scoped>
</style>
