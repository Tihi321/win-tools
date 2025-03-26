mod scripts;
mod tts;
mod utils;
use std::{collections::HashMap, path::Path, process::Command};

// Add warp server imports
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;
use tts::config::{update_pitch, update_rate, update_volume};
use warp::Filter;

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
            Ok(_) => {
                println!("✅ Generated play mode audio successfully");

                // After generating, add a small delay to ensure the file is ready
                // and verify that the file exists and has content
                let file_path = tts::tts::get_audio_file_path(&file_name);

                // Wait for the file to be fully written
                let max_retries = 5;
                let mut retry_count = 0;
                let mut file_ready = false;

                while retry_count < max_retries && !file_ready {
                    if file_path.exists() {
                        match std::fs::metadata(&file_path) {
                            Ok(metadata) => {
                                if metadata.len() > 0 {
                                    file_ready = true;
                                    println!(
                                        "📁 File verified: {} bytes ready for playback",
                                        metadata.len()
                                    );
                                    break;
                                } else {
                                    println!("⏳ File exists but is empty, waiting...");
                                }
                            }
                            Err(e) => println!("⚠️ Error checking file metadata: {}", e),
                        }
                    }

                    // Sleep for a short time before retrying
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    retry_count += 1;
                    println!(
                        "⏳ Waiting for file (attempt {}/{})",
                        retry_count, max_retries
                    );
                }

                if !file_ready {
                    return Err(
                        "File generation completed but file is not ready for playback".to_string(),
                    );
                }
            }
            Err(e) => return Err(format!("Failed to generate play mode audio: {}", e)),
        }
    }

    // Get the full path to the audio file
    let file_path = tts::tts::get_audio_file_path(&file_name)
        .to_string_lossy()
        .to_string();
    println!("🔍 Resolved file path: {}", file_path);

    // Add a small sleep to ensure file system operations are complete
    std::thread::sleep(std::time::Duration::from_millis(100));

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
                let file_size = metadata.len();
                println!("   - File size: {} bytes", file_size);
                println!("   - Is file: {}", metadata.is_file());
                println!("   - Last modified: {:?}", metadata.modified().ok());

                // Additional check to ensure the file has content
                if file_size == 0 {
                    return Err("File exists but is empty (0 bytes)".to_string());
                }
            }
            Err(e) => {
                println!("   - Could not get metadata: {}", e);
                return Err(format!("Failed to get file metadata: {}", e));
            }
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
            Ok(false)
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
    update_play_mode_text(&text, false).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_tts_last_voice(voice: String) -> Result<(), String> {
    update_last_voice(&voice).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_tts_pitch(pitch: f32) -> Result<(), String> {
    update_pitch(pitch).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_tts_rate(rate: f32) -> Result<(), String> {
    update_rate(rate).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_tts_volume(volume: f32) -> Result<(), String> {
    update_volume(volume).map_err(|e| e.to_string())
}

// Add API server module to lib.rs
async fn start_api_server(app_handle: tauri::AppHandle) {
    let port = 7891; // Using a less common port for safety
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    // Store app_handle for use in routes
    let app_handle = Arc::new(Mutex::new(app_handle));

    // Create a CORS layer to allow requests from anywhere
    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["POST"]);

    // Define route for text-to-speech with proper error handling
    let tts_route = warp::path("tts")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_app_handle(app_handle.clone()))
        .and_then(|payload, handle| async move {
            println!("🌐 Received TTS API request");

            // Catch any panics during request handling
            match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| async {
                handle_tts_request(payload, handle).await
            }))
            .map_err(|_| "Handler panicked")
            .and_then(|future| Ok(future))
            {
                Ok(future) => match future.await {
                    Ok(response) => Ok(response),
                    Err(rejection) => {
                        println!("❌ API request resulted in rejection: {:?}", rejection);
                        Err(rejection)
                    }
                },
                Err(e) => {
                    println!("❌ Fatal error in API handler: {}", e);
                    Err(warp::reject::reject())
                }
            }
        })
        .with(cors); // Apply CORS to the route

    println!("🌐 Starting API server on http://{}", addr);
    println!("🔊 TTS endpoint available at http://{}/tts", addr);
    println!("🔓 CORS is disabled - API accessible from any domain");

    warp::serve(tts_route).run(addr).await;
}

