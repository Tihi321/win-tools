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
  TextField,
  Typography,
} from "@suid/material";
import { map } from "lodash";
import { SelectType } from "./SelectType";
import { emit } from "@tauri-apps/api/event";

const Container = styled(DialogContent)`
  flex: 1;
  flex-direction: column;
`;

interface AddScriptModalProps {
  onClose: () => void;
}

export const AddScriptModal: Component<AddScriptModalProps> = (props) => {
  const [name, setName] = createSignal("");
  const [filePath, setFilePath] = createSignal("");
  const [scriptArgs, setScriptArgs] = createSignal<string[]>([]);
  const [selectedType, setSelectedType] = createSignal("text");

  return (
    <Dialog open={true} onClose={props.onClose}>
      <DialogTitle>Add New Script</DialogTitle>
      <Container>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FilePathButton type="bat" onFileSelected={setFilePath} />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              margin="dense"
              onBlur={(event: any) => {
                setName(event.target.value);
              }}
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
          disabled={!filePath() && !name()}
          onClick={() => {
            emit("save_script", {
              name: name(),
              script_args: scriptArgs(),
              path: filePath(),
            });
            setName("");
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
