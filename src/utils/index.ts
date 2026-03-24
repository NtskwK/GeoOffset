import * as THREE from 'three';
import { SingleTileImageryProvider, GeoJsonDataSource, Rectangle, ImageryLayerCollection, DataSourceCollection, EntityCollection, Cartesian3 } from 'cesium';
import shp from 'shpjs';
import proj4 from 'proj4';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

import { useCesiumStore } from '@/store/cesium';

/**
 * 获取 EPSG 代码对应的 proj4 定义字符串。
 * 支持 UTM 北半球 (326xx) 和 南半球 (327xx)，以及其他常见投影。
 */
const getProj4Def = (epsgCode: number): string | null => {
  // UTM 北半球: EPSG:32601 - EPSG:32660
  if (epsgCode >= 32601 && epsgCode <= 32660) {
    const zone = epsgCode - 32600;
    return `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
  }
  // UTM 南半球: EPSG:32701 - EPSG:32760
  if (epsgCode >= 32701 && epsgCode <= 32760) {
    const zone = epsgCode - 32700;
    return `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs`;
  }
  // 其他常见投影
  const knownDefs: Record<number, string> = {
    3857: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +no_defs',
    4490: '+proj=longlat +ellps=GRS80 +no_defs', // CGCS2000
    4547: '+proj=tmerc +lat_0=0 +lon_0=114 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    4548: '+proj=tmerc +lat_0=0 +lon_0=117 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    4549: '+proj=tmerc +lat_0=0 +lon_0=120 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
  };
  return knownDefs[epsgCode] ?? null;
};

/**
 * 将 GeoJSON 从源坐标系重投影到 EPSG:4326 (WGS84)。
 * 如果本身就是 4326 或无 CRS 声明，则原样返回。
 */
const reprojectGeoJSON = (geojson: any): any => {
  const crsName: string | undefined = geojson.crs?.properties?.name;
  if (!crsName) return geojson;

  // 提取 EPSG 码，兼容 "urn:ogc:def:crs:EPSG::32649" 和 "EPSG:32649"
  const match = crsName.match(/EPSG::?(\d+)/);
  if (!match) return geojson;

  const epsgCode = parseInt(match[1], 10);
  if (epsgCode === 4326) return geojson;

  const def = getProj4Def(epsgCode);
  if (!def) {
    console.warn(`未找到 EPSG:${epsgCode} 的投影定义，将按原始坐标加载`);
    // 移除 crs 字段以避免 Cesium 报错
    const result = JSON.parse(JSON.stringify(geojson));
    delete result.crs;
    return result;
  }

  const srcCrs = `EPSG:${epsgCode}`;
  proj4.defs(srcCrs, def);

  const reprojectCoords = (coords: any): any => {
    if (typeof coords[0] === 'number') {
      const [lon, lat] = proj4(srcCrs, 'EPSG:4326', [coords[0], coords[1]]);
      return coords.length > 2 ? [lon, lat, coords[2]] : [lon, lat];
    }
    return coords.map(reprojectCoords);
  };

  const result = JSON.parse(JSON.stringify(geojson));
  delete result.crs;

  if (result.type === 'FeatureCollection') {
    for (const feature of result.features) {
      feature.geometry.coordinates = reprojectCoords(feature.geometry.coordinates);
    }
  } else if (result.type === 'Feature') {
    result.geometry.coordinates = reprojectCoords(result.geometry.coordinates);
  } else {
    result.coordinates = reprojectCoords(result.coordinates);
  }

  console.log(`已将 GeoJSON 从 EPSG:${epsgCode} 重投影到 EPSG:4326`);
  return result;
};

/**
 * 使用 Three.js 将 OBJ/FBX/3DS 模型转换为 glB Blob URL
 */
const convertToGlb = async (file: File, ext: string): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const exporter = new GLTFExporter();

  let scene: THREE.Object3D;

  if (ext === '.obj') {
    const loader = new OBJLoader();
    const text = new TextDecoder().decode(arrayBuffer);
    scene = loader.parse(text);
  } else if (ext === '.fbx') {
    const loader = new FBXLoader();
    scene = loader.parse(arrayBuffer, '');
  } else if (ext === '.3ds') {
    const loader = new TDSLoader();
    scene = loader.parse(arrayBuffer, '');
  } else {
    throw new Error(`Unsupported format: ${ext}`);
  }

  return new Promise<string>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
        resolve(URL.createObjectURL(blob));
      },
      reject,
      { binary: true }
    );
  });
};

const addRasterToMap = (files: File[]) => {
  if (files.length < 1) {
    throw new Error('No files provided');
  }

  const cesiumStore = useCesiumStore();

  // 确保viewer已初始化
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  for (const file of files) {
    const reader = new FileReader();
    if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
      reader.onload = (event) => {
        if (event.target?.result) {
          console.log('Adding raster to map:', file.name);
          cesiumStore.viewer!.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: event.target.result as string,
              rectangle: Rectangle.fromDegrees(-180, -90, 180, 90)
            })
          );
        }
      }
      reader.readAsDataURL(file);
    } else if (file.name.endsWith('.iso')) {
      reader.onload = (event) => {
        if (event.target?.result) {
          console.log('Adding ISO raster to map:', file.name);
          cesiumStore.viewer!.imageryLayers.addImageryProvider(
            new SingleTileImageryProvider({
              url: event.target.result as string,
              rectangle: Rectangle.fromDegrees(-180, -90, 180, 90)
            })
          );
        }
      };
      reader.readAsDataURL(file);
    } else {
      console.error(`${file.name} can not be recognized as a supported raster file and will be skipped.`);
    }
  };
}

const addVectorToMap = (files: File[]) => {
  if (files.length < 1) {
    throw new Error('No files provided');
  }

  const cesiumStore = useCesiumStore();
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  if (files[0].name.endsWith('.geojson') || files[0].name.endsWith('.json') || files[0].name.endsWith('.kml') || files[0].name.endsWith('.kmz') || files[0].name.endsWith('.gpx') || files[0].name.endsWith('.topojson')) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        console.log('Adding vector to map:', files[0].name);
        try {
          const rawGeoJson = JSON.parse(event.target.result as string);
          const projectedGeoJson = reprojectGeoJSON(rawGeoJson);
          const dataSource = await GeoJsonDataSource.load(projectedGeoJson);
          dataSource.name = files[0].name;
          await cesiumStore.viewer!.dataSources.add(dataSource);
          cesiumStore.viewer!.flyTo(dataSource);
        } catch (e) {
          console.error(e);
        }
      }
    };
    reader.readAsText(files[0]);
  }
  // shp
  else if (files[0].name.endsWith(".zip")) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const geojson = await shp(event.target.result as ArrayBuffer);
          console.log('Adding shapefile to map:', files[0].name);
          // shpjs 内部已通过 .prj 文件自动重投影到 WGS84，无需再次转换
          const rawGeoJson = Array.isArray(geojson) ? geojson[0] : geojson;
          const dataSource = await GeoJsonDataSource.load(rawGeoJson);
          dataSource.name = files[0].name;
          await cesiumStore.viewer!.dataSources.add(dataSource);
          cesiumStore.viewer!.flyTo(dataSource);
        } catch (err) {
          console.error('Failed to parse shapefile:', err);
        }
      }
    };
    reader.readAsArrayBuffer(files[0]);
  }
  else {
    console.error(`${files[0].name} can not be recognized as a supported vector file and will be skipped.`);
  }
};

const addEntitiesToMap = (files: File[]) => {
  if (files.length < 1) {
    throw new Error('No files provided');
  }

  const cesiumStore = useCesiumStore();
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  for (const file of files) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (ext === '.gltf' || ext === '.glb') {
      const blobUrl = URL.createObjectURL(file);
      console.log('Adding 3D model to map:', file.name);
      const entity = cesiumStore.viewer!.entities.add({
        name: file.name,
        position: Cartesian3.fromDegrees(0, 0, 0),
        model: {
          uri: blobUrl,
        },
      });
      cesiumStore.viewer!.flyTo(entity);
    } else if (ext === '.obj' || ext === '.fbx' || ext === '.3ds') {
      convertToGlb(file, ext)
        .then((blobUrl) => {
          console.log(`Converted ${file.name} to glB, adding to map`);
          const entity = cesiumStore.viewer!.entities.add({
            name: file.name,
            position: Cartesian3.fromDegrees(0, 0, 0),
            model: {
              uri: blobUrl,
            },
          });
          cesiumStore.viewer!.flyTo(entity);
        })
        .catch((err) => {
          console.error(`Failed to convert ${file.name} to glTF:`, err);
        });
    } else {
      console.error(`${file.name} can not be recognized as a supported 3D model file and will be skipped.`);
      continue;
    }
  }
}

const getAllRasterLayers = (): ImageryLayerCollection | undefined => {
  const cesiumStore = useCesiumStore();
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  const layers = cesiumStore.viewer.imageryLayers;
  return layers;
}

const getAllVectorLayers = (): DataSourceCollection | undefined => {
  const cesiumStore = useCesiumStore();
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  const layers = cesiumStore.viewer.dataSources;
  return layers;
}

const getAllEntities = (): EntityCollection | undefined => {
  const cesiumStore = useCesiumStore();
  if (!cesiumStore.viewer) {
    console.error('Cesium viewer is not initialized');
    return;
  }

  const entities = cesiumStore.viewer.entities;
  return entities;
}

export {
  addRasterToMap,
  addVectorToMap,
  addEntitiesToMap,
  getAllRasterLayers,
  getAllVectorLayers,
  getAllEntities,
  getProj4Def,
  reprojectGeoJSON,

}
