import {
  ImageryLayer,
  Math as CesiumMath,
  Entity,
  Cartographic,
  Ellipsoid,
  DataSource,
} from "cesium";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";

/**
 * 构建简易 GeoTIFF 文件（将 PNG 像素数据包装为带地理信息的 TIFF）
 * @param imageData - Canvas ImageData
 * @param rect - 图层的地理范围 (Rectangle, 弧度)
 * @returns GeoTIFF 的 ArrayBuffer
 */
const buildGeoTiff = async (layer: ImageryLayer): Promise<ArrayBuffer> => {
  const provider = layer.imageryProvider;
  const rect = provider.rectangle;
  const url = (provider as any).url || (provider as any)._url;

  if (!url) {
    throw new Error("Cannot retrieve image URL from the imagery provider");
  }

  // 加载图像获取像素数据
  const img = new Image();
  img.crossOrigin = "anonymous";

  return new Promise<ArrayBuffer>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas 2D context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);

      // 地理范围（度）
      const west = CesiumMath.toDegrees(rect.west);
      const north = CesiumMath.toDegrees(rect.north);
      const pixelWidth = CesiumMath.toDegrees(rect.east - rect.west) / w;
      const pixelHeight = CesiumMath.toDegrees(rect.north - rect.south) / h;

      // 构建简易 TIFF（带 ModelTiepointTag + ModelPixelScaleTag）
      const tiffBuffer = createMinimalGeoTiff(
        imageData.data,
        w,
        h,
        west,
        north,
        pixelWidth,
        pixelHeight,
      );
      resolve(tiffBuffer);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
};

/**
 * 创建最小化 GeoTIFF（RGBA, 未压缩）
 */
const createMinimalGeoTiff = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  originX: number,
  originY: number,
  pixelWidth: number,
  pixelHeight: number,
): ArrayBuffer => {
  const samplesPerPixel = 4; // RGBA
  const imageSize = width * height * samplesPerPixel;

  // ModelTiepointTag (33922): I,J,K -> X,Y,Z  (6 doubles)
  const tiepointData = new Float64Array([0, 0, 0, originX, originY, 0]);
  // ModelPixelScaleTag (33550): ScaleX, ScaleY, ScaleZ (3 doubles)
  const pixelScaleData = new Float64Array([pixelWidth, pixelHeight, 0]);

  // IFD 条目数
  const ifdEntryCount = 14;
  const ifdSize = 2 + ifdEntryCount * 12 + 4; // count + entries + next IFD offset

  // 额外数据偏移（IFD 后紧跟额外数据）
  const headerSize = 8; // TIFF header
  const ifdOffset = headerSize;
  let extraDataOffset = ifdOffset + ifdSize;

  // BitsPerSample 数据 (4 shorts)
  const bpsOffset = extraDataOffset;
  extraDataOffset += 8;

  // SampleFormat 数据 (4 shorts)
  const sfOffset = extraDataOffset;
  extraDataOffset += 8;

  // ModelTiepointTag 数据 (6 doubles = 48 bytes)
  const tiepointOffset = extraDataOffset;
  extraDataOffset += 48;

  // ModelPixelScaleTag 数据 (3 doubles = 24 bytes)
  const pixelScaleOffset = extraDataOffset;
  extraDataOffset += 24;

  // StripOffsets: 图像数据起始偏移
  const stripOffset = extraDataOffset;

  const totalSize = stripOffset + imageSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  let pos = 0;

  // --- TIFF Header (little-endian) ---
  view.setUint16(pos, 0x4949, false);
  pos += 2; // 'II' (little-endian)
  view.setUint16(pos, 42, true);
  pos += 2; // Magic number
  view.setUint32(pos, ifdOffset, true);
  pos += 4; // Offset to first IFD

  // --- IFD ---
  pos = ifdOffset;
  view.setUint16(pos, ifdEntryCount, true);
  pos += 2;

  // Helper: write IFD entry
  const writeEntry = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(pos, tag, true);
    pos += 2;
    view.setUint16(pos, type, true);
    pos += 2;
    view.setUint32(pos, count, true);
    pos += 4;
    view.setUint32(pos, value, true);
    pos += 4;
  };

  // 256: ImageWidth (LONG)
  writeEntry(256, 3, 1, width);
  // 257: ImageLength (LONG)
  writeEntry(257, 3, 1, height);
  // 258: BitsPerSample (SHORT array -> offset)
  writeEntry(258, 3, 4, bpsOffset);
  // 259: Compression = 1 (None)
  writeEntry(259, 3, 1, 1);
  // 262: PhotometricInterpretation = 2 (RGB)
  writeEntry(262, 3, 1, 2);
  // 273: StripOffsets
  writeEntry(273, 4, 1, stripOffset);
  // 277: SamplesPerPixel = 4
  writeEntry(277, 3, 1, samplesPerPixel);
  // 278: RowsPerStrip
  writeEntry(278, 3, 1, height);
  // 279: StripByteCounts
  writeEntry(279, 4, 1, imageSize);
  // 284: PlanarConfiguration = 1 (chunky)
  writeEntry(284, 3, 1, 1);
  // 339: SampleFormat (offset)
  writeEntry(339, 3, 4, sfOffset);
  // 338: ExtraSamples = 2 (unassociated alpha)
  writeEntry(338, 3, 1, 2);
  // 33550: ModelPixelScaleTag (DOUBLE, 3 values)
  writeEntry(33550, 12, 3, pixelScaleOffset);
  // 33922: ModelTiepointTag (DOUBLE, 6 values)
  writeEntry(33922, 12, 6, tiepointOffset);

  // Next IFD offset = 0
  view.setUint32(pos, 0, true);
  pos += 4;

  // --- Extra data ---

  // BitsPerSample: [8, 8, 8, 8]
  pos = bpsOffset;
  for (let i = 0; i < 4; i++) {
    view.setUint16(pos, 8, true);
    pos += 2;
  }

  // SampleFormat: [1, 1, 1, 1] (unsigned int)
  pos = sfOffset;
  for (let i = 0; i < 4; i++) {
    view.setUint16(pos, 1, true);
    pos += 2;
  }

  // ModelTiepointTag
  pos = tiepointOffset;
  for (let i = 0; i < 6; i++) {
    view.setFloat64(pos, tiepointData[i], true);
    pos += 8;
  }

  // ModelPixelScaleTag
  pos = pixelScaleOffset;
  for (let i = 0; i < 3; i++) {
    view.setFloat64(pos, pixelScaleData[i], true);
    pos += 8;
  }

  // --- Image data (RGBA) ---
  uint8.set(pixels, stripOffset);

  return buffer;
};

