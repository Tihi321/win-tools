use std::env;
use std::fs;
use std::fs::File;
use std::io;
use std::io::Read;
use std::path::{Path, PathBuf};

use crate::scripts::structs::ScriptSave;
use crate::scripts::structs::ScriptSaveLocal;

use super::constants::{SCRIPTS_DB, SCRIPTS_FOLDER, SCRIPT_FILES_FOLDER};
use super::structs::ArgumentType;

pub fn get_scripts_folder_path() -> PathBuf {
    let current_dir = env::current_dir().expect("Failed to get current directory");
    let folder_path = current_dir.join(SCRIPTS_FOLDER);

    if !folder_path.exists() {
        fs::create_dir_all(&folder_path).unwrap();
        println!("Folder scripts created successfully.");
    }

    return folder_path;
}

pub fn get_script_files_folder_path() -> PathBuf {
    let scripts_folder = get_scripts_folder_path();
    let file_folder_path = scripts_folder.join(SCRIPT_FILES_FOLDER);

    if !file_folder_path.exists() {
        fs::create_dir_all(&file_folder_path).unwrap();
        println!("Folder files created successfully.");
    }

    return file_folder_path;
}

pub fn get_scripts_db_path() -> PathBuf {
    let scripts_folder = get_scripts_folder_path();
    let db_file_path = scripts_folder.join(format!("{0}.json", &SCRIPTS_DB));

    if !db_file_path.exists() {
        // Serialize an empty array instead of an empty object
        let data = serde_json::to_string_pretty(&Vec::<ScriptSave>::new()).unwrap();
        fs::write(db_file_path.clone(), data).unwrap();
        println!("Script database created successfully.");
    }
    return db_file_path;
}

pub fn get_new_script_path(script_path: String) -> PathBuf {
    let scripts_files_folder = get_script_files_folder_path();
    scripts_files_folder.join(Path::new(&script_path).file_name().unwrap())
}

pub fn add_script_to_disk(script_path: String) {
    let new_path = get_new_script_path(script_path.clone());

    if new_path.exists() {
        println!("Script already exists.");
        return;
    }

    fs::copy(&script_path, &new_path).unwrap();
    println!("Script saved successfully.");
}

pub fn save_script(
    script_path: String,
    name: String,
    script_args: Vec<ArgumentType>,
    save_to_disk: bool,
) -> io::Result<()> {
    let file_path = if save_to_disk {
        add_script_to_disk(script_path.clone());
        get_new_script_path(script_path.clone())
    } else {
        Path::new(&script_path).to_path_buf()
    };

    let db_file_path = get_scripts_db_path();

    // json api looks like this:
    // Clone `db_file_path` before it's moved so we can use it again
    let db_file = fs::File::open(db_file_path.clone()).unwrap();
    let mut scripts: Vec<ScriptSave> = serde_json::from_reader(db_file).unwrap();

    // Check if the script already exists
    if scripts.iter().any(|script| script.name == name) {
        return Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "Script already exists.",
        ));
    }

    // Add the new script to the list
    scripts.push(ScriptSave {
        name,
        script_args,
        path: file_path.to_str().unwrap().to_string(),
    });

    // Write the updated list to the file in a pretty format
    let data = serde_json::to_string_pretty(&scripts).unwrap();
    fs::write(&db_file_path, data.as_bytes()).unwrap();

    Ok(())
}

pub fn remove_script(script_path: &str) -> Result<(), std::io::Error> {
    let current_folder = get_scripts_folder_path();
    let is_local = is_path_local(&script_path.to_string(), &current_folder);

    if is_local {
        let file_path = Path::new(&script_path);
        // Check if the script file exists and remove it
        if file_path.exists() {
            fs::remove_file(&file_path).unwrap();
            println!("Script {} removed successfully.", script_path);
        } else {
            println!("Script {} does not exist.", script_path);
        }
    }

    let db_file_path = get_scripts_db_path();

    // Load scripts from the database
    let mut file = File::open(&db_file_path).unwrap();
    let mut data = String::new();
    file.read_to_string(&mut data).unwrap();
    let mut scripts: Vec<ScriptSave> = serde_json::from_str(&data).unwrap();

    let scrip_name = file_stem(script_path.to_string()).unwrap();

    // Remove the script with the matching name
    scripts.retain(|script| file_stem(script.path.to_string()).unwrap() != scrip_name);

    // Write the updated scripts back to the database
    let data = serde_json::to_string_pretty(&scripts).unwrap();

    fs::write(db_file_path, data).unwrap();

    Ok(())
}

pub fn get_scripts_db() -> Result<String, io::Error> {
    let db_file_path = get_scripts_db_path();
    let file = File::open(db_file_path).unwrap();
    let scripts: Vec<ScriptSave> = serde_json::from_reader(file).unwrap();

    let current_folder = get_scripts_folder_path();

    // map over scripts and add local value to each script

    let scripts_local = scripts
        .into_iter()
        .map(|script| {
            let is_local = is_path_local(&script.path, &current_folder);
            ScriptSaveLocal {
                name: script.name,
                script_args: script.script_args,
                path: script.path,
                local: is_local,
            }
        })
        .collect::<Vec<ScriptSaveLocal>>();

    let output = serde_json::to_string(&scripts_local).expect("Failed to serialize shortcuts");

    Ok(output)
}

// Helper function to determine if the script path is local to the current folder
fn is_path_local(script_path: &str, current_folder: &PathBuf) -> bool {
    let script_path = Path::new(script_path);
    // Check if script_path is a descendant of current_folder
    script_path.starts_with(current_folder)
}

pub fn file_stem(file_path: String) -> Result<String, io::Error> {
    let path = Path::new(&file_path);
    let name = path
        .file_stem()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "File name not found"))?
        .to_string_lossy()
        .into_owned();

    Ok(name)
}
