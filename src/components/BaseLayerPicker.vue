<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useCesiumStore } from "@/store/cesium";
import { getBaseMapList, type BaseMap } from "@/api/basemap";
import { UrlTemplateImageryProvider } from "cesium";

const cesiumStore = useCesiumStore();
const isOpen = ref(false);
const baseMaps = getBaseMapList();
const selectedIndex = ref(0);

const selectedBaseMap = computed(() => baseMaps[selectedIndex.value]);

const togglePicker = () => {
  isOpen.value = !isOpen.value;
};

const selectBaseMap = async (index: number) => {
  selectedIndex.value = index;
  isOpen.value = false;

  const viewer = cesiumStore.viewer;
  const currentBaseLayer = cesiumStore.getBaseLayer();
  if (!viewer) return;

  const baseMap = baseMaps[index];

  // 创建新的影像提供者
  const imageryProvider = new UrlTemplateImageryProvider({
    url: baseMap.url,
    maximumLevel: baseMap.maxLevel ?? 18,
  });

  // 移除旧底图（如果存在）
  if (currentBaseLayer) {
    viewer.imageryLayers.remove(currentBaseLayer);
  }

  // 添加新底图到最底层（index 0）
  const newBaseLayer = viewer.imageryLayers.addImageryProvider(imageryProvider, 0);
  // 更新 store 中的底图引用
  cesiumStore.setBaseLayer(newBaseLayer);
};

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".base-layer-picker")) {
    isOpen.value = false;
  }
};

// 监听全局点击
watch(isOpen, (open) => {
  if (open) {
    document.addEventListener("click", handleClickOutside);
  } else {
    document.removeEventListener("click", handleClickOutside);
  }
});
</script>

<template>
  <div class="base-layer-picker relative">
    <!-- 主按钮 -->
    <button
      @click.stop="togglePicker"
      class="flex items-center justify-center w-10 h-10 bg-slate-800/90 hover:bg-slate-700/90 rounded-lg shadow-lg border border-slate-600/50 transition-all duration-200 group"
      :class="{ 'ring-2 ring-blue-500/50': isOpen }"
      title="切换底图"
    >
      <svg
        class="w-5 h-5 text-slate-300 group-hover:text-white transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      </svg>
    </button>

    <!-- 下拉面板 -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-show="isOpen"
        class="absolute bottom-full right-0 mb-2 w-56 bg-slate-800/95 rounded-xl shadow-2xl border border-slate-600/50 overflow-hidden backdrop-blur-sm"
      >
        <!-- 标题 -->
        <div class="px-4 py-3 border-b border-slate-600/50">
          <h3 class="text-sm font-semibold text-slate-200">选择底图</h3>
        </div>

        <!-- 底图列表 -->
        <div class="p-2 space-y-1">
          <button
            v-for="(baseMap, index) in baseMaps"
            :key="baseMap.name"
            @click="selectBaseMap(index)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group"
            :class="[
              selectedIndex === index
                ? 'bg-blue-500/20 border border-blue-500/50'
                : 'hover:bg-slate-700/50 border border-transparent',
            ]"
          >
            <!-- 缩略图占位 -->
            <div
              class="w-10 h-10 rounded-md flex items-center justify-center text-xs font-medium"
              :class="[
                selectedIndex === index
                  ? 'bg-blue-500/30 text-blue-300'
                  : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600',
              ]"
            >
              {{ baseMap.name.charAt(0) }}
            </div>

            <!-- 信息 -->
            <div class="flex-1 text-left">
              <div
                class="text-sm font-medium"
                :class="
                  selectedIndex === index
                    ? 'text-blue-300'
                    : 'text-slate-300 group-hover:text-slate-200'
                "
              >
                {{ baseMap.name }}
              </div>
              <div class="text-xs text-slate-500">最大层级: {{ baseMap.maxLevel || 18 }}</div>
            </div>

            <!-- 选中指示器 -->
            <div v-if="selectedIndex === index" class="w-2 h-2 rounded-full bg-blue-400" />
          </button>
        </div>

        <!-- 当前选中信息 -->
        <div class="px-4 py-2.5 bg-slate-900/50 border-t border-slate-600/50">
          <div class="text-xs text-slate-500">
            当前: <span class="text-slate-300">{{ selectedBaseMap.name }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.base-layer-picker {
  z-index: 100;
}
</style>
