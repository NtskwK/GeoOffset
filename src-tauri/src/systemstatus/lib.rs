#[derive(ts_rs::TS)]
#[ts(export)]
struct SystemStatus {
    cpu_cores: i32,
    cpu_usage: i32,
    ram_all: usize,
    ram_usage: usize,
}

pub fn get_system_status() -> SystemStatus {
    let mut sys = sysinfo::System::new_all();

    sys.refresh_cpu();
    thread::sleep(Duration::from_millis(500));
    sys.refresh_cpu();

    sys.refresh_memory();
    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();

    SystemStatus {
        cpu_cores: sys.cpus().len() as i32,
        cpu_usage: sys.global_cpu_info().cpu_usage() as i32,
        ram_all: total_mem as usize,
        ram_usage: used_mem as usize,
    }
}
