import { Component, createSignal } from "solid-js";
import { styled } from "solid-styled-components";
import { FilePathButton } from "../../components/inputs/FilePathButton";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
} from "@suid/material";
import { map } from "lodash";
import { saveScriptInfo } from "./local";
import { SelectType } from "./SelectType";
import { emit } from "@tauri-apps/api/event";
import { basename } from "../../utils";

const Container = styled(DialogContent)`
  flex: 1;
  flex-direction: column;
`;

interface AddScriptModalProps {
  onClose: () => void;
}

export const AddScriptModal: Component<AddScriptModalProps> = (props) => {
  const [fileName, setFileName] = createSignal("");
  const [filePath, setFilePath] = createSignal("");
  const [scriptArgs, setScriptArgs] = createSignal<string[]>([]);
  const [selectedType, setSelectedType] = createSignal("text");

  return (
    <Dialog open={true} onClose={props.onClose}>
      <DialogTitle>Add New Script</DialogTitle>
      <Container>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FilePathButton
              type="bat"
              onFileSelected={setFilePath}
              onNameSelected={(name) => setFileName(basename(name))}
            />
          </Grid>
          <Grid item xs={12}>
            <SelectType type={selectedType()} onChange={setSelectedType} />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={() => {
                setScriptArgs([...scriptArgs(), selectedType()]);
                setSelectedType("text");
              }}
            >
              Add argument
            </Button>
          </Grid>
          {map(scriptArgs(), (arg, index) => (
            <Grid item xs={12}>
              <Typography>{arg}</Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setScriptArgs(scriptArgs().filter((_, i) => i !== index));
                }}
              >
                Remove argument
              </Button>
            </Grid>
          ))}
        </Grid>
      </Container>
      <DialogActions>
        <Button
          variant="contained"
          disabled={!fileName()}
          onClick={() => {
            saveScriptInfo(fileName() || "", scriptArgs());
            emit("add_script", filePath());
            setSelectedType("text");
            setScriptArgs([]);
            props.onClose();
          }}
        >
          Add script
        </Button>
      </DialogActions>
    </Dialog>
  );
};
