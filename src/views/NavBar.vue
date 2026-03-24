<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { useCesiumStore } from "@/store/cesium";
import { addRasterToMap, addVectorToMap, addEntitiesToMap } from "@/utils";
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
  // 跳过 index 0 的底图图层，只显示用户导入的栅格
  for (let i = 1; i < layers.length; i++) {
    result.push(layers.get(i));
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
  <nav class="w-50 bg-gray-800 pt-10 flex flex-col items-center">
    navbar
    <ul class="menu bg-base-200 rounded-box lg: mb-64 text-black w-[80%]">
      <li>Home</li>
      <li>
        <details open>
          <summary>Raster</summary>
          <ul>
            <li v-for="(layer, index) in rasterLayers" :key="index">Layer {{ index + 1 }}</li>
            <button @click="handleAddRaster" class="btn btn-success btn-square w-full">
              Add Raster
            </button>
          </ul>
        </details>
      </li>
      <li>
        <details open>
          <summary>Vector</summary>
          <ul>
            <li v-for="(dataSource, index) in vectorDataSources" :key="index">
              {{ dataSource.name || `Vector ${index + 1}` }}
            </li>
            <button @click="handleAddVector" class="btn btn-success btn-square w-full">
              Add Vector
            </button>
          </ul>
        </details>
      </li>
      <li>
        <details open>
          <summary>Entities</summary>
          <ul>
            <li v-for="(entity, index) in entities" :key="entity.id">
              {{ entity.name || `Entity ${index + 1}` }}
            </li>
            <button @click="handleAddEntity" class="btn btn-success btn-square w-full">
              Add Entity
            </button>
          </ul>
        </details>
      </li>
    </ul>
  </nav>
</template>