/**
 * 下载影像图层为 TIFF 或 ISO 文件
 * @param layer - 要导出的 ImageryLayer
 * @param ftype - 文件格式: "tiff" 或 "iso"
 */
/**
 * 触发浏览器下载
 */
const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

type RasterExportFormat = "tiff" | "iso";

/**
 * 下载影像图层为 TIFF 或 ISO 文件（浏览器下载）
 * @param layer - 要导出的 ImageryLayer
 * @param format - 文件格式: "tiff" 或 "iso"
 * @param filename - 文件名（不含扩展名，可选）
 */
const download_image_layer = async (
  layer: ImageryLayer,
  format: RasterExportFormat,
  filename?: string,
) => {
  try {
    const defaultName = filename || "export";

    if (format === "tiff") {
      const data = await buildGeoTiff(layer);
      const blob = new Blob([data], { type: "image/tiff" });
      triggerDownload(blob, `${defaultName}.tif`);
    } else if (format === "iso") {
      const data = await buildGeoTiff(layer);
      const blob = new Blob([data], { type: "application/octet-stream" });
      triggerDownload(blob, `${defaultName}.iso`);
    } else {
      throw new Error(`Invalid file type: ${format}`);
    }

    console.log(`Successfully exported ${format}: ${defaultName}`);
  } catch (err) {
    console.error(`Failed to export ${format}:`, err);
    throw err;
  }
};

// ==================== Entity 导出 ====================

type EntityExportFormat = "obj" | "fbx" | "glt" | "glb" | "gltf";

/**
 * 将 Cesium Entity 转换为 Three.js 场景
 * 支持点（球体）、polyline（线段）、polygon（三角面）、model（加载 glTF）
 */
