<script setup lang="ts">
import Home from "./views/Home.vue";
import NavBar from "./views/NavBar.vue";
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-slate-900">
    <NavBar />
    <div class="flex-1 min-w-0">
      <Home />
    </div>
  </div>
</template>

<style scoped></style>
