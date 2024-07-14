mod scripts;
mod tts;
mod utils;

use scripts::{
    disk::{add_script, get_script_names, get_script_path, remove_script},
    structs::{Script, ScriptWindow},
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
    structs::{AudioFile, AudioText},
};

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
            let update_window_title = app_handle.clone();
            let get_scripts = app_handle.clone();
            let add_script_file = app_handle.clone();
            let remove_script_file = app_handle.clone();

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
            app.listen("get_script", move |_| {
                let scripts = get_script_names().expect("Failed to get scripts");
                get_scripts
                    .get_webview_window(WINDOW_LABEL)
                    .unwrap()
                    .emit_to(WINDOW_LABEL, "scripts", scripts)
                    .expect("Failed to emit event");
            });
            app.listen("add_script", move |event| {
                let payload = event.payload().to_string();
                let file_path = payload.trim_start_matches('"').trim_end_matches('"');
                add_script(file_path.to_string()).unwrap();
                let scripts = get_script_names().expect("Failed to get scripts");
                // Use the app_handle to get the window by its label
                add_script_file
                    .get_webview_window(WINDOW_LABEL)
                    .unwrap()
                    .emit_to(WINDOW_LABEL, "scripts", scripts)
                    .expect("Failed to emit event");
            });
            app.listen("remove_script", move |event| {
                let payload = event.payload().to_string();
                let name = payload.trim_start_matches('"').trim_end_matches('"');
                remove_script(name).unwrap();
                let scripts = get_script_names().expect("Failed to get scripts");
                // Use the app_handle to get the window by its label
                remove_script_file
                    .get_webview_window(WINDOW_LABEL)
                    .unwrap()
                    .emit_to(WINDOW_LABEL, "scripts", scripts)
                    .expect("Failed to emit event");
            });
            app.listen("start_script", move |event| {
                let value = event.payload();
                match serde_json::from_str::<ScriptWindow>(value) {
                    Ok(window_script) => {
                        start_script(&Script {
                            name: window_script.name.clone(),
                            visibility: window_script.visibility,
                            arguments: window_script.arguments,
                            path: get_script_path(window_script.name.as_str()).unwrap(),
                        })
                        .unwrap();
                    }
                    Err(e) => eprintln!("Failed to parse event payload: {}", e),
                }
            });
            app.listen("stop_script", move |event| {
                let payload = event.payload().to_string();
                let name = payload.trim_start_matches('"').trim_end_matches('"');
                stop_script(name).unwrap();
            });

            app.listen("create_audio_from_file", move |event| {
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
            app.listen("open_export_folder", move |_| {
                open_in_export_folder().unwrap();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
