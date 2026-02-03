import { defineStore } from "pinia";
import { Viewer } from "cesium";
import { ref } from "vue";

export const useCesiumStore = defineStore("cesium", () => {
  const viewer = ref<Viewer | null>(null);

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
    }
  };

  return {
    viewer,
    setViewer,
    getViewer,
    destroyViewer,
  };
});