const entityToThreeScene = async (entity: Entity, currentTime: any): Promise<THREE.Scene> => {
  const scene = new THREE.Scene();

  // 点/模型位置 → 球体标记
  if (entity.position) {
    const pos = entity.position.getValue(currentTime);
    if (pos) {
      const carto = Cartographic.fromCartesian(pos, Ellipsoid.WGS84);
      const lon = CesiumMath.toDegrees(carto.longitude);
      const lat = CesiumMath.toDegrees(carto.latitude);
      const alt = carto.height;

      // 如果实体有 model，尝试加载
      if (entity.model?.uri) {
        const uri = (entity.model.uri as any).getValue?.(currentTime) ?? entity.model.uri;
        try {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const loader = new GLTFLoader();
          const gltf = await new Promise<any>((resolve, reject) => {
            loader.load(String(uri), resolve, undefined, reject);
          });
          gltf.scene.position.set(lon, alt, lat);
          scene.add(gltf.scene);
          return scene;
        } catch {
          console.warn("Failed to load glTF model, falling back to marker sphere");
        }
      }

      // 回退：用球体表示点
      const geometry = new THREE.SphereGeometry(0.5, 16, 16);
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(lon, alt, lat);
      scene.add(mesh);
    }
  }

  // Polyline → Three.js Line
  if (entity.polyline?.positions) {
    const positions = entity.polyline.positions.getValue(currentTime);
    if (positions && positions.length > 0) {
      const points: THREE.Vector3[] = [];
      for (const pos of positions) {
        const carto = Cartographic.fromCartesian(pos, Ellipsoid.WGS84);
        points.push(
          new THREE.Vector3(
            CesiumMath.toDegrees(carto.longitude),
            carto.height,
            CesiumMath.toDegrees(carto.latitude),
          ),
        );
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      scene.add(new THREE.Line(geometry, material));
    }
  }

  // Polygon → Three.js Mesh (三角化)
  if (entity.polygon?.hierarchy) {
    const hierarchy = entity.polygon.hierarchy.getValue(currentTime);
    if (hierarchy && hierarchy.positions.length >= 3) {
      const vertices: number[] = [];
      for (const pos of hierarchy.positions) {
        const carto = Cartographic.fromCartesian(pos, Ellipsoid.WGS84);
        vertices.push(
          CesiumMath.toDegrees(carto.longitude),
          carto.height,
          CesiumMath.toDegrees(carto.latitude),
        );
      }

      // 简单三角扇形化
      const indices: number[] = [];
      for (let i = 1; i < hierarchy.positions.length - 1; i++) {
        indices.push(0, i, i + 1);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
      scene.add(new THREE.Mesh(geometry, material));
    }
  }

  // 添加默认光照
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);

  return scene;
};

/**
 * 将多个实体合并为一个 Three.js 场景
 */
const entitiesToThreeScene = async (entities: Entity[], currentTime: any): Promise<THREE.Scene> => {
  const scene = new THREE.Scene();

  for (const entity of entities) {
    const entityScene = await entityToThreeScene(entity, currentTime);
    while (entityScene.children.length > 0) {
      scene.add(entityScene.children[0]);
    }
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);

  return scene;
};

/**
 * 导出 Three.js 场景为 glTF (JSON)
 */
const exportAsGltf = (scene: THREE.Scene): Promise<Blob> => {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        const json = JSON.stringify(result, null, 2);
        resolve(new Blob([json], { type: "model/gltf+json" }));
      },
      reject,
      { binary: false },
    );
  });
};

/**
 * 导出 Three.js 场景为 glB (二进制)
 */
const exportAsGlb = (scene: THREE.Scene): Promise<Blob> => {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        resolve(new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }));
      },
      reject,
      { binary: true },
    );
  });
};

/**
 * 导出 Three.js 场景为 OBJ
 */
const exportAsObj = (scene: THREE.Scene): Blob => {
  const exporter = new OBJExporter();
  const result = exporter.parse(scene);
  return new Blob([result], { type: "text/plain" });
};

/**
 * 下载 Entity 为 3D 模型文件
 * @param entities - 要导出的 Entity 数组
 * @param format - 导出格式: "obj" | "fbx" | "glt" | "glb" | "gltf"
 * @param currentTime - Cesium clock 的当前时间
 * @param filename - 文件名（不含扩展名，可选）
 */