// Helper function to share app_handle with routes
fn with_app_handle(
    app_handle: Arc<Mutex<tauri::AppHandle>>,
) -> impl Filter<Extract = (Arc<Mutex<tauri::AppHandle>>,), Error = std::convert::Infallible> + Clone
{
    warp::any().map(move || app_handle.clone())
}

// TTS request handler
async fn handle_tts_request(
    payload: serde_json::Value,
    app_handle: Arc<Mutex<tauri::AppHandle>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    println!("📝 Received TTS request: {:?}", payload);

    // Extract text from request
    let text = match payload.get("text") {
        Some(text) => text.as_str().unwrap_or(""),
        None => "",
    };

    if text.is_empty() {
        return Ok(warp::reply::with_status(
            warp::reply::json(&serde_json::json!({
                "error": "Text is required"
            })),
            warp::http::StatusCode::BAD_REQUEST,
        ));
    }

    println!("📄 Processing text: {}", text);

    // Emit the generating_audio event to show loader in UI
    let app_handle_lock = app_handle.lock().await;
    app_handle_lock
        .get_webview_window(WINDOW_LABEL)
        .unwrap()
        .emit_to(WINDOW_LABEL, "generating_audio", true)
        .unwrap_or_else(|e| {
            eprintln!("Failed to emit generating_audio event: {}", e);
        });
    println!("✅ Emitted generating_audio TRUE event to show loader");
    // Release lock after emitting event
    drop(app_handle_lock);

    // Update the config with the new text, but skip deletion since we'll generate right after
    if let Err(e) = tts::config::update_play_mode_text(text, true) {
        // Use a thread-safe error message instead of the error itself
        let error_message = format!("Failed to update config: {}", e);
        println!("❌ {}", error_message);
        return Ok(warp::reply::with_status(
            warp::reply::json(&serde_json::json!({
                "error": error_message
            })),
            warp::http::StatusCode::INTERNAL_SERVER_ERROR,
        ));
    }

    // Load the updated config for voice info
    let config = tts::config::load_config();
    println!("📚 Using voice: {}", config.last_voice);

    // Make sure the export directory exists before we try to generate audio
    let play_file = tts::constants::PLAY_MODE_AUDIO_FILE;
    let file_path = tts::tts::get_audio_file_path(play_file);
    println!("🎯 Target file path: {}", file_path.display());

    // Use match with thread-safe error handling
    let result = tts::tts::generate_tts_synthesis(
        text,
        play_file,
        &config.last_voice,
        config.pitch,
        config.rate,
        config.volume,
    );

    match result {
        Ok(_) => {
            println!("✅ Generated audio from API request");

            // Double-check that the file exists before continuing
            if !file_path.exists() {
                println!(
                    "⚠️ Warning: File wasn't created even though generation didn't report errors"
                );
                return Ok(warp::reply::with_status(
                    warp::reply::json(&serde_json::json!({
                        "error": "File wasn't created successfully even though generation completed"
                    })),
                    warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                ));
            }

            // Get the app handle to play the audio and update UI
            let app_handle_lock = app_handle.lock().await;

            // Signal that generation is complete
            app_handle_lock
                .get_webview_window(WINDOW_LABEL)
                .unwrap()
                .emit_to(WINDOW_LABEL, "generating_audio", false)
                .unwrap_or_else(|e| {
                    eprintln!("Failed to emit generating_audio completion event: {}", e);
                });
            println!("✅ Emitted generating_audio FALSE event to hide loader");

            // Verify file exists and wait for it to be ready before playing
            let max_retries = 5;
            let mut retry_count = 0;
            let mut file_ready = false;

            while retry_count < max_retries && !file_ready {
                if file_path.exists() {
                    // Check if file is fully written
                    match std::fs::metadata(&file_path) {
                        Ok(metadata) => {
                            if metadata.len() > 0 {
                                file_ready = true;
                                println!("📁 Audio file verified: {} bytes", metadata.len());
                            } else {
                                println!("⏳ Audio file exists but is empty, retrying...");
                            }
                        }
                        Err(e) => println!("⚠️ Failed to read file metadata: {}", e),
                    }
                } else {
                    println!(
                        "⚠️ File does not exist during verification: {}",
                        file_path.display()
                    );
                }

                if !file_ready {
                    println!(
                        "⏳ Waiting for file to be ready (attempt {}/{})",
                        retry_count + 1,
                        max_retries
                    );
                    // Short delay before retry
                    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                    retry_count += 1;
                }
            }

            if !file_ready {
                return Ok(warp::reply::with_status(
                    warp::reply::json(&serde_json::json!({
                        "error": "Generated file not ready for playback after multiple attempts"
                    })),
                    warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                ));
            }

            // Play the audio
            println!("🔊 Attempting to play audio");
            match play_audio(String::new(), app_handle_lock.clone()).await {
                Ok(_) => {
                    app_handle_lock
                        .get_webview_window(WINDOW_LABEL)
                        .unwrap()
                        .emit_to(WINDOW_LABEL, "text_updated_from_api", text)
                        .unwrap_or_else(|e| {
                            eprintln!("Failed to emit text_updated_from_api event: {}", e);
                        });

                    Ok(warp::reply::with_status(
                        warp::reply::json(&serde_json::json!({
                            "success": true,
                            "message": "Text processed and audio playing"
                        })),
                        warp::http::StatusCode::OK,
                    ))
                }
                Err(e) => {
                    println!("❌ Error playing audio: {}", e);
                    Ok(warp::reply::with_status(
                        warp::reply::json(&serde_json::json!({
                            "error": format!("Failed to play audio: {}", e)
                        })),
                        warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                    ))
                }
            }
        }
        Err(e) => {
            // Convert error to string for thread safety
            let error_message = format!("Failed to generate audio: {}", e);
            println!("❌ {}", error_message);

            // Signal that generation failed
            let app_handle_lock = app_handle.lock().await;
            app_handle_lock
                .get_webview_window(WINDOW_LABEL)
                .unwrap()
                .emit_to(WINDOW_LABEL, "generating_audio", false)
                .unwrap_or_else(|e| {
                    eprintln!("Failed to emit generating_audio completion event: {}", e);
                });
            println!("✅ Emitted generating_audio FALSE event (on error) to hide loader");

            Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": error_message
                })),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
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
            set_tts_pitch,
            set_tts_rate,
            set_tts_volume,
            stop_audio_playback,
            get_audio_playback_status,
        ])
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            // Create app handles
            let app_handle = app.app_handle();
            let api_server_handle = app_handle.clone();
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

                        // Load config for pitch, rate, and volume
                        let config = tts::config::load_config();

                        match generate_tts_synthesis(
                            text.as_str(),
                            name.as_str(),
                            voice.as_str(),
                            config.pitch,
                            config.rate,
                            config.volume,
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

                        // Load config for pitch, rate, and volume
                        let config = tts::config::load_config();

                        let text = std::fs::read_to_string(file).unwrap();
                        generate_tts_synthesis(
                            text.as_str(),
                            name.as_str(),
                            voice.as_str(),
                            config.pitch,
                            config.rate,
                            config.volume,
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
                if let Err(e) = open_in_export_folder() {
                    eprintln!("Failed to open export folder: {}", e);
                }
            });

            app.listen("update_play_mode_text", move |event| {
                let payload = event.payload().to_string();
                let text = payload.trim_start_matches('"').trim_end_matches('"');
                match tts::config::update_play_mode_text(text, false) {
                    Ok(_) => println!("✅ Updated play mode text in config"),
                    Err(e) => eprintln!("Failed to update play mode text: {}", e),
                }
            });

            println!("Application setup completed successfully");

            // Start the API server in a separate task
            tauri::async_runtime::spawn(async move {
                start_api_server(api_server_handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
