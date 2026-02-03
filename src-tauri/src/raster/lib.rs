use georaster::geotiff::GeoTiffReader;
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

const WINDOW_SIZE: usize = 512;

#[ts(export)]
#[derive(Debug, Serialize, Deserialize, ts_rs::TS)]
pub struct RasterMetadata {
    pub file_path: String,
    pub width: u32,
    pub height: u32,
    pub band_count: usize,
    pub transform: Option<TransformInfo>,
    pub projection: Option<String>,
}

#[ts(export)]
#[derive(Debug, Serialize, Deserialize, ts_rs::TS)]
pub struct TransformInfo {
    pub upper_left_x: f64,
    pub upper_left_y: f64,
    pub pixel_width: f64,
    pub pixel_height: f64,
}

#[ts(export)]
#[derive(Debug, Serialize, Deserialize, ts_rs::TS)]
pub struct ExportResult {
    pub success: bool,
    pub message: String,
    pub save_path: String,
    pub x_offset: f64,
    pub y_offset: f64,
}

/// Extract concise raster metadata
pub fn summarize_raster(file_path: &str) -> Result<String, String> {
    debug!("Summarizing raster: {}", file_path);

    let file = File::open(file_path).map_err(|e| format!("Failed to open file: {}", e))?;

    let reader = BufReader::new(file);
    let tiff = GeoTiffReader::open(reader).map_err(|e| format!("Failed to read GeoTIFF: {}", e))?;

    let mut info_lines = vec![format!("File Path: {}", file_path)];

    // Get image dimensions
    if let Some(img) = tiff.images().first() {
        if let Some(dims) = img.dimensions {
            info_lines.push(format!("Raster Size: {} x {}", dims.0, dims.1));
        }
        info_lines.push(format!("Band Count: {}", tiff.images().len()));
    }

    // Get origin and pixel size
    if let Some(origin) = tiff.origin() {
        info_lines.push(format!("Upper Left Corner: ({}, {})", origin[0], origin[1]));
    }

    if let Some(pixel_size) = tiff.pixel_size() {
        info_lines.push(format!(
            "Pixel Resolution: ({}, {})",
            pixel_size[0], pixel_size[1]
        ));
    }

    // Get projection info
    if let Some(ref geo_params) = tiff.geo_params {
        let proj_str = format!("{:?}", geo_params);
        let truncated = if proj_str.len() > 50 {
            format!("{}...", &proj_str[..50])
        } else {
            proj_str
        };
        info_lines.push(format!("Projection: {}", truncated));
    }

    info!("Raster summary generated for: {}", file_path);
    Ok(info_lines.join("\n"))
}

/// Build a detailed raster description for display
pub fn describe_raster(file_path: &str) -> Result<String, String> {
    debug!("Describing raster in detail: {}", file_path);

    let file = File::open(file_path).map_err(|e| format!("Failed to open file: {}", e))?;

    let reader = BufReader::new(file);
    let tiff = GeoTiffReader::open(reader).map_err(|e| format!("Failed to read GeoTIFF: {}", e))?;

    let mut info_lines = vec![format!("File Path: {}\n", file_path), "=".repeat(50)];

    // Get image dimensions
    if let Some(img) = tiff.images().first() {
        if let Some(dims) = img.dimensions {
            info_lines.push(format!("Raster Size: {} x {}", dims.0, dims.1));
        }
        info_lines.push(format!("Band Count: {}", tiff.images().len()));
    }

    // Geospatial information
    info_lines.push("\nGeospatial Information:".to_string());

    if let Some(origin) = tiff.origin() {
        info_lines.push(format!("  Upper Left X: {}", origin[0]));
        info_lines.push(format!("  Upper Left Y: {}", origin[1]));
    }

    if let Some(pixel_size) = tiff.pixel_size() {
        info_lines.push(format!("  Pixel Width: {}", pixel_size[0]));
        info_lines.push(format!("  Pixel Height: {}", pixel_size[1]));
    }

    // Projection information
    if let Some(ref geo_params) = tiff.geo_params {
        let proj_str = format!("{:?}", geo_params);
        let truncated = if proj_str.len() > 50 {
            format!("{}...", &proj_str[..50])
        } else {
            proj_str
        };
        info_lines.push(format!("\nProjection: {}", truncated));
    }

    // Band details
    info_lines.push("\nBand Details:".to_string());
    for (idx, img) in tiff.images().iter().enumerate().take(3) {
        info_lines.push(format!("  Band {}:", idx + 1));
        info_lines.push(format!("    Data Type: {:?}", img.colortype));
        info_lines.push(format!("    Dimensions: {:?}", img.dimensions));
    }

    info!("Detailed raster description generated for: {}", file_path);
    Ok(info_lines.join("\n"))
}

