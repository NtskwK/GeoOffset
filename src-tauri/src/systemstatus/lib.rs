#[derive(ts_rs::TS)]
#[ts(export)]
struct SystemStatus {
    cpu_usage: i32,
    ram_usage: i32,
}
