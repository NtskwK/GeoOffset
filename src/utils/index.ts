import * as THREE from 'three';
import { SingleTileImageryProvider, GeoJsonDataSource, Rectangle, ImageryLayerCollection, DataSourceCollection, EntityCollection, Cartesian3 } from 'cesium';
import shp from 'shpjs';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

import { useCesiumStore } from '@/store/cesium';

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
          const dataSource = await GeoJsonDataSource.load(JSON.parse(event.target.result as string));
          dataSource.name = files[0].name;
          await cesiumStore.viewer!.dataSources.add(dataSource);
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
          const dataSource = await GeoJsonDataSource.load(
            Array.isArray(geojson) ? geojson[0] : geojson
          );
          dataSource.name = files[0].name;
          await cesiumStore.viewer!.dataSources.add(dataSource);
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
      cesiumStore.viewer!.entities.add({
        name: file.name,
        position: Cartesian3.fromDegrees(0, 0, 0),
        model: {
          uri: blobUrl,
        },
      });
    } else if (ext === '.obj' || ext === '.fbx' || ext === '.3ds') {
      convertToGlb(file, ext)
        .then((blobUrl) => {
          console.log(`Converted ${file.name} to glB, adding to map`);
          cesiumStore.viewer!.entities.add({
            name: file.name,
            position: Cartesian3.fromDegrees(0, 0, 0),
            model: {
              uri: blobUrl,
            },
          });
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
  getAllEntities

}
