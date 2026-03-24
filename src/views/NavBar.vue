<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { useCesiumStore } from "@/store/cesium";
import { addRasterToMap, addVectorToMap, addEntitiesToMap } from "@/utils";
import NavSection from "@/components/NavSection.vue";
import NavItem from "@/components/NavItem.vue";
import type { ImageryLayer, DataSource, Entity } from "cesium";

const cesiumStore = useCesiumStore();

const rasterLayers = ref<ImageryLayer[]>([]);
const vectorDataSources = ref<DataSource[]>([]);
const entities = ref<Entity[]>([]);

// 通过隐藏的 input 让用户选择文件
const pickFiles = (accept: string, multiple = true): Promise<File[]> => {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : [];
      resolve(files);
    };
    input.click();
  });
};

const handleAddRaster = async () => {
  const files = await pickFiles(".tif,.tiff,.iso");
  if (files.length) addRasterToMap(files);
};

const handleAddVector = async () => {
  const files = await pickFiles(".geojson,.json,.kml,.kmz,.gpx,.topojson,.zip", false);
  if (files.length) addVectorToMap(files);
};

const handleAddEntity = async () => {
  const files = await pickFiles(".gltf,.glb,.obj,.fbx,.3ds");
  if (files.length) addEntitiesToMap(files);
};

// 用于存储事件移除函数
const removeListeners: (() => void)[] = [];

const refreshRasterLayers = () => {
  const viewer = cesiumStore.viewer;
  if (!viewer) return;

  const layers = viewer.imageryLayers;
  const result = [];
  // 排除底图图层，只显示用户导入的栅格
  for (let i = 0; i < layers.length; i++) {
    const layer = layers.get(i);
    if (!layer.isBaseLayer) {
      result.push(layer);
    }
  }
  rasterLayers.value = result;
};

const refreshVectorDataSources = () => {
  const viewer = cesiumStore.viewer;
  if (!viewer) return;
  const ds = viewer.dataSources;
  const result = [];
  for (let i = 0; i < ds.length; i++) {
    result.push(ds.get(i));
  }
  vectorDataSources.value = result;
};

const refreshEntities = () => {
  const viewer = cesiumStore.viewer;
  if (!viewer) return;
  entities.value = [...viewer.entities.values];
};

// 监听底图变化，刷新栅格列表
watch(
  () => cesiumStore.baseLayer,
  () => {
    refreshRasterLayers();
  },
);

// 监听 viewer 变化，绑定 Cesium 事件
watch(
  () => cesiumStore.viewer,
  (viewer) => {
    // 先移除旧的监听
    removeListeners.forEach((fn) => fn());
    removeListeners.length = 0;

    if (!viewer) {
      rasterLayers.value = [];
      vectorDataSources.value = [];
      entities.value = [];
      return;
    }

    // 初始加载
    refreshRasterLayers();
    refreshVectorDataSources();
    refreshEntities();

    // 监听栅格图层变化
    removeListeners.push(viewer.imageryLayers.layerAdded.addEventListener(refreshRasterLayers));
    removeListeners.push(viewer.imageryLayers.layerRemoved.addEventListener(refreshRasterLayers));
    removeListeners.push(viewer.imageryLayers.layerMoved.addEventListener(refreshRasterLayers));

    // 监听矢量数据源变化
    removeListeners.push(
      viewer.dataSources.dataSourceAdded.addEventListener(refreshVectorDataSources),
    );
    removeListeners.push(
      viewer.dataSources.dataSourceRemoved.addEventListener(refreshVectorDataSources),
    );
    removeListeners.push(
      viewer.dataSources.dataSourceMoved.addEventListener(refreshVectorDataSources),
    );

    // 监听实体集合变化
    removeListeners.push(viewer.entities.collectionChanged.addEventListener(refreshEntities));
  },
  { immediate: true },
);

onUnmounted(() => {
  removeListeners.forEach((fn) => fn());
});
</script>

<template>
  <nav class="w-64 bg-slate-800 border-r border-slate-700/50 flex flex-col">
    <!-- Logo/标题区域 -->
    <div class="p-4 border-b border-slate-700/50">
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg"
        >
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-bold text-white">GeoOffset</h1>
          <p class="text-xs text-slate-400">GIS 数据管理平台</p>
        </div>
      </div>
    </div>

    <!-- 菜单区域 -->
    <div class="flex-1 overflow-y-auto p-3">
      <ul class="space-y-2">
        <!-- Home -->
        <li>
          <a
            href="#"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 group"
          >
            <svg
              class="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span class="font-medium">首页</span>
          </a>
        </li>

        <!-- Raster -->
        <NavSection title="栅格数据" add-label="添加栅格" @add="handleAddRaster">
          <NavItem
            v-for="(layer, index) in rasterLayers"
            :key="index"
            :label="`图层 ${index + 1}`"
            @focus="console.log('Focus raster', index)"
            @export="console.log('Export raster', index)"
            @delete="console.log('Delete raster', index)"
          />
        </NavSection>

        <!-- Vector -->
        <NavSection title="矢量数据" add-label="添加矢量" @add="handleAddVector">
          <NavItem
            v-for="(dataSource, index) in vectorDataSources"
            :key="index"
            :label="dataSource.name || `矢量 ${index + 1}`"
            @focus="console.log('Focus vector', index)"
            @export="console.log('Export vector', index)"
            @delete="console.log('Delete vector', index)"
          />
        </NavSection>

        <!-- Entities -->
        <NavSection title="三维模型" add-label="添加模型" @add="handleAddEntity">
          <NavItem
            v-for="(entity, index) in entities"
            :key="entity.id"
            :label="entity.name || `模型 ${index + 1}`"
            @focus="console.log('Focus entity', entity.id)"
            @export="console.log('Export entity', entity.id)"
            @delete="console.log('Delete entity', entity.id)"
          />
        </NavSection>
      </ul>
    </div>

    <!-- 底部信息 -->
    <div class="p-3 border-t border-slate-700/50">
      <div class="text-xs text-slate-500 text-center">GeoOffset v0.1.0</div>
    </div>
  </nav>
</template>
