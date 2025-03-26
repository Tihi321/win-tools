mod scripts;
mod tts;
mod utils;
use std::{collections::HashMap, path::Path, process::Command};

use scripts::{
    disk::{add_script_to_disk, get_scripts_string, remove_script, save_script},
    structs::{Script, ScriptSaveWindow},
    terminal::{start_script, stop_script},
};
use serde_json::{self};
use tauri::{Emitter, Listener, Manager};
use tts::{
    config::{
        load_config, update_last_voice, update_play_mode, update_play_mode_text, update_use_file,
        TtsConfig,
    },
    disk::open_in_export_folder,
    tts::{
        check_audio_file_exists, generate_tts_synthesis, get_voices_list_names, save_voices_list,
    },
};
use utils::{
    constants::WINDOW_LABEL,
    structs::{AddFile, AudioFile, AudioText, RemoveFile},
};

use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: String,
}

fn open_power_shell_window(filepath: &str) {
    let powershell_command = format!(
        "Start-Process powershell.exe -ArgumentList \"-NoExit\", \"-Command Get-Content -Path '{}' -Wait\"",
        filepath
    );

    Command::new("powershell")
        .args(&["-Command", &powershell_command])
        .spawn()
        .expect("Failed to open PowerShell window");
}

#[tauri::command]
fn monitor_log_file(filepath: String) {
    println!(
        "Opening PowerShell window to monitor log file: {}",
        filepath
    );
    open_power_shell_window(&filepath);
}

#[tauri::command]
async fn make_api_request(
    url: String,
    method: String,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();

    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err("Unsupported HTTP method".to_string()),
    };

    if let Some(headers) = headers {
        let mut header_map = HeaderMap::new();
        for (key, value) in headers {
            header_map.insert(
                HeaderName::from_bytes(key.as_bytes()).map_err(|e| e.to_string())?,
                HeaderValue::from_str(&value).map_err(|e| e.to_string())?,
            );
        }
        request = request.headers(header_map);
    }

    if let Some(body) = body {
        request = request.body(body);
    }

    let response = request.send().await.map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let headers = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    let body = response.text().await.map_err(|e| e.to_string())?;

    Ok(ApiResponse {
        status,
        headers,
        body,
    })
}

#[tauri::command]
async fn play_audio(name: String, app_handle: tauri::AppHandle) -> Result<bool, String> {
    println!("⏯️ Play audio request received from UI with name: {}", name);

    // Check if we're in play mode by loading the config
    let config = tts::config::load_config();

    // Determine the file name to use
    let file_name = if config.play_mode {
        // In play mode, always use the constant play file name
        tts::constants::PLAY_MODE_AUDIO_FILE.to_string()
    } else if name.is_empty() {
        "output".to_string()
    } else {
        name.clone()
    };

    // For play mode, check if file exists, if not generate it from config
    if config.play_mode && !tts::tts::check_audio_file_exists(&file_name) {
        println!("🔄 Play mode audio file doesn't exist, generating it now");
        // Generate audio using the current config settings
        match tts::tts::generate_tts_synthesis(
            &config.play_mode_text,
            &file_name,
            &config.last_voice,
            1.0, // Default pitch
            1.0, // Default rate
            1.0, // Default volume
        ) {
            Ok(_) => println!("✅ Generated play mode audio successfully"),
            Err(e) => return Err(format!("Failed to generate play mode audio: {}", e)),
        }
    }

    // Get the full path to the audio file
    let file_path = tts::tts::get_audio_file_path(&file_name)
        .to_string_lossy()
        .to_string();
    println!("🔍 Resolved file path: {}", file_path);

    // Verify file exists
    let path = Path::new(&file_path);
    if !path.exists() {
        println!("❌ File does not exist: {}", file_path);
        println!("   - Is absolute path: {}", path.is_absolute());
        println!("   - Parent directory: {:?}", path.parent());

        // Try to list directory contents if parent exists
        if let Some(parent) = path.parent() {
            if parent.exists() {
                println!("   - Parent directory exists, listing contents:");
                match std::fs::read_dir(parent) {
                    Ok(entries) => {
                        for entry in entries {
                            if let Ok(entry) = entry {
                                println!("     * {}", entry.path().display());
                            }
                        }
                    }
                    Err(e) => println!("   - Could not read directory: {}", e),
                }
            }
        }
        return Err(format!("File does not exist: {}", file_path));
    } else {
        println!("✅ File exists and will attempt playback");

        // Print detailed file information
        match std::fs::metadata(path) {
            Ok(metadata) => {
                println!("   - File size: {} bytes", metadata.len());
                println!("   - Is file: {}", metadata.is_file());
                println!("   - Last modified: {:?}", metadata.modified().ok());
            }
            Err(e) => println!("   - Could not get metadata: {}", e),
        }
    }

    match tts::tts::play_audio_backend(&file_path) {
        Ok(_) => {
            println!("🔊 Audio playback started successfully");

            // Emit event to frontend about playback status
            app_handle
                .emit(
                    "audio_playback_status",
                    serde_json::json!({
                        "status": "playing",
                        "file": file_name
                    }),
                )
                .unwrap_or_else(|e| {
                    println!("❌ Failed to emit audio_playback_status event: {}", e);
                    eprintln!("Failed to emit audio status: {}", e)
                });

            println!("✅ Emitted audio_playback_status event with playing status");
            Ok(true)
        }
        Err(e) => {
            println!("❌ Error playing audio: {}", e);
            Err(format!("Failed to play audio: {}", e))
        }
    }
}

