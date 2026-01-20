use flexi_logger::{Age, Cleanup, Criterion, Duplicate, FileSpec, Logger, Naming};
use log::{debug, info};

mod raster_service;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    debug!("Greeting command invoked with name: {}", name);
    info!("Sending greet response for: {}", name);
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Tauri command to get a concise summary of raster metadata
#[tauri::command]
fn summarize_raster(file_path: String) -> Result<String, String> {
    info!("Summarize raster command called for: {}", file_path);
    raster_service::summarize_raster(&file_path)
}

/// Tauri command to get detailed raster description
#[tauri::command]
fn describe_raster(file_path: String) -> Result<String, String> {
    info!("Describe raster command called for: {}", file_path);
    raster_service::describe_raster(&file_path)
}

/// Tauri command to export raster with offset
#[tauri::command]
fn export_raster_with_offset(
    source_path: String,
    save_path: String,
    x_offset: f64,
    y_offset: f64,
) -> Result<String, String> {
    info!(
        "Export raster command called - source: {}, dest: {}, x_offset: {}, y_offset: {}",
        source_path, save_path, x_offset, y_offset
    );
    raster_service::export_raster_with_offset(
        &source_path,
        &save_path,
        x_offset,
        y_offset,
        None, // progress_callback
        None, // status_callback
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    // Global level set to 'debug' so it appears in console
    Logger::try_with_str("debug")
        .expect("Failed to initialize log specification")
        .log_to_file(FileSpec::default().directory("logs").basename("geooffset"))
        .rotate(
            Criterion::Age(Age::Day),
            Naming::Timestamps,
            Cleanup::KeepLogFiles(30),
        )
        // Duplicate everything to stderr (console)
        .duplicate_to_stderr(Duplicate::All)
        .start()
        .expect("Failed to start logger");

    info!("Application started successfully");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            summarize_raster,
            describe_raster,
            export_raster_with_offset
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
