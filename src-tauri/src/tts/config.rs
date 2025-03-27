use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;

use crate::tts::constants::CONFIG_FOLDER_NAME;

const TTS_CONFIG_FILENAME: &str = "tts_config.json";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TtsConfig {
    pub use_file: bool,
    pub play_mode: bool,
    pub play_mode_text: String,
    pub last_voice: String,
    pub pitch: f32,
    pub rate: f32,
    pub volume: f32,
    pub api_port: u16,
}

impl Default for TtsConfig {
    fn default() -> Self {
        Self {
            use_file: false,
            play_mode: true,
            play_mode_text: String::new(),
            last_voice: "en-US-AndrewMultilingualNeural".to_string(),
            pitch: 1.0,
            rate: 1.0,
            volume: 1.0,
            api_port: 7891,
        }
    }
}

pub fn get_config_path() -> PathBuf {
    let mut path = PathBuf::from(CONFIG_FOLDER_NAME);
    path.push(TTS_CONFIG_FILENAME);
    path
}

pub fn load_config() -> TtsConfig {
    let path = get_config_path();

    if !path.exists() {
        let config = TtsConfig::default();
        save_config(&config).unwrap_or_else(|e| eprintln!("Failed to save default config: {}", e));
        return config;
    }

    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(e) => {
            eprintln!("Failed to open config file: {}", e);
            return TtsConfig::default();
        }
    };

    let mut contents = String::new();
    if let Err(e) = file.read_to_string(&mut contents) {
        eprintln!("Failed to read config file: {}", e);
        return TtsConfig::default();
    }

    match serde_json::from_str(&contents) {
        Ok(config) => config,
        Err(e) => {
            eprintln!("Failed to parse config file: {}", e);
            TtsConfig::default()
        }
    }
}

pub fn save_config(config: &TtsConfig) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let path = get_config_path();

    // Ensure config directory exists
    let parent = path.parent().unwrap();
    fs::create_dir_all(parent)?;

    let json = serde_json::to_string_pretty(config)?;
    let mut file = File::create(path)?;
    file.write_all(json.as_bytes())?;

    Ok(())
}

pub fn update_use_file(use_file: bool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut config = load_config();
    config.use_file = use_file;
    save_config(&config)
}

pub fn update_play_mode(play_mode: bool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut config = load_config();
    config.play_mode = play_mode;
    save_config(&config)
}

pub fn update_play_mode_text(
    text: &str,
    skip_delete: bool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut config = load_config();
    config.play_mode_text = text.to_string();

    // If text changes, delete the play mode audio file to force regeneration
    // But skip this if explicitly requested (for API calls that will generate immediately after)
    if config.play_mode && !skip_delete {
        let _ = crate::tts::tts::delete_play_mode_audio();
    }

    save_config(&config)
}

pub fn update_last_voice(voice: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut config = load_config();
    config.last_voice = voice.to_string();

    // If voice changes, delete the play mode audio file to force regeneration
    if config.play_mode {
        let _ = crate::tts::tts::delete_play_mode_audio();
    }

    save_config(&config)
}

pub fn update_pitch(pitch: f32) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut config = load_config();
    config.pitch = pitch;

    // If pitch changes, delete the play mode audio file to force regeneration
    if config.play_mode {
        let _ = crate::tts::tts::delete_play_mode_audio();
    }

    save_config(&config)
}

pub fn update_rate(rate: f32) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut config = load_config();
    config.rate = rate;

    // If rate changes, delete the play mode audio file to force regeneration
    if config.play_mode {
        let _ = crate::tts::tts::delete_play_mode_audio();
    }

    save_config(&config)
}

pub fn update_volume(volume: f32) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut config = load_config();
    config.volume = volume;

    // If volume changes, delete the play mode audio file to force regeneration
    if config.play_mode {
        let _ = crate::tts::tts::delete_play_mode_audio();
    }

    save_config(&config)
}

pub fn update_api_port(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut config = load_config();
    config.api_port = port;
    save_config(&config)
}