#[tauri::command]
async fn stop_audio_playback(app_handle: tauri::AppHandle) -> Result<bool, String> {
    println!("⏹️ Stop audio request received from UI");

    match tts::tts::stop_audio() {
        Ok(_) => {
            println!("🔇 Audio stopped successfully");

            // Emit event to frontend about playback status
            app_handle
                .emit(
                    "audio_playback_status",
                    serde_json::json!({
                        "status": "stopped",
                        "file": ""
                    }),
                )
                .unwrap_or_else(|e| {
                    println!("❌ Failed to emit audio_playback_status event: {}", e);
                    eprintln!("Failed to emit audio status: {}", e)
                });

            println!("✅ Emitted audio_playback_status event with stopped status");
            Ok(true)
        }
        Err(e) => {
            println!("❌ Error stopping audio: {}", e);
            Err(format!("Failed to stop audio: {}", e))
        }
    }
}

#[tauri::command]
async fn get_audio_playback_status() -> serde_json::Value {
    let is_playing = tts::tts::is_audio_playing();
    let file = tts::tts::get_current_playing_file().unwrap_or_default();

    serde_json::json!({
        "status": if is_playing { "playing" } else { "stopped" },
        "file": file
    })
}

#[tauri::command]
fn check_audio_exists(name: String) -> bool {
    let file_name = if name.is_empty() {
        "output".to_string()
    } else {
        name
    };
    check_audio_file_exists(&file_name)
}

#[tauri::command]
fn get_tts_config() -> TtsConfig {
    load_config()
}

