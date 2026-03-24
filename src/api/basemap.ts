import { UrlTemplateImageryProvider, ProviderViewModel } from "cesium";
import { useConfigStore } from "@/store";

export interface BaseMap {
  name: string;
  url: string;
  maxLevel?: number;
}

const amap: BaseMap = {
  name: "高德地图",
  url: "https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
  maxLevel: 18,
};

const arcgis: BaseMap = {
  name: "ArcGIS 影像",
  url: "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png",
  maxLevel: 18,
};

/**
 * 获取底图列表（延迟读取 store，避免在 Pinia 初始化前调用）
 */
export const getBaseMapList = (): BaseMap[] => {
  const configStore = useConfigStore();
  const custom: BaseMap = {
    name: "自定义地图",
    url: configStore.customBaseMapUrl,
  };
  return [amap, arcgis, custom];
};

/**
 * 生成 Cesium BaseLayerPicker 所需的 ProviderViewModel 列表
 */
export const createImageryViewModels = (): ProviderViewModel[] => {
  return getBaseMapList().map(
    (bm) =>
      new ProviderViewModel({
        name: bm.name,
        iconUrl: "",
        tooltip: bm.name,
        creationFunction: () =>
          new UrlTemplateImageryProvider({ url: bm.url, maximumLevel: bm.maxLevel ? bm.maxLevel : undefined }),
      })
  );
};
