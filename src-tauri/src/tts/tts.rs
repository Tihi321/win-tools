use std::fs;
use std::fs::File;
use std::io::{BufRead, Write};
use std::path::Path;
use std::path::PathBuf;
use std::thread;
// Replace rusty_audio with rodio
use rodio::{Decoder, OutputStream, Sink};
use std::io::BufReader;

use msedge_tts::{
    tts::{
        client::{connect, SynthesizedAudio},
        SpeechConfig,
    },
    voice::{get_voices_list, Voice},
};

use crate::tts::constants::{CONFIG_FOLDER_NAME, EXPORT_FOLDER_NAME, VOICES_FILE_NAME};

// Global state for audio playback
static mut AUDIO_PLAYING: bool = false;
static mut CURRENT_AUDIO_FILE: Option<String> = None;
// For persistent audio playback
static mut PLAYBACK_THREAD: Option<std::thread::JoinHandle<()>> = None;
// Control channel for stopping audio
static mut STOP_REQUESTED: bool = false;

fn get_voice(name: &str) -> Result<Voice, Box<dyn std::error::Error>> {
    let voices = get_voices_list().unwrap();
    let voice = voices
        .into_iter()
        .find(|voice| voice.short_name.as_deref() == Some(name))
        .ok_or_else(|| "Voice not found")?;
    Ok(voice)
}

pub fn fetch_voices_list() -> Vec<(String, String)> {
    let voices_list = get_voices_list().unwrap();
    // map and return short_name and locale
    let voices = voices_list
        .into_iter()
        .map(|voice| (voice.short_name.unwrap(), voice.locale.unwrap()))
        .collect::<Vec<(String, String)>>();

    voices
}

pub fn save_voices_list() {
    let voices = fetch_voices_list();
    // save to file
    let mut path = PathBuf::from(CONFIG_FOLDER_NAME);
    std::fs::create_dir_all(&path).unwrap(); // This line creates the "config" directory if it does not exist
    path.push(VOICES_FILE_NAME);
    let mut file = File::create(path).unwrap();
    for (name, locale) in &voices {
        file.write_all(format!("{} {}\n", name, locale).as_bytes())
            .unwrap();
    }
}

pub fn get_voices_list_names() -> Vec<(String, String)> {
    // check if file exists, if not fetch and save
    let mut path = PathBuf::from(CONFIG_FOLDER_NAME);
    path.push(VOICES_FILE_NAME);
    if !path.exists() {
        return vec![];
    }
    // now read from file
    let file = File::open(path).unwrap();
    let reader = std::io::BufReader::new(file);
    let voices = reader
        .lines()
        .map(|line| {
            let line = line.unwrap();
            let mut parts = line.split_whitespace();
            let name = parts.next().unwrap().to_string();
            let locale = parts.next().unwrap().to_string();
            (name, locale)
        })
        .collect::<Vec<(String, String)>>();
    return voices;
}

fn get_audio_stream(
    text: &str,
    name: &str,
    pitch: f32,
    rate: f32,
    volume: f32,
) -> Result<SynthesizedAudio, Box<dyn std::error::Error>> {
    // Scale pitch and rate to the range expected by the API
    let pitch_scaled = (pitch * 50.0) as i32 - 50; // Map 0.0-2.0 to -50 to 50
    let rate_scaled = (rate * 100.0) as i32 - 100; // Map 0.0-2.0 to -100 to 100
    let volume_scaled = (volume * 100.0) as i32; // Map 0.0-1.0 to 0 to 100

    let voice = get_voice(name)?;
    let mut tts = connect()?;
    let mut config = SpeechConfig::from(&voice);
    config.pitch = pitch_scaled;
    config.rate = rate_scaled;
    config.volume = volume_scaled;
    let audio_stream = tts.synthesize(text, &config)?;
    Ok(audio_stream)
}

pub fn generate_tts_synthesis(
    text: &str,
    name: &str,
    voice: &str,
    pitch: f32,
    rate: f32,
    volume: f32,
) -> Result<(), Box<dyn std::error::Error>> {
    let audio_stream = get_audio_stream(text, voice, pitch, rate, volume)?;

    // Save the audio bytes to a file
    let mut path = PathBuf::from(EXPORT_FOLDER_NAME);
    std::fs::create_dir_all(&path).unwrap(); // This line creates the "export" directory if it does not exist
    path.push(format!("{}.mp3", name));
    let mut file = File::create(path)?;
    file.write_all(&audio_stream.audio_bytes)?;
    println!("Audio saved to disk.");

    // Optionally, handle audio metadata if needed
    for metadata in audio_stream.audio_metadata {
        println!("Audio metadata: {:?}", metadata);
    }

    Ok(())
}

pub fn get_audio_file_path(name: &str) -> PathBuf {
    let mut path = PathBuf::new();
    path.push(EXPORT_FOLDER_NAME);
    path.push(format!("{}.mp3", name));
    path
}

pub fn check_audio_file_exists(name: &str) -> bool {
    let path = get_audio_file_path(name);
    path.exists()
}

