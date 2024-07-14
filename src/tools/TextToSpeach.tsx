import { createEffect, createSignal, createMemo, onMount } from "solid-js";
import { styled } from "solid-styled-components";
import { listen, emit } from "@tauri-apps/api/event";
import { get, map, filter, includes, isEmpty } from "lodash";
import { Button } from "../components/inputs/Button";
import { VOICES_LIST } from "../constants";
import { loadLocalLanguage, loadUsedFile, saveLocalLanguage, saveUseFile } from "../hooks/local";
import { openFile } from "../hooks/file";
import { FolderIcon } from "../components/icons/FolderIcon";
import { TextField, Checkbox, FormControlLabel, Select, MenuItem } from "@suid/material";

const Main = styled("div")`
  display: flex;
  flex: 1;
  flex-direction: column;
`;

const TextareaContainer = styled("div")`
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;

  .MuiOutlinedInput-root {
    padding: 0;
  }

  textarea {
    background: ${(props) => props?.theme?.colors.lightBackground};
    border-radius: 6px;
    padding: 8px;
  }
`;

const TextFieldContainer = styled("div")`
  input {
    padding: 8px;
    width: 300px;
    border-radius: 6px;
    background: ${(props) => props?.theme?.colors.lightBackground};
    height: 20px;
  }
`;

const SelectContainer = styled("div")`
  .MuiOutlinedInput-root {
    padding: 0;
    width: 300px;
    background: ${(props) => props?.theme?.colors.lightBackground};
  }

  input {
    padding: 8px;
  }
`;

const FileContainer = styled("div")`
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-direction: column;
`;

const FilePathButton = styled(Button)`
  width: 200px;
  height: 200px;
`;

const Footer = styled("div")`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px;
  background-color: ${(props) => props?.theme?.colors.background};
  color: ${(props) => props?.theme?.colors.lightText};
  transition: transform 0.3s ease;
  gap: 8px;
`;

const CreateButton = styled(Button)`
  width: 200px;
`;

type VoicesList = Array<{ name: string; lang: string }>;

export const TextToSpeach = () => {
  const [voices, setVoices] = createSignal<VoicesList>([]);
  const [selectedVoice, setSelectedVoice] = createSignal("");
  const [useFile, setUseFile] = createSignal(false);
  const [file, setFile] = createSignal("");
  const [text, setText] = createSignal("");
  const [name, setName] = createSignal("");

  const shortVoices = createMemo(() =>
    filter(voices(), (voice) => includes(VOICES_LIST, voice.lang))
  );

  onMount(() => {
    try {
      emit("update_title", "Text to Speech");
    } catch (error) {
      console.error("Error invoking voices_list command:", error);
    }
  });

  const voicesAvailable = createMemo(() => !isEmpty(voices()));

  createEffect(async () => {
    try {
      emit("get_voices_list", {});
    } catch (error) {
      console.error("Error invoking voices_list command:", error);
    }
  });

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
      });
    } else {
      emit("create_audio_from_text", {
        text: text(),
        name: name() || "output",
        voice: selectedVoice(),
      });
    }
  };

  const onOpenExportFolder = () => {
    emit("open_export_folder", {});
  };

  const onOpenFile = () => {
    try {
      openFile().then((selected) => setFile(get(selected, ["path"])));
    } catch (error) {
      console.error("Error opening file dialog:", error);
    }
  };

  const fetchVoices = () => {
    emit("refresh_voices_list", {});
  };

  return (
    <>
      <Main>
        {!voicesAvailable() && (
          <FileContainer>
            <FilePathButton datatype="secondary" onClick={fetchVoices}>
              Get Voices
            </FilePathButton>
          </FileContainer>
        )}
        {voicesAvailable() && useFile() && (
          <FileContainer>
            <FilePathButton datatype="secondary" onClick={onOpenFile}>
              <FolderIcon />
            </FilePathButton>
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
      </Main>
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
          sx={{ width: "200px" }}
        />
      </Footer>
    </>
  );
};
