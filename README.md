# Win Tools

Swiss knife of small usefull apps like script runner, tts audio creator

<div align="center">
   <img alt="App" src="./assets/app.png" width="620" />
</div>

## Tools

### Script Runner

Make and exe or bat file easy to use, with this custom ui

### TTS Audio Creator: Make Any Text Speak

Experience the ultimate convenience with TTS Audio Creator, the must-have program for converting text or text files into speech audio in your desired language. Designed with user-friendliness and efficiency in mind, TTS Audio Creator simplifies the process of generating high-quality audio from written content.

#### API Server

The TTS Audio Creator includes an optional API server that allows you to send text-to-speech requests programmatically. By default, the API server is not started to minimize resource usage.

##### Development Mode

For development, you can use environment variables:

```bash
# Using npm scripts (recommended)
yarn start:api

# Or manually with environment variables
ENABLE_API=true yarn tauri dev
```

##### Production Mode

For production, use command line arguments:

```bash
# Build the application
yarn tauri build

# Run with API server enabled
./path/to/win-tools.exe --api
```

When the API server is running, you can send POST requests to `http://127.0.0.1:<port>/tts` with JSON payload containing a `text` field to generate and play audio.

#### Background Mode

If you only need the API server functionality without the UI, you can run the application in background mode.

##### Development Mode

For development, use the provided npm script:

```bash
# Background mode only
yarn start-background

# Background mode with API server
yarn start:background:api
```

##### Production Mode

For production, use command line arguments:

```bash
# Run in background mode (also enables API server)
./path/to/win-tools.exe --background
```

Background mode automatically enables the API server and runs without showing any UI windows, making it perfect for server environments or when you want to minimize resource usage. This mode works on all platforms (Windows, macOS, and Linux) and is ideal for running the app as a service or in unattended environments.

### API Tester

API Tester is a tool that allows you to test the API endpoints of your server. It's a great way to learn how to use an API and also to find out what kind of data it returns.

### Log monitor

Log monitor is a tool that allows you to view the log of your application. It's a great way to find out what's happening in your app and how it behaves.

### Start

```bash
cargo run ./main.rs
```

```bash
yarn start
```

## Isntall Rust

./scripts/rustup-init.exe -y
./scripts/update_version.bat

### Rust Update

```bash
cd ./src-tauri
cargo update
```

#### Default export

```bash
tauri build
```
