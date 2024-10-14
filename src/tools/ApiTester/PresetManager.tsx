import { Component, For, createSignal } from "solid-js";
import {
  Box,
  Button,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@suid/material";
import { SelectChangeEvent } from "@suid/material/Select";

interface KeyValuePair {
  key: string;
  value: string;
}

interface Preset {
  name: string;
  url: string;
  method: string;
  headers: KeyValuePair[];
  body: KeyValuePair[];
  bodyType: "raw" | "table";
  rawBody: string;
}

interface PresetManagerProps {
  presets: Preset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: Preset) => void;
  onDeletePreset: (preset: Preset) => void;
  onRenamePreset: (oldName: string, newName: string) => void;
  onUpdatePreset: (preset: Preset) => void;
}

const PresetManager: Component<PresetManagerProps> = (props) => {
  const [showSaveDialog, setShowSaveDialog] = createSignal(false);
  const [showRenameDialog, setShowRenameDialog] = createSignal(false);
  const [presetName, setPresetName] = createSignal("");
  const [selectedPreset, setSelectedPreset] = createSignal<Preset | null>(null);
  const [newPresetName, setNewPresetName] = createSignal("");

  const handlePresetChange = (event: SelectChangeEvent<string>) => {
    const preset = props.presets.find((p) => p.name === event.target.value);
    if (preset) {
      props.onLoadPreset(preset);
      setSelectedPreset(preset);
    }
  };

  const handleSavePreset = () => {
    props.onSavePreset(presetName());
    setShowSaveDialog(false);
    setPresetName("");
  };

  const handleRenamePreset = () => {
    if (selectedPreset()) {
      props.onRenamePreset(selectedPreset()!.name, newPresetName());
      setShowRenameDialog(false);
      setNewPresetName("");
    }
  };

  const handleUpdatePreset = () => {
    if (selectedPreset()) {
      props.onUpdatePreset(selectedPreset()!);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
      <Select
        value={selectedPreset()?.name || ""}
        onChange={handlePresetChange}
        displayEmpty
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="" disabled>
          Select a preset
        </MenuItem>
        <For each={props.presets}>
          {(preset) => <MenuItem value={preset.name}>{preset.name}</MenuItem>}
        </For>
      </Select>
      <Button onClick={() => setShowSaveDialog(true)}>Save Preset</Button>
      <Button onClick={handleUpdatePreset} disabled={!selectedPreset()}>
        Update Preset
      </Button>
      <Button onClick={() => setShowRenameDialog(true)} disabled={!selectedPreset()}>
        Rename Preset
      </Button>
      <Button
        onClick={() => selectedPreset() && props.onDeletePreset(selectedPreset()!)}
        disabled={!selectedPreset()}
      >
        Delete Preset
      </Button>

      <Dialog open={showSaveDialog()} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>Save Preset</DialogTitle>
        <DialogContent>
          <TextField
            label="Preset Name"
            value={presetName()}
            onChange={(e) => setPresetName(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button onClick={handleSavePreset}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRenameDialog()} onClose={() => setShowRenameDialog(false)}>
        <DialogTitle>Rename Preset</DialogTitle>
        <DialogContent>
          <TextField
            label="New Preset Name"
            value={newPresetName()}
            onChange={(e) => setNewPresetName(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRenameDialog(false)}>Cancel</Button>
          <Button onClick={handleRenamePreset}>Rename</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PresetManager;
