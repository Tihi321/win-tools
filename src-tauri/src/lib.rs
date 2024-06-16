mod disk;
mod tts;
mod utils;
use tauri::{ipc::InvokeBody, Manager};
use tts::tts::generate_tts_synthesis;
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
                "create_audio" => {
                    if let InvokeBody::Json(json_value) = payload {
                        let text = json_value.get("text").and_then(|v| v.as_str());
                        let name = json_value.get("name").and_then(|v| v.as_str());

                        match (text, name) {
                            (Some(text), Some(name)) => {
                                println!("Text: {}, Name: {}", text, name);
                                generate_tts_synthesis(text, name);
                                // Here you can add the logic to create audio with these parameters
                            }
                            _ => println!("Missing or invalid parameters"),
                        }

                        println!("window_label {}", window_label);

                        let _ = app_handle_instance.emit_to(window_label, "create_audio", true);
                    }
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
