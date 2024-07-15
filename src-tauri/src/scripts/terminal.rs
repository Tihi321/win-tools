use std::io;
use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;
use winapi::um::wincon::GetConsoleWindow;
use winapi::um::winuser::{ShowWindow, UpdateWindow, SW_HIDE};

use super::structs::Script;

fn execute_hidden_command(command: &str) -> io::Result<bool> {
    // Create a new command to execute the PowerShell script
    let mut cmd = Command::new("powershell.exe");

    // Set the arguments for the PowerShell script
    cmd.arg("-NoProfile").arg("-Command");

    println!("Service Command - {}", command);
    cmd.arg(&command);

    // Enable the `DETACHED_PROCESS` flag to hide the terminal window
    cmd.creation_flags(winapi::um::winbase::CREATE_NO_WINDOW);

    // Execute the command and capture the output
    let output = cmd.output()?;

    // Hide the console window
    unsafe {
        let window_handle = GetConsoleWindow();
        ShowWindow(window_handle, SW_HIDE);
        UpdateWindow(window_handle);
    }

    let stdout_str = String::from_utf8(output.stdout).unwrap();
    println!("Service Output - {}", stdout_str);

    Ok(true)
}

pub fn start_script(script: &Script) -> io::Result<bool> {
    // Construct the PowerShell command to start the service
    let path = Path::new(&script.path);
    let parent_folder = path
        .parent()
        .unwrap_or_else(|| Path::new("No parent directory found"));

    let mut start_script_command = format!(
        "Start-Process -FilePath '{0}' -WindowStyle {1} -WorkingDirectory \"{2}\"",
        &script.path,
        &script.visibility,
        parent_folder.display(),
    );

    if &script.arguments != "" {
        start_script_command = format!(
            "{0} -ArgumentList \"{1}\"",
            &start_script_command, &script.arguments,
        );
    }

    let _ = execute_hidden_command(&start_script_command);

    Ok(true)
}

pub fn stop_script(name: &str) -> io::Result<bool> {
    let stop_service_command = format!("taskkill /IM {0} /F", name);

    let _ = execute_hidden_command(&stop_service_command);

    Ok(true)
}
