<script setup lang="ts">
defineProps<{
  title: string;
  addLabel: string;
}>();

defineEmits<{
  add: [];
}>();
</script>

<template>
  <li>
    <details open>
      <summary>{{ title }}</summary>
      <ul>
        <slot />
        <button @click="$emit('add')" class="btn btn-success btn-square w-full">
          {{ addLabel }}
        </button>
      </ul>
    </details>
  </li>
</template>
