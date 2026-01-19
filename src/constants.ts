import { Cartesian3 } from 'cesium';

/**
 * Cesium 相机默认位置（Home Point）
 * 经度: 116.4074° E, 纬度: 39.9042° N (北京)
 * 高度: 15000 米
 */
export const CESIUM_HOME_POSITION = Cartesian3.fromDegrees(116.4074, 39.9042, 15000);

/**
 * Cesium 相机默认朝向
 */
export const CESIUM_HOME_HEADING = 0; // 朝向（北方）
export const CESIUM_HOME_PITCH = -90; // 俯仰角（垂直向下）
export const CESIUM_HOME_ROLL = 0; // 翻滚角

/**
 * 其他常用常量
 */
export const CESIUM_CONFIG = {
  // 地球椭球体参数
  EARTH_RADIUS: 6371000, // 地球平均半径（米）

  // 默认相机速度
  CAMERA_SPEED: 50,

  // 默认缩放系数
  ZOOM_FACTOR: 2.0,
};

export default {
  CESIUM_HOME_POSITION,
  CESIUM_HOME_HEADING,
  CESIUM_HOME_PITCH,
  CESIUM_HOME_ROLL,
  CESIUM_CONFIG,
};
