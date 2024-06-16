use std::fs::File;
use std::io::Write;
use std::path::PathBuf;

use super::constants::VOICE;
use msedge_tts::{
    tts::{
        client::{connect, SynthesizedAudio},
        stream::SynthesizedResponse,
        SpeechConfig,
    },
    voice::{get_voices_list, Voice},
};

fn get_voice(name: &str) -> Result<Voice, Box<dyn std::error::Error>> {
    let voices = get_voices_list()?;
    let voice = voices
        .into_iter()
        .find(|voice| voice.short_name.as_deref() == Some(name))
        .ok_or_else(|| "Voice not found")?;
    Ok(voice)
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

pub fn generate_tts_synthesis(text: &str, name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let audio_stream = get_audio_stream(text, VOICE)?;

    // Save the audio bytes to a file
    let mut path = PathBuf::from("export");
    std::fs::create_dir_all(&path)?; // This line creates the "export" directory if it does not exist
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
