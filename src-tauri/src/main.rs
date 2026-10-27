// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    disable_nvidia_explicit_sync();
    amll_ttml_tool_lib::run();
}

/// WebKitGTK hangs or crashes the session on NVIDIA's driver when explicit
/// sync is on, so turn it off unless the user already chose a value.
#[cfg(target_os = "linux")]
fn disable_nvidia_explicit_sync() {
    const VAR: &str = "__NV_DISABLE_EXPLICIT_SYNC";
    if std::env::var_os(VAR).is_none() && std::path::Path::new("/proc/driver/nvidia").exists() {
        // SAFETY: runs first in main, before any other thread exists.
        unsafe { std::env::set_var(VAR, "1") };
    }
}