/// Export a raster with translated geotransform
///
/// Note: This is a simplified implementation. The georaster crate doesn't provide
/// direct write capabilities, so this function currently returns an error message.
/// For full functionality, consider using GDAL bindings or implementing a custom
/// GeoTIFF writer.
pub fn export_raster_with_offset(
    source_path: &str,
    save_path: &str,
    x_offset: f64,
    y_offset: f64,
    _progress_callback: Option<Box<dyn Fn(u32) + Send>>,
    _status_callback: Option<Box<dyn Fn(&str) + Send>>,
) -> Result<String, String> {
    debug!(
        "Export raster with offset - source: {}, dest: {}, x_offset: {}, y_offset: {}",
        source_path, save_path, x_offset, y_offset
    );

    // Validate paths
    if !Path::new(source_path).exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    let source_abs =
        std::fs::canonicalize(source_path).map_err(|e| format!("Invalid source path: {}", e))?;

    let save_parent = Path::new(save_path).parent().ok_or("Invalid save path")?;

    if !save_parent.exists() {
        std::fs::create_dir_all(save_parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    // Check if paths are the same
    if let Ok(save_abs) = std::fs::canonicalize(save_path) {
        if source_abs == save_abs {
            return Err("Output path cannot be the same as input path!".to_string());
        }
    }

    warn!("Export functionality is not yet fully implemented");
    warn!("The georaster crate provides read-only access to GeoTIFF files");

    // Read source to validate it
    let file = File::open(source_path).map_err(|e| format!("Failed to open source file: {}", e))?;

    let reader = BufReader::new(file);
    let tiff =
        GeoTiffReader::open(reader).map_err(|e| format!("Failed to read source GeoTIFF: {}", e))?;

    // Get original transform
    let origin = tiff
        .origin()
        .ok_or("Source raster has no origin information")?;
    let pixel_size = tiff
        .pixel_size()
        .ok_or("Source raster has no pixel size information")?;

    info!("Original origin: ({}, {})", origin[0], origin[1]);
    info!("Pixel size: ({}, {})", pixel_size[0], pixel_size[1]);
    info!("Requested offset: X={}, Y={}", x_offset, y_offset);

    // Calculate new transform
    let new_origin_x = origin[0] + x_offset;
    let new_origin_y = origin[1] + y_offset;

    info!("New origin would be: ({}, {})", new_origin_x, new_origin_y);

    // Return information about what would be done
    let result = format!(
        "\n\nNote: Export functionality requires GDAL bindings or a GeoTIFF writer.\n\
        The georaster crate currently only supports reading GeoTIFF files.\n\n\
        Requested operation:\n\
        Source: {}\n\
        Destination: {}\n\
        Original Origin: ({}, {})\n\
        Pixel Size: ({}, {})\n\
        Offset: ({}, {})\n\
        New Origin: ({}, {})\n\n\
        To implement full export functionality, consider:\n\
        1. Using Python with rasterio (as in raster_service.py)\n\
        2. Adding GDAL Rust bindings (gdal crate)\n\
        3. Implementing a custom GeoTIFF writer\n\
        4. Calling the Python raster_service.py from Rust",
        source_path,
        save_path,
        origin[0],
        origin[1],
        pixel_size[0],
        pixel_size[1],
        x_offset,
        y_offset,
        new_origin_x,
        new_origin_y
    );

    Err(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_size() {
        assert_eq!(WINDOW_SIZE, 512);
    }
}
