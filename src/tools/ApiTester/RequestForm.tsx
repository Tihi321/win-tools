import { Component, For } from "solid-js";
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  Typography,
  Switch,
  FormControlLabel,
  IconButton,
} from "@suid/material";
import { SelectChangeEvent } from "@suid/material/Select";
import AddIcon from "@suid/icons-material/Add";
import DeleteIcon from "@suid/icons-material/Delete";

interface KeyValuePair {
  key: string;
  value: string;
}

interface RequestFormProps {
  url: string;
  setUrl: (url: string) => void;
  method: string;
  setMethod: (method: string) => void;
  headers: KeyValuePair[];
  setHeaders: (headers: KeyValuePair[]) => void;
  body: KeyValuePair[];
  setBody: (body: KeyValuePair[]) => void;
  bodyType: "raw" | "table";
  setBodyType: (bodyType: "raw" | "table") => void;
  rawBody: string;
  setRawBody: (rawBody: string) => void;
  onSubmit: (e: Event) => void;
}

const RequestForm: Component<RequestFormProps> = (props) => {
  const addKeyValuePair = (setter: (kvp: KeyValuePair[]) => void) => {
    setter([...props.headers, { key: "", value: "" }]);
  };

  const removeKeyValuePair = (index: number, setter: (kvp: KeyValuePair[]) => void) => {
    setter(props.headers.filter((_, i) => i !== index));
  };

  const updateKeyValuePair = (
    index: number,
    field: "key" | "value",
    value: string,
    setter: (kvp: KeyValuePair[]) => void
  ) => {
    setter(props.headers.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  return (
    <Box
      component="form"
      onSubmit={props.onSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <TextField
        label="URL"
        value={props.url}
        onChange={(e) => props.setUrl(e.target.value)}
        fullWidth
      />
      <Select
        value={props.method}
        onChange={(e: SelectChangeEvent<string>) => props.setMethod(e.target.value)}
        fullWidth
      >
        <MenuItem value="GET">GET</MenuItem>
        <MenuItem value="POST">POST</MenuItem>
        <MenuItem value="PUT">PUT</MenuItem>
        <MenuItem value="DELETE">DELETE</MenuItem>
      </Select>

      <Typography variant="h6">Headers</Typography>
      <For each={props.headers}>
        {(header, index) => (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Key"
              value={header.key}
              onChange={(e) => updateKeyValuePair(index(), "key", e.target.value, props.setHeaders)}
              size="small"
            />
            <TextField
              label="Value"
              value={header.value}
              onChange={(e) =>
                updateKeyValuePair(index(), "value", e.target.value, props.setHeaders)
              }
              size="small"
            />
            <IconButton onClick={() => removeKeyValuePair(index(), props.setHeaders)} size="small">
              <DeleteIcon />
            </IconButton>
          </Box>
        )}
      </For>
      <Button startIcon={<AddIcon />} onClick={() => addKeyValuePair(props.setHeaders)}>
        Add Header
      </Button>

      <Typography variant="h6">Body</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={props.bodyType === "raw"}
            onChange={(e) => props.setBodyType(!e.target.checked ? "raw" : "table")}
          />
        }
        label="Use Raw Body"
      />

      {props.bodyType === "raw" ? (
        <TextField
          label="Raw Body"
          multiline
          rows={4}
          value={props.rawBody}
          onChange={(e) => props.setRawBody(e.target.value)}
          fullWidth
        />
      ) : (
        <>
          <For each={props.body}>
            {(param, index) => (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  label="Key"
                  value={param.key}
                  onChange={(e) =>
                    updateKeyValuePair(index(), "key", e.target.value, props.setBody)
                  }
                  size="small"
                />
                <TextField
                  label="Value"
                  value={param.value}
                  onChange={(e) =>
                    updateKeyValuePair(index(), "value", e.target.value, props.setBody)
                  }
                  size="small"
                />
                <IconButton onClick={() => removeKeyValuePair(index(), props.setBody)} size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </For>
          <Button startIcon={<AddIcon />} onClick={() => addKeyValuePair(props.setBody)}>
            Add Body Parameter
          </Button>
        </>
      )}

      <Button type="submit" variant="contained" color="primary" fullWidth>
        Send Request
      </Button>
    </Box>
  );
};

export default RequestForm;
