import { Component, createSignal } from "solid-js";
import { styled } from "solid-styled-components";
import { FilePathButton } from "../../components/inputs/FilePathButton";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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

const DialogStyled = styled(Dialog)`
  .MuiPaper-root {
    min-height: 600px;
  }
`;

interface AddScriptModalProps {
  onClose: () => void;
}

export const AddScriptModal: Component<AddScriptModalProps> = (props) => {
  const [name, setName] = createSignal("");
  const [filePath, setFilePath] = createSignal("");
  const [scriptArgs, setScriptArgs] = createSignal<Array<{ label: string; value: string }>>([]);
  const [selectedType, setSelectedType] = createSignal("text");
  const [selectedTypeLabel, setSelectedTypeLabel] = createSignal("");
  const [saveToDisk, setSaveToDisk] = createSignal(true);

  return (
    <DialogStyled open={true} onClose={props.onClose}>
      <DialogTitle>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
          Add New Script
        </Typography>
        <Typography variant="caption" gutterBottom sx={{ fontWeight: "bold" }}>
          {filePath()}
        </Typography>
      </DialogTitle>
      <Container>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FilePathButton types={["bat", "exe"]} onFileSelected={setFilePath} />
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
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              margin="dense"
              value={selectedTypeLabel()}
              onChange={(event: any) => {
                setSelectedTypeLabel(event.target.value);
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              disabled={!selectedTypeLabel()}
              variant="contained"
              onClick={() => {
                setScriptArgs([
                  ...scriptArgs(),
                  {
                    label: selectedTypeLabel(),
                    value: selectedType(),
                  },
                ]);
                setSelectedType("text");
                setSelectedTypeLabel("");
              }}
            >
              Add argument
            </Button>
          </Grid>
          {map(scriptArgs(), (arg, index) => (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                padding: "16px",
                gap: "8px",
                border: "1px solid #1976d2",
                margin: "8px 16px",
              }}
            >
              <Typography variant="subtitle1">Label: {arg.label}</Typography>
              <Typography variant="subtitle2">Type: {arg.value}</Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setScriptArgs(scriptArgs().filter((_, i) => i !== index));
                }}
              >
                Remove argument
              </Button>
            </Box>
          ))}
        </Grid>
      </Container>
      <DialogActions>
        <FormControlLabel
          control={
            <Checkbox
              checked={saveToDisk()}
              onChange={(event) => {
                setSaveToDisk(!event.target.checked);
              }}
            />
          }
          label="Add to disk"
        />
        <Button
          variant="contained"
          disabled={!filePath() && !name()}
          onClick={() => {
            emit("save_script", {
              name: name(),
              script_args: scriptArgs(),
              path: filePath(),
              save: saveToDisk(),
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
    </DialogStyled>
  );
};
