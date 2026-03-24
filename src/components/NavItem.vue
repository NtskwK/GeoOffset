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
  <li @contextmenu="handleContextMenu">
    <a href="#">{{ label }}</a>

    <teleport to="body">
      <ul
        v-if="showMenu"
        ref="menuRef"
        class="menu bg-base-200 w-48 rounded-box z-[100] fixed shadow-lg"
        :style="{ top: position.y + 'px', left: position.x + 'px' }"
      >
        <li>
          <a
            @click.stop="
              handleAction('focus');
              $emit('focus');
            "
            >🔴 Focus</a
          >
        </li>
        <li>
          <a
            @click.stop="
              handleAction('export');
              $emit('export');
            "
            >📤 Export</a
          >
        </li>
        <li class="text-error">
          <a
            @click.stop="
              handleAction('delete');
              $emit('delete');
            "
            >🗑️ Delete</a
          >
        </li>
      </ul>
    </teleport>
  </li>
</template>
