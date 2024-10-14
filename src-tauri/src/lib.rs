mod scripts;
mod tts;
mod utils;

use std::{collections::HashMap, path::Path};

use scripts::{
    disk::{add_script_to_disk, get_scripts_string, remove_script, save_script},
    structs::{Script, ScriptSaveWindow},
    terminal::{start_script, stop_script},
};
use serde_json::{self};
use tauri::{Emitter, Listener, Manager};
use tts::{
    disk::open_in_export_folder,
    tts::{generate_tts_synthesis, get_voices_list_names, save_voices_list},
};
use utils::{
    constants::WINDOW_LABEL,
    index::create_window,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![make_api_request])
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
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

            let _ = create_window(&app).unwrap();

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
                        let text = audio_payload.text;
                        let name = audio_payload.name;
                        let voice = audio_payload.voice;
                        let pitch = audio_payload.pitch;
                        let rate = audio_payload.rate;
                        let volume = audio_payload.volume;

                        generate_tts_synthesis(
                            text.as_str(),
                            name.as_str(),
                            voice.as_str(),
                            pitch,
                            rate,
                            volume,
                        )
                        .unwrap();

                        let window = create_text_hvoices_handle
                            .get_webview_window(WINDOW_LABEL)
                            .unwrap();
                        window
                            .emit_to(WINDOW_LABEL, "create_audio_response", true)
                            .expect("Failed to emit event");
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
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
