use std::io::Write;
use std::path::PathBuf;
use std::{fs::File, io::BufRead};

use msedge_tts::{
    tts::{
        client::{connect, SynthesizedAudio},
        SpeechConfig,
    },
    voice::{get_voices_list, Voice},
};

use crate::tts::constants::{CONFIG_FOLDER_NAME, EXPORT_FOLDER_NAME, VOICES_FILE_NAME};

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
) -> Result<SynthesizedAudio, Box<dyn std::error::Error>> {
    let voice = get_voice(name)?;
    let mut tts = connect()?;
    let config = SpeechConfig::from(&voice);
    let audio_stream = tts.synthesize(text, &config)?;
    Ok(audio_stream)
}

pub fn generate_tts_synthesis(
    text: &str,
    name: &str,
    voice: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let audio_stream = get_audio_stream(text, voice)?;

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
