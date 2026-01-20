<script setup lang="ts">
import Home from './views/Home.vue'
import NavBar from './views/NavBar.vue'
</script>

<template>
  <div class="flex flex-row h-screen w-screen overflow-hidden text-white">
    <NavBar/>
    <div class="flex flex-1">
      <div class="flex flex-col w-full">
    <header class="pt-8 pb-4 text-center">
      <h1 class="text-4xl font-bold m-0">Rsbuild with Vue</h1>
      <p class="text-lg opacity-50 m-2">Start building amazing things with Rsbuild.</p>
    </header>
    <main class="flex-1 min-h-0 overflow-hidden">
      <Home />
    </main>
  </div></div></div>
</template>

<style scoped>
/* 移除之前的样式，改用 Tailwind */
</style>
