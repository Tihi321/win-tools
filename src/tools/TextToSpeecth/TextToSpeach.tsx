import { createEffect, createSignal, createMemo, onMount, onCleanup } from "solid-js";
import { listen, emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { get, map, filter, includes, isEmpty } from "lodash";
import { Button } from "../../components/inputs/Button";
import { VOICES_LIST } from "../../constants";
import { FolderIcon } from "../../components/icons/FolderIcon";
import {
  TextField,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
} from "@suid/material";
import { FilePathButton } from "../../components/inputs/FilePathButton";
import {
  CreateButton,
  FileContainer,
  Footer,
  Main,
  Container,
  SelectContainer,
  TextareaContainer,
  TextFieldContainer,
  Loader,
  PlayButtonsContainer,
} from "./Styles";
import { RangeInput } from "../../components/inputs/RangeInput";

type VoicesList = Array<{ name: string; lang: string }>;

interface TtsConfig {
  use_file: boolean;
  play_mode: boolean;
  play_mode_text: string;
  last_voice: string;
  pitch: number;
  rate: number;
  volume: number;
  api_port: number;
}

type AudioStatus = "playing" | "stopped" | "ready";

interface AudioPlaybackStatus {
  status: AudioStatus;
  file: string;
}

interface ApiServerStatus {
  running: boolean;
  port: number;
}

export const TextToSpeach = () => {
  const [voices, setVoices] = createSignal<VoicesList>([]);
  const [selectedVoice, setSelectedVoice] = createSignal("");
  const [useFile, setUseFile] = createSignal(false);
  const [voiceGenerating, setVoiceGenerating] = createSignal(false);
  const [file, setFile] = createSignal("");
  const [text, setText] = createSignal("");
  const [lastText, setLastText] = createSignal("");
  const [name, setName] = createSignal("");
  const [pitch, setPitch] = createSignal(1);
  const [rate, setRate] = createSignal(1);
  const [volume, setVolume] = createSignal(1);
  const [playMode, setPlayMode] = createSignal(true);
  // These signals are used by side effects and event handlers
  // @ts-ignore - Used in checkAudioExists function
  const [audioExists, setAudioExists] = createSignal(false);
  const [audioStatus, setAudioStatus] = createSignal<AudioStatus>("stopped");
  // @ts-ignore - Used by audio playback status event listeners
  const [currentPlayingFile, setCurrentPlayingFile] = createSignal("");
  // Add API port signal
  const [apiPort, setApiPort] = createSignal(7891);
  // Add API server status
  const [apiServerRunning, setApiServerRunning] = createSignal(false);
  // Update server information to use the port from state
  const serverInfo = createMemo(() => ({
    url: `http://127.0.0.1:${apiPort()}`,
    tts_endpoint: "/tts",
    stop_endpoint: "/stop",
  }));

  // Add notification state but without using Snackbar/Alert
  const [notificationMessage, setNotificationMessage] = createSignal("");

  const shortVoices = createMemo(() =>
    filter(voices(), (voice) => includes(VOICES_LIST, voice.lang))
  );

  const loadConfig = async () => {
    try {
      const config = await invoke<TtsConfig>("get_tts_config");
      setUseFile(config.use_file);
      setPlayMode(config.play_mode);
      setSelectedVoice(config.last_voice);
      setPitch(config.pitch);
      setRate(config.rate);
      setVolume(config.volume);
      setApiPort(config.api_port);

      if (config.play_mode && config.play_mode_text) {
        setText(config.play_mode_text);
        setLastText(config.play_mode_text);
      }
    } catch (error) {
      console.error("Failed to load TTS config:", error);
    }
  };

  onMount(() => {
    emit("update_title", "Text to Speech");
    emit("get_voices_list", {});

    // Load config from backend JSON file
    loadConfig();

    // Check if audio exists initially
    checkAudioExists();

    // Get initial audio playback status
    getAudioPlaybackStatus();

    // Check API server status
    checkApiServerStatus();
  });

  // Listen for audio playback status updates from the backend
  createEffect(async () => {
    const unlisten = await listen<AudioPlaybackStatus>("audio_playback_status", (event) => {
      if (event.payload) {
        setAudioStatus(event.payload.status);
        setCurrentPlayingFile(event.payload.file);
      }
    });

    return () => {
      unlisten();
    };
  });

  // Listen for text updates from the API server
  createEffect(async () => {
    const unlisten = await listen<string>("text_updated_from_api", (event) => {
      if (event.payload) {
        setText(event.payload);
        setLastText(event.payload);
      }
    });

    return () => {
      unlisten();
    };
  });

  // Listen for API server status updates from the backend
  createEffect(async () => {
    console.log("Setting up api_server_status listener");

    try {
      const unlisten = await listen<ApiServerStatus>("api_server_status", (event) => {
        console.log("API server status event received:", event.payload);

        if (event.payload) {
          // Ensure we're storing proper boolean values
          const isRunning = Boolean(event.payload.running);
          console.log("Setting API running state to:", isRunning, typeof isRunning);
          setApiServerRunning(isRunning);
          setApiPort(event.payload.port);

          console.log(
            `API server status updated: running=${isRunning}, port=${event.payload.port}`
          );

          if (isRunning) {
            setNotificationMessage(`API server running on port ${event.payload.port}`);
            setTimeout(() => setNotificationMessage(""), 5000); // Clear after 5 seconds
          }
        }
      });

      // Check API server status on component mount
      try {
        const isRunning = await invoke<boolean>("is_api_server_running");
        console.log("Initial API server status check:", isRunning, typeof isRunning);

        // Ensure we're setting a proper boolean value
        const isRunningBool = Boolean(isRunning);
        console.log("Setting initial API running state to:", isRunningBool, typeof isRunningBool);
        setApiServerRunning(isRunningBool);

        const config = await invoke<TtsConfig>("get_tts_config");
        setApiPort(config.api_port);
      } catch (error) {
        console.error("Failed to check initial API server status:", error);
      }

      return () => {
        console.log("Cleaning up api_server_status listener");
        unlisten();
      };
    } catch (error) {
      console.error("Error setting up api_server_status listener:", error);
      return () => {};
    }
  });

  onCleanup(() => {
    // Stop audio when component unmounts
    if (audioStatus() === "playing") {
      stopAudio();
    }
  });

  const voicesAvailable = createMemo(() => !isEmpty(voices()));

  createEffect(async () => {
    const unlisten = await listen("get_voices_list_response", (event: any) => {
      const voices_list: VoicesList = map(get(event, ["payload"], []), (voice) => ({
        name: get(voice, [0], ""),
        lang: get(voice, [1], ""),
      }));

      setVoices(voices_list);
    });

    return () => unlisten();
  });

  createEffect(async () => {
    const unlisten = await listen("create_audio_response", () => {
      // Save the last text used to create audio
      setLastText(text());

      // In play mode, save the text to backend config
      if (playMode()) {
        savePlayModeText(text());
      }

      // Don't clear text in play mode
      if (!playMode()) {
        setText("");
        setName("");
      }

      setFile("");
      setPitch(1);
      setRate(1);
      setVolume(1);
      setVoiceGenerating(false);
      checkAudioExists();

      // If we're in play mode, play the audio right after creation
      if (playMode()) {
        playAudio();
      }
    });

    return () => unlisten();
  });

  // Listen for generating_audio events from API requests
  createEffect(async () => {
    const unlisten = await listen<boolean>("generating_audio", (event) => {
      if (event.payload !== undefined) {
        setVoiceGenerating(event.payload);
        console.log("Generating audio state updated from API:", event.payload);
      }
    });

    return () => unlisten();
  });

  // Save text to backend when it changes in play mode
  createEffect(() => {
    if (playMode() && text()) {
      savePlayModeText(text());
    }
  });

  // Save voice selection to backend
  createEffect(() => {
    if (selectedVoice()) {
      saveLastVoice(selectedVoice());
    }
  });

  const saveUseFileConfig = async (value: boolean) => {
    try {
      await invoke("set_tts_use_file", { useFile: value });
    } catch (error) {
      console.error("Failed to save use file setting:", error);
    }
  };

  const savePlayModeConfig = async (value: boolean) => {
    try {
      await invoke("set_tts_play_mode", { playMode: value });
    } catch (error) {
      console.error("Failed to save play mode setting:", error);
    }
  };

  const savePlayModeText = async (value: string) => {
    try {
      await invoke("set_tts_play_mode_text", { text: value });
      console.log("Saved text to config:", value);
    } catch (error) {
      console.error("Failed to save play mode text:", error);
    }
  };

  const saveLastVoice = async (value: string) => {
    try {
      await invoke("set_tts_last_voice", { voice: value });
    } catch (error) {
      console.error("Failed to save last voice:", error);
    }
  };

  const savePitch = async (value: number) => {
    try {
      await invoke("set_tts_pitch", { pitch: value });
    } catch (error) {
      console.error("Failed to save pitch setting:", error);
    }
  };

  const saveRate = async (value: number) => {
    try {
      await invoke("set_tts_rate", { rate: value });
    } catch (error) {
      console.error("Failed to save rate setting:", error);
    }
  };

  const saveVolume = async (value: number) => {
    try {
      await invoke("set_tts_volume", { volume: value });
    } catch (error) {
      console.error("Failed to save volume setting:", error);
    }
  };

  const saveApiPort = async (port: number) => {
    try {
      await invoke("set_tts_api_port", { port });
      console.log("API port saved:", port);
      // Show notification when port is changed
      setNotificationMessage(
        "Port updated. Changes will take effect after restarting the application."
      );

      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotificationMessage("");
      }, 5000);
    } catch (error) {
      console.error("Failed to save API port:", error);
      setNotificationMessage("Failed to save port setting.");

      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotificationMessage("");
      }, 5000);
    }
  };

  const createAudio = () => {
    if (useFile()) {
      emit("create_audio_from_file", {
        file: file(),
        name: playMode() ? "output" : name() || "output",
        voice: selectedVoice(),
      });
    } else {
      emit("create_audio_from_text", {
        text: text(),
        name: playMode() ? "output" : name() || "output",
        voice: selectedVoice(),
      });
    }

    setVoiceGenerating(true);
  };

  const playAudio = async () => {
    try {
      const fileName = playMode() ? "output" : name() || "output";
      await invoke("play_audio", { name: fileName });
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const stopAudio = async () => {
    try {
      await invoke("stop_audio_playback");
    } catch (error) {
      console.error("Error stopping audio:", error);
    }
  };

  const getAudioPlaybackStatus = async () => {
    try {
      const status = await invoke<AudioPlaybackStatus>("get_audio_playback_status");
      setAudioStatus(status.status);
      setCurrentPlayingFile(status.file);
    } catch (error) {
      console.error("Error getting audio status:", error);
    }
  };

  const handlePlayOrCreate = async () => {
    // If audio is currently playing, stop it
    if (audioStatus() === "playing") {
      stopAudio();
      return;
    }

    if (playMode()) {
      // In play mode:
      // 1. Check if audio exists
      // 2. If it exists and text is the same, just play it
      // 3. If text is different or file doesn't exist, create new audio
      const exists = await invoke<boolean>("check_audio_exists", { name: "output" });

      if (exists && text() === lastText()) {
        // Audio exists and text hasn't changed, just play it
        playAudio();
      } else {
        // Text changed or audio doesn't exist, create new audio
        createAudio();
      }
    } else {
      // In normal mode, just create audio
      createAudio();
    }
  };

  const checkAudioExists = async () => {
    try {
      const checkName = playMode() ? "output" : name() || "output";
      const exists = await invoke<boolean>("check_audio_exists", { name: checkName });
      setAudioExists(exists);
    } catch (error) {
      console.error("Error checking if audio exists:", error);
      setAudioExists(false);
    }
  };

  const onOpenExportFolder = () => {
    emit("open_export_folder", {});
  };

  const fetchVoices = () => {
    emit("refresh_voices_list", {});
  };

  const togglePlayMode = () => {
    const newPlayModeValue = !playMode();
    setPlayMode(newPlayModeValue);
    savePlayModeConfig(newPlayModeValue);

    // If switching to play mode, check if we have saved text
    if (newPlayModeValue) {
      loadConfig();
    }

    checkAudioExists();
  };

  const toggleUseFile = (event: any) => {
    const checked = !event.target.checked;
    setUseFile(checked);
    saveUseFileConfig(checked);
  };

  // Add function to check API server status
  const checkApiServerStatus = async () => {
    try {
      console.log("Checking detailed API server status...");

      // Use the new detailed API status command
      const apiStatus = await invoke<{ running: boolean; port: number; api_url: string }>(
        "get_api_server_status"
      );
      console.log("Detailed API server status:", apiStatus);

      // Set the state based on the response
      setApiServerRunning(apiStatus.running);
      setApiPort(apiStatus.port);

      // Display a notification with the current status
      const statusMessage = apiStatus.running
        ? `API server is running on port ${apiStatus.port}`
        : "API server is not running";
      setNotificationMessage(statusMessage);
      setTimeout(() => setNotificationMessage(""), 3000);

      return apiStatus.running;
    } catch (error) {
      console.error("Failed to check API server status:", error);
      setNotificationMessage("Error checking API server status");
      setTimeout(() => setNotificationMessage(""), 3000);
      return false;
    }
  };

  return (
    <Container>
      {/* Add a simple notification display */}
      {notificationMessage() && (
        <Box
          sx={{
            position: "fixed",
            top: "16px",
            right: "16px",
            padding: "8px 16px",
            backgroundColor: "#4caf50",
            color: "white",
            borderRadius: "4px",
            zIndex: 9999,
          }}
        >
          {notificationMessage()}
        </Box>
      )}

      <Main>
        {voiceGenerating() && (
          <Loader>
            <CircularProgress />
            <div>Generating voice...</div>
          </Loader>
        )}
        {!voiceGenerating() && (
          <Main>
            {voicesAvailable() && useFile() && (
              <FileContainer>
                <FilePathButton types={["txt"]} onFileSelected={setFile} />
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
                  {file()}
                </Typography>
              </FileContainer>
            )}
            {!useFile() && (
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  height: "calc(100vh - 200px)",
                }}
              >
                <TextareaContainer style={{ width: "100%", flex: 1, display: "flex" }}>
                  <TextField
                    multiline
                    fullWidth
                    value={text()}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={() => {
                      if (playMode()) {
                        console.log("Text field blurred, saving text:", text());
                        savePlayModeText(text());
                      }
                    }}
                    placeholder="Enter text here"
                  />
                </TextareaContainer>
              </Box>
            )}
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 4,
                  width: "100%",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>Pitch: {pitch().toFixed(1)}</Typography>
                    <RangeInput
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={pitch()}
                      onInput={(e) => {
                        const newValue = parseFloat(e.currentTarget.value);
                        setPitch(newValue);
                        savePitch(newValue);
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>Rate: {rate().toFixed(1)}</Typography>
                    <RangeInput
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={rate()}
                      onInput={(e) => {
                        const newValue = parseFloat(e.currentTarget.value);
                        setRate(newValue);
                        saveRate(newValue);
                      }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography gutterBottom>Volume: {volume().toFixed(1)}</Typography>
                    <RangeInput
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume()}
                      onInput={(e) => {
                        const newValue = parseFloat(e.currentTarget.value);
                        setVolume(newValue);
                        saveVolume(newValue);
                      }}
                    />
                  </Box>
                </Box>
                {apiServerRunning() && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      padding: 2,
                      backgroundColor: "#f5f5f5",
                      borderRadius: 1,
                      fontSize: "0.8rem",
                      alignSelf: "center",
                      minWidth: "190px",
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      API Server
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Typography variant="caption" sx={{ mr: 1 }}>
                        Port:
                      </Typography>
                      <TextField
                        size="small"
                        variant="outlined"
                        type="number"
                        inputProps={{
                          min: 1024,
                          max: 65535,
                          style: { padding: "4px 8px" },
                        }}
                        value={apiPort()}
                        onChange={(e) => {
                          const port = parseInt(e.target.value);
                          if (port >= 1024 && port <= 65535) {
                            setApiPort(port);
                            saveApiPort(port);
                          }
                        }}
                        sx={{ width: "80px" }}
                      />
                    </Box>
                    <Typography variant="caption">
                      TTS: {serverInfo().url}
                      {serverInfo().tts_endpoint}
                    </Typography>
                    <Typography variant="caption">POST {'{"text":"Your text"}'}</Typography>
                    <Typography variant="caption">
                      Stop: {serverInfo().url}
                      {serverInfo().stop_endpoint}
                    </Typography>
                    <Typography variant="caption">POST {"{}"} to stop playback</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Main>
        )}
        {!voiceGenerating() && (
          <Footer>
            <Button onClick={onOpenExportFolder}>
              <FolderIcon />
            </Button>
            <Button onClick={fetchVoices} title="Refresh Voices List">
              🔄
            </Button>
            <SelectContainer>
              <Select
                value={selectedVoice()}
                onChange={(event) => {
                  setSelectedVoice(event.target.value as string);
                  saveLastVoice(event.target.value as string);
                }}
                size="small"
              >
                {map(shortVoices(), (voice) => (
                  <MenuItem value={voice.name}>
                    {voice.name} - {voice.lang}
                  </MenuItem>
                ))}
              </Select>
            </SelectContainer>

            {!playMode() && (
              <TextFieldContainer>
                <TextField
                  fullWidth
                  value={name()}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  variant="outlined"
                />
              </TextFieldContainer>
            )}

            <PlayButtonsContainer>
              <CreateButton onClick={handlePlayOrCreate}>
                {audioStatus() === "playing"
                  ? "Stop Audio"
                  : playMode()
                  ? "Play Audio"
                  : "Create Audio"}
              </CreateButton>
            </PlayButtonsContainer>

            <FormControlLabel
              control={<Checkbox checked={useFile()} onChange={toggleUseFile} />}
              label="Use file"
            />

            <FormControlLabel
              control={<Checkbox checked={playMode()} onChange={togglePlayMode} />}
              label="Play Mode"
            />
          </Footer>
        )}
      </Main>
    </Container>
  );
};
