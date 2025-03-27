#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Parse command line arguments
    let args: Vec<String> = std::env::args().collect();
    // Pass them to the run function
    tts_lib::run(args);
}
