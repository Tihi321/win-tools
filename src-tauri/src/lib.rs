mod disk;
mod tts;
mod utils;

use disk::disk::open_in_export_folder;
use serde::{Deserialize, Serialize};
use serde_json::{self};
use tauri::Manager;
use tts::tts::{generate_tts_synthesis, get_voices_list_names, save_voices_list};
use utils::{constants::WINDOW_LABEL, index::create_window};

#[derive(Serialize, Deserialize)]
pub struct AudioText {
    pub(crate) text: String,
    pub(crate) name: String,
    pub(crate) voice: String,
}

#[derive(Serialize, Deserialize)]
pub struct AudioFile {
    pub(crate) file: String,
    pub(crate) name: String,
    pub(crate) voice: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            let app_handle = app.app_handle();
            let get_voices_handle = app_handle.clone();
            let refresh_hvoices_handle = app_handle.clone();
            let create_text_hvoices_handle = app_handle.clone();
            let create_file_hvoices_handle = app_handle.clone();

            let _ = create_window(&app).unwrap();

            app.listen_any("get_voices_list", move |_| {
                let voices = get_voices_list_names();
                let window = get_voices_handle.get_webview_window(WINDOW_LABEL).unwrap();
                window
                    .emit_to(WINDOW_LABEL, "get_voices_list_response", voices)
                    .expect("Failed to emit event");
            });
            app.listen_any("refresh_voices_list", move |_| {
                save_voices_list();
                let voices = get_voices_list_names();
                let window = refresh_hvoices_handle
                    .get_webview_window(WINDOW_LABEL)
                    .unwrap();
                window
                    .emit_to(WINDOW_LABEL, "get_voices_list_response", voices)
                    .expect("Failed to emit event");
            });
            app.listen_any("create_audio_from_text", move |event| {
                let value = event.payload();
                match serde_json::from_str::<AudioText>(value) {
                    Ok(audio_payload) => {
                        let text = audio_payload.text;
                        let name = audio_payload.name;
                        let voice = audio_payload.voice;

                        generate_tts_synthesis(text.as_str(), name.as_str(), voice.as_str())
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
            app.listen_any("create_audio_from_file", move |event| {
                let value = event.payload();
                match serde_json::from_str::<AudioFile>(value) {
                    Ok(audio_payload) => {
                        let file = audio_payload.file;
                        let name = audio_payload.name;
                        let voice = audio_payload.voice;

                        let text = std::fs::read_to_string(file).unwrap();
                        generate_tts_synthesis(text.as_str(), name.as_str(), voice.as_str())
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
            app.listen_any("open_export_folder", move |_| {
                open_in_export_folder().unwrap();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