// Play audio file
pub fn play_audio_backend(file_path: &str) -> Result<(), String> {
    println!("🔊 Attempting to play audio file: {}", file_path);

    // Check if file exists
    if !Path::new(file_path).exists() {
        return Err(format!("Audio file does not exist: {}", file_path));
    }

    println!("📁 Audio file exists");

    // Print file details for debugging
    match fs::metadata(file_path) {
        Ok(metadata) => {
            println!("📊 File size: {} bytes", metadata.len());
            if metadata.len() == 0 {
                println!("⚠️ Warning: File is empty!");
            }
        }
        Err(e) => println!("⚠️ Failed to get file metadata: {}", e),
    }

    // Stop any currently playing audio
    let _ = stop_audio();

    // Get the file path as a string
    let file_path_string = file_path.to_string();

    // Extract filename for state tracking
    let file_name = Path::new(file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown")
        .to_string();

    println!("🔑 Using audio key: {}", file_name);
    println!("🔍 File path: {}", file_path_string);

    // Reset stop flag
    unsafe {
        STOP_REQUESTED = false;
    }

    // Update state
    unsafe {
        AUDIO_PLAYING = true;
        CURRENT_AUDIO_FILE = Some(file_name.clone());
    }

    // Spawn a thread to handle audio playback
    // This is necessary because we need to keep the rodio objects alive
    let file_name_clone = file_name.clone();
    let thread_handle = thread::spawn(move || {
        println!("🧵 Starting audio playback thread");

        // Initialize rodio output stream
        let audio_result = || -> Result<(), String> {
            // Get a output stream handle to the default physical sound device
            let (stream, stream_handle) = OutputStream::try_default()
                .map_err(|e| format!("Failed to get default output device: {}", e))?;

            // Create a sink to manage the sound
            let sink = Sink::try_new(&stream_handle)
                .map_err(|e| format!("Failed to create audio sink: {}", e))?;

            // Load the audio file
            let file = BufReader::new(
                File::open(&file_path_string)
                    .map_err(|e| format!("Failed to open audio file: {}", e))?,
            );

            // Decode the file
            let source =
                Decoder::new(file).map_err(|e| format!("Failed to decode audio file: {}", e))?;

            // Add the source to the sink
            sink.append(source);
            println!("▶️ Started audio playback");
            println!("✅ Emitted audio_playback_status event with playing status");

            // Check for stop request in a loop with a small delay
            while !sink.empty() && !unsafe { STOP_REQUESTED } {
                // Short sleep to prevent CPU hogging
                std::thread::sleep(std::time::Duration::from_millis(100));

                // If stop was requested, stop the sink and break
                if unsafe { STOP_REQUESTED } {
                    println!("🛑 Stop requested, stopping sink");
                    sink.stop();
                    break;
                }
            }

            // Wait for playback to complete if not stopped
            if !unsafe { STOP_REQUESTED } {
                // Wait until the sink is empty
                while !sink.empty() {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            }

            // Keep the stream and sink alive until playback is done
            drop(sink);
            drop(stream);

            Ok(())
        }();

        // Check if playback was successful
        if let Err(e) = audio_result {
            println!("❌ Error during audio playback: {}", e);
        }

        // Update state after playback is done
        unsafe {
            if CURRENT_AUDIO_FILE
                .as_ref()
                .map_or(false, |f| f == &file_name_clone)
            {
                AUDIO_PLAYING = false;
                CURRENT_AUDIO_FILE = None;
                println!("🔇 Audio playback completed");
            }

            // Reset stop flag
            STOP_REQUESTED = false;
        }

        println!("🧵 Audio thread finished");
    });

    // Store the thread handle
    unsafe {
        if let Some(handle) = PLAYBACK_THREAD.take() {
            let _ = handle.join(); // Wait for old thread to finish
        }
        PLAYBACK_THREAD = Some(thread_handle);
    }

    println!("✅ Audio playback initiated");
    Ok(())
}

// Stop audio playback
pub fn stop_audio() -> Result<(), String> {
    println!("Stopping audio playback");

    unsafe {
        // Set the stop flag to signal the playback thread to stop
        STOP_REQUESTED = true;

        // Update state flags
        AUDIO_PLAYING = false;
        CURRENT_AUDIO_FILE = None;

        // Don't join the thread here as it needs to handle the stop request
        // It will exit on its own after processing the stop
    }

    Ok(())
}

// Check if audio is currently playing
pub fn is_audio_playing() -> bool {
    unsafe { AUDIO_PLAYING }
}

// Get the current playing file
pub fn get_current_playing_file() -> Option<String> {
    unsafe { CURRENT_AUDIO_FILE.clone() }
}

pub fn delete_play_mode_audio() -> Result<(), Box<dyn std::error::Error>> {
    let path = get_audio_file_path(crate::tts::constants::PLAY_MODE_AUDIO_FILE);
    if path.exists() {
        println!("🗑️ Deleting play mode audio file: {}", path.display());
        std::fs::remove_file(path)?;
        println!("✅ Deleted play mode audio file");
    }
    Ok(())
}
