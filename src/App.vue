<script setup lang="ts">
import Home from './views/Home.vue'
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden bg-[#020917] text-white">
    <header class="flex-none pt-8 pb-4 text-center">
      <h1 class="text-4xl font-bold m-0">Rsbuild with Vue</h1>
      <p class="text-lg opacity-50 m-2">Start building amazing things with Rsbuild.</p>
    </header>
    <main class="flex-1 min-h-0 overflow-hidden">
      <Home />
    </main>
  </div>
</template>

<style scoped>
/* 移除之前的样式，改用 Tailwind */
</style>
