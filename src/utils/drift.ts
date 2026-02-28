import {
  ImageryLayer,
  Rectangle,
  Math as CesiumMath,
  Cartesian3,
  Cartographic,
  Ellipsoid,
  DataSource,
  Entity,
  ConstantPositionProperty,
  ConstantProperty,
} from 'cesium';
import { useCesiumStore } from '@/store/cesium';

/**
 * 对栅格图层进行经纬度偏移
 * @param layer - 要偏移的 ImageryLayer
 * @param offsetX - 经度方向偏移量（单位：度，正值向东）
 * @param offsetY - 纬度方向偏移量（单位：度，正值向北）
 */
const offset_raster_layer = (layer: ImageryLayer, offsetX: number, offsetY: number) => {
  const cesiumStore = useCesiumStore();
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  const layers = cesiumStore.viewer.imageryLayers;
  const provider = layer.imageryProvider;

  // 获取当前图层的矩形范围
  const currentRect = provider.rectangle;
  if (!currentRect) {
    console.error('Cannot determine the rectangle of the imagery layer');
    return;
  }

  // 将偏移量从度转为弧度
  const dLon = CesiumMath.toRadians(offsetX);
  const dLat = CesiumMath.toRadians(offsetY);

  // 计算新的矩形范围
  const newRect = new Rectangle(
    currentRect.west + dLon,
    currentRect.south + dLat,
    currentRect.east + dLon,
    currentRect.north + dLat
  );

  // 记录当前图层在集合中的位置和透明度等属性
  const index = layers.indexOf(layer);
  const alpha = layer.alpha;
  const show = layer.show;

  // 移除旧图层
  layers.remove(layer, false);

  // 添加带新范围的图层
  const newLayer = layers.addImageryProvider(provider, index);
  newLayer.alpha = alpha;
  newLayer.show = show;

  // 覆盖 rectangle（通过 cutoutRectangle 无法实现偏移，需要直接设置）
  // Cesium 的 ImageryLayer 在内部使用 provider.rectangle 来确定瓦片范围
  // 对于 SingleTileImageryProvider，我们需要重新创建 provider
  // 这里通过替换图层来实现偏移

  // 由于直接修改 provider.rectangle 是只读的，
  // 我们用新的 rectangle 重建 provider 来实现偏移
  layers.remove(newLayer, false);

  const { SingleTileImageryProvider } = require('cesium');

  // 尝试获取 provider 的 url
  const url = (provider as any).url || (provider as any)._url;
  if (!url) {
    console.error('Cannot retrieve the URL from the imagery provider to recreate with offset');
    // 回退：直接重新添加原始图层
    layers.add(layer, index);
    return;
  }

  const offsetProvider = new SingleTileImageryProvider({
    url: url,
    rectangle: newRect,
  });

  const offsetLayer = layers.addImageryProvider(offsetProvider, index);
  offsetLayer.alpha = alpha;
  offsetLayer.show = show;

  console.log(`Layer offset applied: dX=${offsetX}°, dY=${offsetY}°`);
  return offsetLayer;
};

/**
 * 偏移单个实体的位置
 * @param position - 原始 Cartesian3 位置
 * @param offsetX - 经度偏移量（度）
 * @param offsetY - 纬度偏移量（度）
 * @returns 偏移后的 Cartesian3
 */
const offsetPosition = (position: Cartesian3, offsetX: number, offsetY: number): Cartesian3 => {
  const carto = Cartographic.fromCartesian(position, Ellipsoid.WGS84);
  const newLon = carto.longitude + CesiumMath.toRadians(offsetX);
  const newLat = carto.latitude + CesiumMath.toRadians(offsetY);
  return Cartesian3.fromRadians(newLon, newLat, carto.height);
};

/**
 * 对矢量数据源（DataSource）中所有实体进行经纬度偏移
 * @param dataSource - 要偏移的 DataSource（如 GeoJsonDataSource）
 * @param offsetX - 经度方向偏移量（单位：度，正值向东）
 * @param offsetY - 纬度方向偏移量（单位：度，正值向北）
 */
