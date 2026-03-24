import { defineStore } from "pinia";
import { Viewer, ImageryLayer } from "cesium";
import { ref } from "vue";

export const useCesiumStore = defineStore("cesium", () => {
  const viewer = ref<Viewer | null>(null);
  // 底图层引用（始终在最底层）
  const baseLayer = ref<ImageryLayer | null>(null);

  const setViewer = (newViewer: Viewer | null) => {
    viewer.value = newViewer;
  };

  const getViewer = () => {
    return viewer.value;
  };

  const destroyViewer = () => {
    if (viewer.value) {
      viewer.value.destroy();
      viewer.value = null;
      baseLayer.value = null;
    }
  };

  // 设置底图层
  const setBaseLayer = (layer: ImageryLayer | null) => {
    baseLayer.value = layer;
  };

  // 获取底图层
  const getBaseLayer = () => {
    return baseLayer.value;
  };

  return {
    viewer,
    baseLayer,
    setViewer,
    getViewer,
    destroyViewer,
    setBaseLayer,
    getBaseLayer,
  };
});