const download_entity = async (
  entities: Entity[],
  format: EntityExportFormat,
  currentTime: any,
  filename?: string,
) => {
  if (entities.length < 1) {
    throw new Error("No entities provided");
  }

  const defaultName = filename || "entity_export";
  const scene = await entitiesToThreeScene(entities, currentTime);

  let blob: Blob;
  let ext: string;

  switch (format) {
    case "gltf":
      blob = await exportAsGltf(scene);
      ext = "gltf";
      break;
    case "glb":
      blob = await exportAsGlb(scene);
      ext = "glb";
      break;
    case "glt":
      // .glt 视为 glTF JSON 格式的别名
      blob = await exportAsGltf(scene);
      ext = "glt";
      break;
    case "obj":
      blob = exportAsObj(scene);
      ext = "obj";
      break;
    case "fbx":
      // Three.js 没有内置 FBX 导出器，先导出为 glB 后以 .fbx 扩展名保存
      // 建议用户使用 glTF/glB 格式，或在桌面端用专业工具转换
      console.warn(
        "FBX export is not natively supported. Exporting as glB binary with .fbx extension. Use Blender or other tools for true FBX conversion.",
      );
      blob = await exportAsGlb(scene);
      ext = "fbx";
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  triggerDownload(blob, `${defaultName}.${ext}`);
  console.log(`Successfully exported entity as ${format}: ${defaultName}.${ext}`);
};

// ==================== 矢量导出 ====================

type VectorExportFormat = "geojson" | "kml" | "shp";

interface GeoJsonFeature {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
}

/**
 * 将 DataSource 中的实体转换为 GeoJSON FeatureCollection
 */
const dataSourceToGeoJson = (dataSource: DataSource, currentTime: any): any => {
  const features: GeoJsonFeature[] = [];
  const entities = dataSource.entities.values;

  for (const entity of entities) {
    const properties: Record<string, any> = {
      name: entity.name || entity.id,
    };

    // 点
    if (entity.position) {
      const pos = entity.position.getValue(currentTime);
      if (pos) {
        const carto = Cartographic.fromCartesian(pos, Ellipsoid.WGS84);
        features.push({
          type: "Feature",
          properties,
          geometry: {
            type: "Point",
            coordinates: [
              CesiumMath.toDegrees(carto.longitude),
              CesiumMath.toDegrees(carto.latitude),
              carto.height,
            ],
          },
        });
      }
    }

    // Polyline
    if (entity.polyline?.positions) {
      const positions = entity.polyline.positions.getValue(currentTime);
      if (positions && positions.length > 0) {
        const coords = positions.map((pos: any) => {
          const carto = Cartographic.fromCartesian(pos, Ellipsoid.WGS84);
          return [
            CesiumMath.toDegrees(carto.longitude),
            CesiumMath.toDegrees(carto.latitude),
            carto.height,
          ];
        });
        features.push({
          type: "Feature",
          properties,
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
        });
      }
    }

    // Polygon
    if (entity.polygon?.hierarchy) {
      const hierarchy = entity.polygon.hierarchy.getValue(currentTime);
      if (hierarchy && hierarchy.positions.length >= 3) {
        const ring = hierarchy.positions.map((pos: any) => {
          const carto = Cartographic.fromCartesian(pos, Ellipsoid.WGS84);
          return [
            CesiumMath.toDegrees(carto.longitude),
            CesiumMath.toDegrees(carto.latitude),
            carto.height,
          ];
        });
        // GeoJSON polygon 需要闭合环
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          ring.push([...first]);
        }
        features.push({
          type: "Feature",
          properties,
          geometry: {
            type: "Polygon",
            coordinates: [ring],
          },
        });
      }
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
};

/**
 * 将 GeoJSON 转换为 KML 格式
 */
const geoJsonToKml = (geojson: any): string => {
  const placemarks: string[] = [];

  for (const feature of geojson.features) {
    const name = feature.properties?.name || "";
    const geom = feature.geometry;
    let geometryKml = "";

    if (geom.type === "Point") {
      const [lon, lat, alt = 0] = geom.coordinates;
      geometryKml = `<Point><coordinates>${lon},${lat},${alt}</coordinates></Point>`;
    } else if (geom.type === "LineString") {
      const coords = geom.coordinates
        .map((c: number[]) => `${c[0]},${c[1]},${c[2] || 0}`)
        .join(" ");
      geometryKml = `<LineString><coordinates>${coords}</coordinates></LineString>`;
    } else if (geom.type === "Polygon") {
      const rings = geom.coordinates
        .map((ring: number[][]) => {
          const coords = ring.map((c: number[]) => `${c[0]},${c[1]},${c[2] || 0}`).join(" ");
          return `<LinearRing><coordinates>${coords}</coordinates></LinearRing>`;
        })
        .join("");
      geometryKml = `<Polygon><outerBoundaryIs>${rings}</outerBoundaryIs></Polygon>`;
    }

    placemarks.push(`<Placemark><name>${escapeXml(name)}</name>${geometryKml}</Placemark>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Export</name>
  ${placemarks.join("\n  ")}
</Document>
</kml>`;
};

const escapeXml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/**
 * 将 GeoJSON 转换为 Shapefile（.shp + .shx + .dbf 打包为 zip）
 */
const geoJsonToShpZip = (geojson: any): ArrayBuffer => {
  const features = geojson.features as GeoJsonFeature[];
  if (features.length === 0) {
    throw new Error("No features to export");
  }

  // 确定 shapefile 几何类型
  const geomType = features[0].geometry.type;
  let shpType: number;
  if (geomType === "Point") shpType = 1;
  else if (geomType === "LineString" || geomType === "MultiLineString") shpType = 3;
  else if (geomType === "Polygon" || geomType === "MultiPolygon") shpType = 5;
  else throw new Error(`Unsupported geometry type for Shapefile: ${geomType}`);

  // 过滤同类型要素
  const sameTypeFeatures = features.filter((f) => {
    if (shpType === 1) return f.geometry.type === "Point";
    if (shpType === 3)
      return f.geometry.type === "LineString" || f.geometry.type === "MultiLineString";
    return f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon";
  });

  // 构建 SHP
  const shpRecords: ArrayBuffer[] = [];
  let totalShpContentLength = 50;
  const bboxAll = [Infinity, Infinity, -Infinity, -Infinity];
  const shxRecords: { offset: number; contentLength: number }[] = [];
  let currentOffset = 50;

  for (let i = 0; i < sameTypeFeatures.length; i++) {
    const geom = sameTypeFeatures[i].geometry;
    let recordContent: ArrayBuffer;

    if (shpType === 1) {
      const [x, y] = geom.coordinates;
      bboxAll[0] = Math.min(bboxAll[0], x);
      bboxAll[1] = Math.min(bboxAll[1], y);
      bboxAll[2] = Math.max(bboxAll[2], x);
      bboxAll[3] = Math.max(bboxAll[3], y);

      recordContent = new ArrayBuffer(20);
      const dv = new DataView(recordContent);
      dv.setInt32(0, 1, true);
      dv.setFloat64(4, x, true);
      dv.setFloat64(12, y, true);
    } else {
      let rings: number[][][];
      if (geom.type === "LineString") rings = [geom.coordinates];
      else if (geom.type === "Polygon") rings = geom.coordinates;
      else rings = [geom.coordinates.flat()];

      const totalPoints = rings.reduce((sum, r) => sum + r.length, 0);
      const numParts = rings.length;
      const contentSize = 4 + 32 + 4 + 4 + numParts * 4 + totalPoints * 16;
      recordContent = new ArrayBuffer(contentSize);
      const dv = new DataView(recordContent);
      let offset = 0;

      dv.setInt32(offset, shpType, true);
      offset += 4;

      let bx0 = Infinity,
        by0 = Infinity,
        bx1 = -Infinity,
        by1 = -Infinity;
      const allPts: number[][] = [];
      for (const ring of rings) {
        for (const pt of ring) {
          allPts.push(pt);
          bx0 = Math.min(bx0, pt[0]);
          by0 = Math.min(by0, pt[1]);
          bx1 = Math.max(bx1, pt[0]);
          by1 = Math.max(by1, pt[1]);
        }
      }
      bboxAll[0] = Math.min(bboxAll[0], bx0);
      bboxAll[1] = Math.min(bboxAll[1], by0);
      bboxAll[2] = Math.max(bboxAll[2], bx1);
      bboxAll[3] = Math.max(bboxAll[3], by1);

      dv.setFloat64(offset, bx0, true);
      offset += 8;
      dv.setFloat64(offset, by0, true);
      offset += 8;
      dv.setFloat64(offset, bx1, true);
      offset += 8;
      dv.setFloat64(offset, by1, true);
      offset += 8;

      dv.setInt32(offset, numParts, true);
      offset += 4;
      dv.setInt32(offset, totalPoints, true);
      offset += 4;

      let ptIdx = 0;
      for (const ring of rings) {
        dv.setInt32(offset, ptIdx, true);
        offset += 4;
        ptIdx += ring.length;
      }

      for (const pt of allPts) {
        dv.setFloat64(offset, pt[0], true);
        offset += 8;
        dv.setFloat64(offset, pt[1], true);
        offset += 8;
      }
    }

    const recordHeader = new ArrayBuffer(8);
    const rhDv = new DataView(recordHeader);
    rhDv.setInt32(0, i + 1, false);
    rhDv.setInt32(4, recordContent.byteLength / 2, false);

    const contentLengthWords = recordContent.byteLength / 2;
    shxRecords.push({ offset: currentOffset, contentLength: contentLengthWords });
    currentOffset += 4 + contentLengthWords;

    shpRecords.push(recordHeader);
    shpRecords.push(recordContent);
    totalShpContentLength += 4 + contentLengthWords;
  }

  // SHP header
  const shpHeader = new ArrayBuffer(100);
  const shpHdv = new DataView(shpHeader);
  shpHdv.setInt32(0, 9994, false);
  shpHdv.setInt32(24, totalShpContentLength, false);
  shpHdv.setInt32(28, 1000, true);
  shpHdv.setInt32(32, shpType, true);
  shpHdv.setFloat64(36, bboxAll[0], true);
  shpHdv.setFloat64(44, bboxAll[1], true);
  shpHdv.setFloat64(52, bboxAll[2], true);
  shpHdv.setFloat64(60, bboxAll[3], true);

  // SHX file
  const shxFileLength = 50 + sameTypeFeatures.length * 4;
  const shxBuf = new ArrayBuffer(100 + sameTypeFeatures.length * 8);
  const shxDv = new DataView(shxBuf);
  shxDv.setInt32(0, 9994, false);
  shxDv.setInt32(24, shxFileLength, false);
  shxDv.setInt32(28, 1000, true);
  shxDv.setInt32(32, shpType, true);
  shxDv.setFloat64(36, bboxAll[0], true);
  shxDv.setFloat64(44, bboxAll[1], true);
  shxDv.setFloat64(52, bboxAll[2], true);
  shxDv.setFloat64(60, bboxAll[3], true);

  let shxOffset = 100;
  for (const rec of shxRecords) {
    shxDv.setInt32(shxOffset, rec.offset, false);
    shxOffset += 4;
    shxDv.setInt32(shxOffset, rec.contentLength, false);
    shxOffset += 4;
  }

  // DBF file
  const fieldName = "NAME";
  const fieldLen = 50;
  const numRecords = sameTypeFeatures.length;
  const headerLen = 32 + 32 + 1;
  const recordLen = 1 + fieldLen;
  const dbfSize = headerLen + numRecords * recordLen;
  const dbfBuf = new ArrayBuffer(dbfSize);
  const dbfDv = new DataView(dbfBuf);
  const dbfU8 = new Uint8Array(dbfBuf);

  dbfDv.setUint8(0, 3);
  dbfDv.setUint8(1, 26);
  dbfDv.setUint8(2, 2);
  dbfDv.setUint8(3, 28);
  dbfDv.setInt32(4, numRecords, true);
  dbfDv.setInt16(8, headerLen, true);
  dbfDv.setInt16(10, recordLen, true);

  const fieldDescOffset = 32;
  const enc = new TextEncoder();
  const nameBytes = enc.encode(fieldName);
  dbfU8.set(nameBytes.slice(0, 11), fieldDescOffset);
  dbfDv.setUint8(fieldDescOffset + 11, 0x43); // 'C'
  dbfDv.setUint8(fieldDescOffset + 16, fieldLen);
  dbfDv.setUint8(fieldDescOffset + 32, 0x0d); // terminator

  let dbfRecOffset = headerLen;
  for (const feat of sameTypeFeatures) {
    dbfDv.setUint8(dbfRecOffset, 0x20);
    const val = String(feat.properties?.name || "").slice(0, fieldLen);
    const valBytes = enc.encode(val.padEnd(fieldLen, " "));
    dbfU8.set(valBytes.slice(0, fieldLen), dbfRecOffset + 1);
    dbfRecOffset += recordLen;
  }

  return createSimpleZip({
    "export.shp": concatBuffers([shpHeader, ...shpRecords]),
    "export.shx": shxBuf,
    "export.dbf": dbfBuf,
  });
};

/** 合并多个 ArrayBuffer */
const concatBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
  const totalLen = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
};

/** 创建简易 ZIP 文件（不压缩，仅存储） */
const createSimpleZip = (files: Record<string, ArrayBuffer>): ArrayBuffer => {
  const entries = Object.entries(files);
  const enc = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let localOffset = 0;

  for (const [name, data] of entries) {
    const nameBytes = enc.encode(name);
    const dataBytes = new Uint8Array(data);
    const crc = crc32(dataBytes);

    const localHeader = new ArrayBuffer(30 + nameBytes.length);
    const lhDv = new DataView(localHeader);
    lhDv.setUint32(0, 0x04034b50, true);
    lhDv.setUint16(4, 20, true);
    lhDv.setUint16(8, 0, true);
    lhDv.setUint32(14, crc, true);
    lhDv.setUint32(18, dataBytes.length, true);
    lhDv.setUint32(22, dataBytes.length, true);
    lhDv.setUint16(26, nameBytes.length, true);
    new Uint8Array(localHeader).set(nameBytes, 30);

    localHeaders.push(new Uint8Array(localHeader));
    localHeaders.push(dataBytes);

    const centralHeader = new ArrayBuffer(46 + nameBytes.length);
    const chDv = new DataView(centralHeader);
    chDv.setUint32(0, 0x02014b50, true);
    chDv.setUint16(4, 20, true);
    chDv.setUint16(6, 20, true);
    chDv.setUint16(10, 0, true);
    chDv.setUint32(16, crc, true);
    chDv.setUint32(20, dataBytes.length, true);
    chDv.setUint32(24, dataBytes.length, true);
    chDv.setUint16(28, nameBytes.length, true);
    chDv.setUint32(42, localOffset, true);
    new Uint8Array(centralHeader).set(nameBytes, 46);

    centralHeaders.push(new Uint8Array(centralHeader));
    localOffset += 30 + nameBytes.length + dataBytes.length;
  }

  const centralDirOffset = localOffset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  const eocd = new ArrayBuffer(22);
  const eocdDv = new DataView(eocd);
  eocdDv.setUint32(0, 0x06054b50, true);
  eocdDv.setUint16(8, entries.length, true);
  eocdDv.setUint16(10, entries.length, true);
  eocdDv.setUint32(12, centralDirSize, true);
  eocdDv.setUint32(16, centralDirOffset, true);

  const allParts = [...localHeaders, ...centralHeaders, new Uint8Array(eocd)];
  return concatBuffers(allParts.map((p) => p.buffer as ArrayBuffer));
};

/** CRC32 计算 */
const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

let _crc32Table: Uint32Array | null = null;
const getCrc32Table = (): Uint32Array => {
  if (_crc32Table) return _crc32Table;
  _crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crc32Table[i] = c;
  }
  return _crc32Table;
};

/**
 * 下载矢量数据源为 GeoJSON / KML / SHP
 * @param dataSource - Cesium DataSource
 * @param format - "geojson" | "kml" | "shp"
 * @param currentTime - Cesium clock 当前时间
 * @param filename - 文件名（不含扩展名，可选）
 */
const download_vector = (
  dataSource: DataSource,
  format: VectorExportFormat,
  currentTime: any,
  filename?: string,
) => {
  const defaultName = filename || "vector_export";
  const geojson = dataSourceToGeoJson(dataSource, currentTime);

  switch (format) {
    case "geojson": {
      const json = JSON.stringify(geojson, null, 2);
      const blob = new Blob([json], { type: "application/geo+json" });
      triggerDownload(blob, `${defaultName}.geojson`);
      break;
    }
    case "kml": {
      const kml = geoJsonToKml(geojson);
      const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
      triggerDownload(blob, `${defaultName}.kml`);
      break;
    }
    case "shp": {
      const zipData = geoJsonToShpZip(geojson);
      const blob = new Blob([zipData], { type: "application/zip" });
      triggerDownload(blob, `${defaultName}.zip`);
      break;
    }
    default:
      throw new Error(`Unsupported vector export format: ${format}`);
  }

  console.log(`Successfully exported vector as ${format}: ${defaultName}`);
};

export { download_image_layer, download_entity, download_vector };
export type { RasterExportFormat, EntityExportFormat, VectorExportFormat };