const offset_vector_layer = (dataSource: DataSource, offsetX: number, offsetY: number) => {
  const cesiumStore = useCesiumStore();
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  const entities = dataSource.entities.values;
  let count = 0;

  for (const entity of entities) {
    // 偏移点位置
    if (entity.position) {
      const currentPos = entity.position.getValue(cesiumStore.viewer.clock.currentTime);
      if (currentPos) {
        entity.position = new ConstantPositionProperty(
          offsetPosition(currentPos, offsetX, offsetY)
        ) as any;
        count++;
      }
    }

    // 偏移 polyline
    if (entity.polyline?.positions) {
      const positions = entity.polyline.positions.getValue(cesiumStore.viewer.clock.currentTime);
      if (positions) {
        const newPositions = positions.map((pos: Cartesian3) =>
          offsetPosition(pos, offsetX, offsetY)
        );
        entity.polyline.positions = new ConstantProperty(newPositions) as any;
        count++;
      }
    }

    // 偏移 polygon
    if (entity.polygon?.hierarchy) {
      const hierarchy = entity.polygon.hierarchy.getValue(cesiumStore.viewer.clock.currentTime);
      if (hierarchy) {
        const newPositions = hierarchy.positions.map((pos: Cartesian3) =>
          offsetPosition(pos, offsetX, offsetY)
        );
        const newHoles = hierarchy.holes?.map((hole: any) => ({
          positions: hole.positions.map((pos: Cartesian3) =>
            offsetPosition(pos, offsetX, offsetY)
          ),
          holes: hole.holes,
        }));
        entity.polygon.hierarchy = new ConstantProperty({
          positions: newPositions,
          holes: newHoles || [],
        }) as any;
        count++;
      }
    }
  }

  console.log(`Vector layer offset applied to ${count} features: dX=${offsetX}°, dY=${offsetY}°`);
};

/**
 * 对单个实体进行经纬度偏移
 * @param entity - 要偏移的 Entity
 * @param offsetX - 经度方向偏移量（单位：度，正值向东）
 * @param offsetY - 纬度方向偏移量（单位：度，正值向北）
 */
const offset_entity = (entity: Entity, offsetX: number, offsetY: number) => {
  const cesiumStore = useCesiumStore();
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  const time = cesiumStore.viewer.clock.currentTime;

  // 偏移点/模型位置
  if (entity.position) {
    const currentPos = entity.position.getValue(time);
    if (currentPos) {
      entity.position = new ConstantPositionProperty(
        offsetPosition(currentPos, offsetX, offsetY)
      ) as any;
    }
  }

  // 偏移 polyline
  if (entity.polyline?.positions) {
    const positions = entity.polyline.positions.getValue(time);
    if (positions) {
      const newPositions = positions.map((pos: Cartesian3) =>
        offsetPosition(pos, offsetX, offsetY)
      );
      entity.polyline.positions = new ConstantProperty(newPositions) as any;
    }
  }

  // 偏移 polygon
  if (entity.polygon?.hierarchy) {
    const hierarchy = entity.polygon.hierarchy.getValue(time);
    if (hierarchy) {
      const newPositions = hierarchy.positions.map((pos: Cartesian3) =>
        offsetPosition(pos, offsetX, offsetY)
      );
      const newHoles = hierarchy.holes?.map((hole: any) => ({
        positions: hole.positions.map((pos: Cartesian3) =>
          offsetPosition(pos, offsetX, offsetY)
        ),
        holes: hole.holes,
      }));
      entity.polygon.hierarchy = new ConstantProperty({
        positions: newPositions,
        holes: newHoles || [],
      }) as any;
    }
  }

  console.log(`Entity "${entity.name || entity.id}" offset applied: dX=${offsetX}°, dY=${offsetY}°`);
};

export { offset_raster_layer, offset_vector_layer, offset_entity };
