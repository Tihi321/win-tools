use std::{env, path::PathBuf};

use tauri::{App, WebviewUrl, WebviewWindow};

fn is_cache_development_env() -> bool {
    match env::var("CACHE_MODE") {
        Ok(env) => env == "development",
        Err(_) => false,
    }
}

fn get_cache_directory() -> PathBuf {
    let current_directory = env::current_dir().expect("Failed to get current directory");

    if is_cache_development_env() {
        // go 3 folders up form currect directory
        let mut parent_directory = current_directory.clone();
        parent_directory.pop();
        parent_directory
    } else {
        current_directory
    }
}

pub fn create_window(app: &App) -> Result<WebviewWindow, tauri::Error> {
    let mut data_directory = get_cache_directory();
    data_directory.push("cache");

    tauri::WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Text To Speach".to_string())
        .visible(true)
        .center()
        .data_directory(data_directory)
        .closable(true)
        .resizable(true)
        .decorations(true)
        .inner_size(980.0, 600.0)
        .focused(true)
        .build()
}
