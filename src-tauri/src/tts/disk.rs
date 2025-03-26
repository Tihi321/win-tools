use std::path::Path;
use std::process::Command;

use crate::tts::constants::EXPORT_FOLDER_NAME;

pub fn open_in_export_folder() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // open the export folder from current directory
    let export_folder = Path::new(EXPORT_FOLDER_NAME);

    // Use the system's default command to open the folder in the file explorer
    let command = if cfg!(target_os = "windows") {
        "explorer"
    } else if cfg!(target_os = "macos") {
        "open"
    } else {
        "xdg-open"
    };

    Command::new(command)
        .arg(export_folder.to_str().unwrap())
        .status()?;

    Ok(())
}
