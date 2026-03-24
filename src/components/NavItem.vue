<script setup lang="ts">
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";

defineProps<{
  label: string;
}>();

defineEmits<{
  focus: [];
  export: [];
  delete: [];
}>();

const showMenu = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const position = ref({ x: 0, y: 0 });

const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  showMenu.value = true;
  position.value = { x: e.clientX, y: e.clientY };
};

onClickOutside(menuRef, () => {
  showMenu.value = false;
});

const handleAction = (emitName: "focus" | "export" | "delete") => {
  showMenu.value = false;
  // Let the parent component handle the actual event
};
</script>

<template>
  <li 
    @contextmenu="handleContextMenu"
    class="group"
  >
    <a 
      href="#" 
      class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-all duration-200"
    >
      <svg class="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span class="truncate">{{ label }}</span>
    </a>

    <teleport to="body">
      <ul
        v-if="showMenu"
        ref="menuRef"
        class="menu bg-slate-800 w-44 rounded-lg z-[100] fixed shadow-xl border border-slate-700/50 overflow-hidden"
        :style="{ top: position.y + 'px', left: position.x + 'px' }"
      >
        <li>
          <a
            @click.stop="
              handleAction('focus');
              $emit('focus');
            "
            class="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            聚焦
          </a>
        </li>
        <li>
          <a
            @click.stop="
              handleAction('export');
              $emit('export');
            "
            class="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
          >
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            导出
          </a>
        </li>
        <li class="border-t border-slate-700/50">
          <a
            @click.stop="
              handleAction('delete');
              $emit('delete');
            "
            class="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </a>
        </li>
      </ul>
    </teleport>
  </li>
</template>
