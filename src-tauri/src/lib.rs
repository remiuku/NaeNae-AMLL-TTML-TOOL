use std::fs;
use std::path::PathBuf;

#[derive(serde::Serialize)]
struct OpenFileData {
    pub filename: String,
    pub data: String,
    pub ext: String,
}

#[tauri::command]
fn convert_audio_mp3_to_flac(input_data: Vec<u8>, filename: String) -> Result<Vec<u8>, String> {
    let temp_dir = std::env::temp_dir();
    let input_path = temp_dir.join(format!("ttml_tool_input_{}", filename));
    let output_path = temp_dir.join("ttml_tool_output.flac");

    if let Err(e) = fs::write(&input_path, &input_data) {
        return Err(format!("Failed to write temp input file: {}", e));
    }

    let ffmpeg_result = std::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-i",
            input_path.to_str().unwrap(),
            "-codec:a",
            "flac",
            "-sample-rate",
            "44100",
            output_path.to_str().unwrap(),
        ])
        .output();

    let _ = fs::remove_file(&input_path);

    match ffmpeg_result {
        Ok(result) => {
            if result.status.success() {
                match fs::read(&output_path) {
                    Ok(converted_data) => {
                        let _ = fs::remove_file(&output_path);
                        Ok(converted_data)
                    }
                    Err(e) => Err(format!("Failed to read converted file: {}", e))
                }
            } else {
                let stderr_output = String::from_utf8_lossy(&result.stderr);
                let stdout_output = String::from_utf8_lossy(&result.stdout);
                if stderr_output.contains("not found") || stderr_output.is_empty() && stdout_output.is_empty() {
                    Err("ffmpeg not found. Please install ffmpeg and ensure it's in your PATH.".to_string())
                } else {
                    Err(format!("FFmpeg conversion failed: {}\nStdout: {}", stderr_output, stdout_output))
                }
            }
        }
        Err(e) => {
            let error_msg = if e.kind() == std::io::ErrorKind::NotFound {
                "ffmpeg not found. Please install ffmpeg and ensure it's in your PATH.".to_string()
            } else {
                format!("Failed to run ffmpeg: {}. Make sure ffmpeg is installed and in your PATH.", e)
            };
            Err(error_msg)
        }
    }
}

#[tauri::command]
fn get_open_file_data() -> Option<OpenFileData> {
    let filename = std::env::args().nth(1);
    if let Some(filename) = filename {
        let path = std::path::Path::new(&filename);
        let ext = path
            .extension()
            .map(|x| x.to_string_lossy().into_owned())
            .unwrap_or_default();
        if let Ok(data) = std::fs::read_to_string(&filename) {
            return Some(OpenFileData {
                filename,
                data,
                ext,
            });
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[allow(clippy::missing_panics_doc)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            #[cfg(target_os = "macos")]
            {
                use tao::rwh_06::HasWindowHandle;
                use tauri::Manager;
                use tauri_plugin_decorum::WebviewWindowExt;

                let main_window = app.get_webview_window("main").unwrap();
                main_window.set_traffic_lights_inset(16.0, 20.0).unwrap();
                main_window.make_transparent().unwrap();
                let main_window_clone = main_window.clone();
                main_window.on_window_event(move |evt| {
                    if let tauri::WindowEvent::Resized(_) = evt {
                        main_window_clone
                            .set_traffic_lights_inset(16.0, 20.0)
                            .unwrap();
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_open_file_data, convert_audio_mp3_to_flac,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
