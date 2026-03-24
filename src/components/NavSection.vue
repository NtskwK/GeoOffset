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
  <li class="menu-group">
    <details open class="group">
      <summary
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 cursor-pointer list-none select-none"
      >
        <svg
          class="w-4 h-4 text-slate-500 transition-transform duration-200 group-open:rotate-90"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="font-medium flex-1">{{ title }}</span>
      </summary>
      <ul class="mt-1 ml-4 pl-4 border-l border-slate-700/50 space-y-1">
        <slot />
        <li>
          <button
            @click="$emit('add')"
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 border border-dashed border-slate-600 hover:border-emerald-500/50"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {{ addLabel }}
          </button>
        </li>
      </ul>
    </details>
  </li>
</template>
