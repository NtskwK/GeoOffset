import { SingleTileImageryProvider, GeoJsonDataSource } from 'cesium';
import shp from 'shpjs';

import { useCesiumStore } from '@/store/cesium';

const add_raster_to_map = (files: File[]) => {
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
    if (!file.type.startsWith('image/')) {
      console.error(`File ${file.name} is not an image and will be skipped.`);
      continue;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        console.log('Adding raster to map:', file.name);
        cesiumStore.viewer!.imageryLayers.addImageryProvider(
          new SingleTileImageryProvider({
            url: event.target.result as string,
          })
        );
      }
    };
    reader.readAsDataURL(file);
  }
};


const add_vector_to_map = (files: File[]) => {
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
        cesiumStore.viewer!.dataSources.add(
          new GeoJsonDataSource(event.target.result as string)
        );
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
          cesiumStore.viewer!.dataSources.add(dataSource);
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
