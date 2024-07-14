use std::env;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use super::constants::SCRIPTS_FOLDER;

pub fn get_scripts_folder_path() -> PathBuf {
    let current_dir = env::current_dir().expect("Failed to get current directory");
    let quizes_folder_path = current_dir.join(SCRIPTS_FOLDER);

    if !quizes_folder_path.exists() {
        fs::create_dir_all(&quizes_folder_path).unwrap();
        println!("Folder 'scripts' created successfully.");
    }

    return quizes_folder_path;
}

pub fn add_script(script_path: String) -> io::Result<()> {
    let scripts_folder = get_scripts_folder_path();
    let file_path = scripts_folder.join(Path::new(&script_path).file_name().unwrap());

    // Check if the quiz file already exists
    if file_path.exists() {
        return Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "Script already exists.",
        ));
    }

    // Copy the file to the server folder
    fs::copy(&script_path, &file_path)?;

    Ok(())
}

pub fn remove_script(script_name: &str) -> Result<(), std::io::Error> {
    let scripts_folder = get_scripts_folder_path();
    let file_path = scripts_folder.join(format!("{}.bat", script_name));

    // Check if the file exists and remove it
    if file_path.exists() {
        fs::remove_file(file_path)?;
        println!("Script {} removed successfully.", script_name);
    } else {
        println!("Script {} does not exist.", script_name);
    }

    Ok(())
}

pub fn get_script_path(name: &str) -> Result<String, io::Error> {
    let path = get_scripts_folder_path();

    // Read the directory
    let entries = fs::read_dir(path)?;

    // Find the script with the given name
    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        // Skip if not a file
        if path.is_file() {
            // Extract file name
            let file_name = entry
                .file_name()
                .into_string()
                .unwrap_or_default()
                .trim_end_matches(".bat")
                .to_string();

            // Check if the file name matches the given name
            if file_name == name {
                return Ok(path.to_str().unwrap().to_string());
            }
        }
    }

    Err(io::Error::new(io::ErrorKind::NotFound, "Script not found."))
}

pub fn get_script_names() -> Result<Vec<String>, io::Error> {
    let path = get_scripts_folder_path();
    let mut scripts = Vec::new();

    // Read the directory
    let entries = fs::read_dir(path)?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        // Skip if not a file
        if path.is_file() {
            // Extract file name
            let file_name = entry
                .file_name()
                .into_string()
                .unwrap_or_default()
                .trim_end_matches(".bat")
                .to_string();

            // Add (file_name, content) tuple to the vector
            scripts.push(file_name);
        }
    }

    Ok(scripts)
}