#[tauri::command]
fn set_tts_use_file(use_file: bool) -> Result<(), String> {
    update_use_file(use_file).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_tts_play_mode(play_mode: bool) -> Result<(), String> {
    update_play_mode(play_mode).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_tts_play_mode_text(text: String) -> Result<(), String> {
    update_play_mode_text(&text).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_tts_last_voice(voice: String) -> Result<(), String> {
    update_last_voice(&voice).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            make_api_request,
            monitor_log_file,
            play_audio,
            check_audio_exists,
            get_tts_config,
            set_tts_use_file,
            set_tts_play_mode,
            set_tts_play_mode_text,
            set_tts_last_voice,
            stop_audio_playback,
            get_audio_playback_status,
        ])
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            // Create app handles
            let app_handle = app.app_handle();
            let get_voices_handle = app_handle.clone();
            let refresh_hvoices_handle = app_handle.clone();
            let create_text_hvoices_handle = app_handle.clone();
            let create_file_hvoices_handle = app_handle.clone();
            let update_window_title = app_handle.clone();
            let get_scripts = app_handle.clone();
            let save_script_file = app_handle.clone();
            let remove_script_file = app_handle.clone();
            let add_script_file = app_handle.clone();

            // Don't create a window here since it's already defined in tauri.conf.json
            // The window with label "main" will be created automatically by Tauri

            // Initialize the scripts database
            let _ = scripts::disk::get_scripts_db_path();

            // Register event listeners
            app.listen("update_title", move |event| {
                let payload = event.payload().to_string();
                let title = payload.trim_start_matches('"').trim_end_matches('"');

                let _ = update_window_title
                    .get_webview_window(WINDOW_LABEL)
                    .unwrap()
                    .set_title(title);
            });

            app.listen("get_voices_list", move |_| {
                let voices = get_voices_list_names();
                let window = get_voices_handle.get_webview_window(WINDOW_LABEL).unwrap();
                window
                    .emit_to(WINDOW_LABEL, "get_voices_list_response", voices)
                    .expect("Failed to emit event");
            });

            app.listen("refresh_voices_list", move |_| {
                save_voices_list();
                let voices = get_voices_list_names();
                let window = refresh_hvoices_handle
                    .get_webview_window(WINDOW_LABEL)
                    .unwrap();
                window
                    .emit_to(WINDOW_LABEL, "get_voices_list_response", voices)
                    .expect("Failed to emit event");
            });

            app.listen("create_audio_from_text", move |event| {
                let value = event.payload();
                match serde_json::from_str::<AudioText>(value) {
                    Ok(audio_payload) => {
                        println!("📝 Creating audio from text");
                        let text = audio_payload.text;
                        let name = audio_payload.name;
                        let voice = audio_payload.voice;
                        let pitch = audio_payload.pitch;
                        let rate = audio_payload.rate;
                        let volume = audio_payload.volume;

                        match generate_tts_synthesis(
                            text.as_str(),
                            name.as_str(),
                            voice.as_str(),
                            pitch,
                            rate,
                            volume,
                        ) {
                            Ok(_) => {
                                println!("✅ Successfully generated TTS audio");
                                let window = create_text_hvoices_handle
                                    .get_webview_window(WINDOW_LABEL)
                                    .unwrap();
                                window
                                    .emit_to(WINDOW_LABEL, "create_audio_response", true)
                                    .expect("Failed to emit event");
                                println!("📣 Emitted create_audio_response event");
                            }
                            Err(e) => {
                                println!("❌ Failed to generate TTS audio: {}", e);
                                let window = create_text_hvoices_handle
                                    .get_webview_window(WINDOW_LABEL)
                                    .unwrap();
                                window
                                    .emit_to(WINDOW_LABEL, "create_audio_response", false)
                                    .expect("Failed to emit event");
                            }
                        }
                    }
                    Err(e) => eprintln!("Failed to parse event payload: {}", e),
                }
            });

            app.listen("get_scripts", move |_| {
                let scripts = get_scripts_string().expect("Failed to get scripts");
                get_scripts
                    .get_webview_window(WINDOW_LABEL)
                    .unwrap()
                    .emit_to(WINDOW_LABEL, "scripts", scripts)
                    .expect("Failed to emit event");
            });

            app.listen("save_script", move |event| {
                let value = event.payload();
                match serde_json::from_str::<ScriptSaveWindow>(value) {
                    Ok(window_script) => {
                        save_script(
                            window_script.path,
                            window_script.name,
                            window_script.script_args,
                            window_script.save,
                        )
                        .unwrap();
                        let scripts = get_scripts_string().expect("Failed to get scripts");
                        save_script_file
                            .get_webview_window(WINDOW_LABEL)
                            .unwrap()
                            .emit_to(WINDOW_LABEL, "scripts", scripts)
                            .expect("Failed to emit event");
                    }
                    Err(e) => eprintln!("Failed to parse event payload: {}", e),
                }
            });

            app.listen("start_script", move |event| {
                let value = event.payload();
                match serde_json::from_str::<Script>(value) {
                    Ok(window_script) => {
                        start_script(&Script {
                            visibility: window_script.visibility,
                            arguments: window_script.arguments,
                            path: window_script.path,
                        })
                        .unwrap();
                    }
                    Err(e) => eprintln!("Failed to parse event payload: {}", e),
                }
            });

            app.listen("stop_script", move |event| {
                let payload = event.payload().to_string();
                let path = payload.trim_start_matches('"').trim_end_matches('"');
                let name = Path::new(path).file_name().unwrap().to_str().unwrap();
                stop_script(name).unwrap();
            });

            app.listen("add_script", move |event| {
                let payload = event.payload();
                match serde_json::from_str::<AddFile>(payload) {
                    Ok(value) => {
                        let path = value.path;
                        add_script_to_disk(path);

                        let scripts = get_scripts_string().expect("Failed to get scripts");
                        // Use the app_handle to get the window by its label
                        add_script_file
                            .get_webview_window(WINDOW_LABEL)
                            .unwrap()
                            .emit_to(WINDOW_LABEL, "scripts", scripts)
                            .expect("Failed to emit event");
                    }
                    Err(e) => eprintln!("Failed to parse event payload: {}", e),
                }
            });

            app.listen("remove_script", move |event| {
                let payload = event.payload();
                match serde_json::from_str::<RemoveFile>(payload) {
                    Ok(value) => {
                        let name = value.name;
                        let path = value.path;
                        let remove_from_disk = value.remove_from_disk;
                        remove_script(name, path, remove_from_disk).unwrap();

                        let scripts = get_scripts_string().expect("Failed to get scripts");
                        // Use the app_handle to get the window by its label
                        remove_script_file
                            .get_webview_window(WINDOW_LABEL)
                            .unwrap()
                            .emit_to(WINDOW_LABEL, "scripts", scripts)
                            .expect("Failed to emit event");
                    }
                    Err(e) => eprintln!("Failed to parse event payload: {}", e),
                }
            });

            app.listen("create_audio_from_file", move |event| {
                let value = event.payload();
                match serde_json::from_str::<AudioFile>(value) {
                    Ok(audio_payload) => {
                        let file = audio_payload.file;
                        let name = audio_payload.name;
                        let voice = audio_payload.voice;
                        let pitch = audio_payload.pitch;
                        let rate = audio_payload.rate;
                        let volume = audio_payload.volume;

                        let text = std::fs::read_to_string(file).unwrap();
                        generate_tts_synthesis(
                            text.as_str(),
                            name.as_str(),
                            voice.as_str(),
                            pitch,
                            rate,
                            volume,
                        )
                        .unwrap();

                        let window = create_file_hvoices_handle
                            .get_webview_window(WINDOW_LABEL)
                            .unwrap();

                        window
                            .emit_to(WINDOW_LABEL, "create_audio_response", true)
                            .expect("Failed to emit event");
                    }
                    Err(e) => eprintln!("Failed to parse event payload: {}", e),
                }
            });

            app.listen("open_export_folder", move |_| {
                open_in_export_folder().unwrap();
            });

            app.listen("update_play_mode_text", move |event| {
                let payload = event.payload().to_string();
                let text = payload.trim_start_matches('"').trim_end_matches('"');
                match tts::config::update_play_mode_text(text) {
                    Ok(_) => println!("✅ Updated play mode text in config"),
                    Err(e) => eprintln!("Failed to update play mode text: {}", e),
                }
            });

            println!("Application setup completed successfully");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
