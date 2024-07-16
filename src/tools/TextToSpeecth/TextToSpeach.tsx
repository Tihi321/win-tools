import { createEffect, createSignal, createMemo, onMount } from "solid-js";
import { listen, emit } from "@tauri-apps/api/event";
import { get, map, filter, includes, isEmpty } from "lodash";
import { Button } from "../../components/inputs/Button";
import { VOICES_LIST } from "../../constants";
import { loadLocalLanguage, loadUsedFile, saveLocalLanguage, saveUseFile } from "./local";
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
  WideButton,
  Loader,
} from "./Styles";
import { RangeInput } from "../../components/inputs/RangeInput";

type VoicesList = Array<{ name: string; lang: string }>;

export const TextToSpeach = () => {
  const [voices, setVoices] = createSignal<VoicesList>([]);
  const [selectedVoice, setSelectedVoice] = createSignal("");
  const [useFile, setUseFile] = createSignal(false);
  const [voiceGenerating, setVoiceGenerating] = createSignal(false);
  const [file, setFile] = createSignal("");
  const [text, setText] = createSignal("");
  const [name, setName] = createSignal("");
  const [pitch, setPitch] = createSignal(1);
  const [rate, setRate] = createSignal(1);
  const [volume, setVolume] = createSignal(1);

  const shortVoices = createMemo(() =>
    filter(voices(), (voice) => includes(VOICES_LIST, voice.lang))
  );

  onMount(() => {
    emit("update_title", "Text to Speech");
    emit("get_voices_list", {});
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
      setName("");
      setText("");
      setFile("");
      setPitch(1);
      setRate(1);
      setVolume(1);
      setVoiceGenerating(false);
    });

    return () => unlisten();
  });

  createEffect(() => {
    const language = loadLocalLanguage();
    setSelectedVoice(language);
  });

  createEffect(() => {
    const useFile = loadUsedFile();
    setUseFile(useFile);
  });

  const onCreateAudio = () => {
    if (useFile()) {
      emit("create_audio_from_file", {
        file: file(),
        name: name() || "output",
        voice: selectedVoice(),
        pitch: pitch(),
        rate: rate(),
        volume: volume(),
      });
    } else {
      emit("create_audio_from_text", {
        text: text(),
        name: name() || "output",
        voice: selectedVoice(),
        pitch: pitch(),
        rate: rate(),
        volume: volume(),
      });
    }

    setVoiceGenerating(true);
  };

  const onOpenExportFolder = () => {
    emit("open_export_folder", {});
  };

  const fetchVoices = () => {
    emit("refresh_voices_list", {});
  };

  return (
    <Container>
      {voiceGenerating() && (
        <Loader>
          <CircularProgress />
          <div>Generating voice...</div>
        </Loader>
      )}
      {!voiceGenerating() && (
        <Main>
          {!voicesAvailable() && (
            <FileContainer>
              <WideButton datatype="secondary" onClick={fetchVoices}>
                Get Voices
              </WideButton>
            </FileContainer>
          )}
          {voicesAvailable() && useFile() && (
            <FileContainer>
              <FilePathButton types={["txt"]} onFileSelected={setFile} />
              {file()}
            </FileContainer>
          )}
          {voicesAvailable() && !useFile() && (
            <TextareaContainer>
              <TextField
                multiline
                fullWidth
                rows={20}
                value={text()}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text here"
              />
            </TextareaContainer>
          )}
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>Pitch: {pitch().toFixed(1)}</Typography>
            <RangeInput
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch()}
              onInput={(e) => setPitch(parseFloat(e.currentTarget.value))}
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
              onInput={(e) => setRate(parseFloat(e.currentTarget.value))}
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
              onInput={(e) => setVolume(parseFloat(e.currentTarget.value))}
            />
          </Box>
        </Main>
      )}
      {!voiceGenerating() && (
        <Footer>
          <Button onClick={onOpenExportFolder}>
            <FolderIcon />
          </Button>
          <SelectContainer>
            <Select
              value={selectedVoice()}
              onChange={(event) => {
                setSelectedVoice(event.target.value as string);
                saveLocalLanguage(event.target.value as string);
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

          <TextFieldContainer>
            <TextField
              fullWidth
              value={name()}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              variant="outlined"
            />
          </TextFieldContainer>

          <CreateButton onClick={onCreateAudio}>Create audio</CreateButton>
          <FormControlLabel
            control={
              <Checkbox
                checked={useFile()}
                onChange={(event: any) => {
                  const checked = !event.target.checked;
                  setUseFile(checked);
                  saveUseFile(checked);
                }}
              />
            }
            label="Use file"
          />
        </Footer>
      )}
    </Container>
  );
};
