mod disk;
mod tts;
mod utils;

use disk::disk::open_in_export_folder;
use tauri::{ipc::InvokeBody, Manager};
use tts::tts::{generate_tts_synthesis, get_voices_list_names};
use utils::index::create_window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("Start");

    let _ = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            let _ = create_window(&app).unwrap();

            println!("started ");
            Ok(())
        })
        .invoke_handler(move |invoke| {
            let invoke_message = invoke.message.clone();
            let command = invoke_message.command();
            let payload = invoke_message.payload().clone();
            let current_webview = invoke_message.webview().clone();
            let app_handle_instance = current_webview.app_handle().clone();
            let window_label = current_webview.label();

            match command {
                "create_audio_from_text" => {
                    if let InvokeBody::Json(json_value) = payload {
                        let text = json_value.get("text").and_then(|v| v.as_str());
                        let name = json_value.get("name").and_then(|v| v.as_str());
                        let voice = json_value.get("voice").and_then(|v| v.as_str());

                        match (text, name, voice) {
                            (Some(text), Some(name), Some(voice)) => {
                                generate_tts_synthesis(text, name, voice).unwrap();
                            }
                            _ => println!("Missing or invalid parameters"),
                        }

                        let _ =
                            app_handle_instance.emit_to(window_label, "create_audio_done", true);
                    }
                    true
                }
                "create_audio_from_file" => {
                    if let InvokeBody::Json(json_value) = payload {
                        let file = json_value.get("file").and_then(|v| v.as_str());
                        let name = json_value.get("name").and_then(|v| v.as_str());
                        let voice = json_value.get("voice").and_then(|v| v.as_str());

                        match (file, name, voice) {
                            (Some(file), Some(name), Some(voice)) => {
                                let text = std::fs::read_to_string(file).unwrap();
                                generate_tts_synthesis(text.as_str(), name, voice).unwrap();
                            }
                            _ => println!("Missing or invalid parameters"),
                        }

                        let _ =
                            app_handle_instance.emit_to(window_label, "create_audio_done", true);
                    }
                    true
                }
                "voices_list" => {
                    let voices = get_voices_list_names();
                    let _ = app_handle_instance.emit_to(window_label, "voices_list", voices);
                    true
                }
                "open_export_folder" => {
                    open_in_export_folder().unwrap();
                    true
                }
                _ => {
                    println!("Unhandled command: {}", command);
                    true
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
