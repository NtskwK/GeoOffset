interface BaseMap {
  name: string;
  url: string;
}

const amap: BaseMap = {
  name: "高德地图",
  url: "https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}"
}

const arcgis: BaseMap = {
  name: "ArcGIS",
  url: "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png"
}

const custom: BaseMap = {
  name: "自定义地图",
  url: "https://your.custom.tile.server/{z}/{x}/{y}.png"
}

export const baseMapList = [amap, arcgis, custom];

