use std::path::PathBuf;

pub fn get_log_dir() -> PathBuf {
    let exec_path = std::env::current_exe().expect("Failed to get current executable path");
    let exec_dir = exec_path
        .parent()
        .expect("Failed to get parent directory of executable");
    exec_dir.join("logs")
}
