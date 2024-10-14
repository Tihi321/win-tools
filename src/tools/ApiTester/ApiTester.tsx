import { createSignal, Component, For, Setter, Show } from "solid-js";
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  Typography,
  Switch,
  FormControlLabel,
  Checkbox,
  IconButton,
} from "@suid/material";
import { styled } from "solid-styled-components";
import { SelectChangeEvent } from "@suid/material/Select";
import { invoke } from "@tauri-apps/api/core";
import AddIcon from "@suid/icons-material/Add";
import DeleteIcon from "@suid/icons-material/Delete";

const Container = styled(Box)`
  padding: 16px;
`;

interface KeyValuePair {
  key: string;
  value: string;
}

const ApiTester: Component = () => {
  const [url, setUrl] = createSignal("");
  const [method, setMethod] = createSignal("GET");
  const [headers, setHeaders] = createSignal<KeyValuePair[]>([{ key: "", value: "" }]);
  const [body, setBody] = createSignal<KeyValuePair[]>([{ key: "", value: "" }]);
  const [rawBody, setRawBody] = createSignal("{}");
  const [bodyType, setBodyType] = createSignal<"raw" | "table">("table");
  const [response, setResponse] = createSignal("");
  const [useBackend, setUseBackend] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    console.log("Form submitted");
    try {
      const headersObject = headers().reduce((acc, { key, value }) => {
        if (key) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      let bodyContent: string | undefined;
      if (bodyType() === "raw") {
        bodyContent = rawBody() || "{}";
      } else {
        const bodyObject = body().reduce((acc, { key, value }) => {
          if (key) acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        bodyContent = JSON.stringify(bodyObject);
      }
      if (useBackend()) {
        console.log("Using Rust backend");
        const result = await invoke("make_api_request", {
          url: url(),
          method: method(),
          headers: headersObject,
          body: bodyContent,
        });
        console.log("Backend response:", result);
        setResponse(JSON.stringify(result, null, 2));
      } else {
        console.log("Using frontend-only request");
        const options: RequestInit = {
          method: method(),
          headers: headersObject,
          body: bodyContent,
        };

        const res = await fetch(url(), options);
        const data = await res.text();
        console.log("Frontend response:", data);
        setResponse(data);
      }
    } catch (error) {
      console.error("Error occurred:", error);
      if (error instanceof Error) {
        setResponse(`Error: ${error.message}`);
      } else {
        setResponse("An unknown error occurred");
      }
    }
  };

  const addKeyValuePair = (setter: Setter<KeyValuePair[]>) => {
    setter((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeKeyValuePair = (index: number, setter: Setter<KeyValuePair[]>) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const updateKeyValuePair = (
    index: number,
    field: "key" | "value",
    value: string,
    setter: Setter<KeyValuePair[]>
  ) => {
    setter((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 2 }}>
        API Tester
      </Typography>
      <FormControlLabel
        control={
          <Switch checked={useBackend()} onChange={(e) => setUseBackend(!e.target.checked)} />
        }
        label="Use Rust Backend"
      />
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
      >
        <TextField
          label="URL"
          value={url()}
          onChange={(e: { target: { value: string } }) => setUrl(e.target.value)}
          fullWidth
        />
        <Select
          value={method()}
          onChange={(e: SelectChangeEvent<string>) => setMethod(e.target.value as string)}
          fullWidth
        >
          <MenuItem value="GET">GET</MenuItem>
          <MenuItem value="POST">POST</MenuItem>
          <MenuItem value="PUT">PUT</MenuItem>
          <MenuItem value="DELETE">DELETE</MenuItem>
        </Select>

        <Typography variant="h6">Headers</Typography>
        <For each={headers()}>
          {(header, index) => (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="Key"
                value={header.key}
                onChange={(e) => updateKeyValuePair(index(), "key", e.target.value, setHeaders)}
                size="small"
              />
              <TextField
                label="Value"
                value={header.value}
                onChange={(e) => updateKeyValuePair(index(), "value", e.target.value, setHeaders)}
                size="small"
              />
              <IconButton onClick={() => removeKeyValuePair(index(), setHeaders)} size="small">
                <DeleteIcon />
              </IconButton>
            </Box>
          )}
        </For>
        <Button startIcon={<AddIcon />} onClick={() => addKeyValuePair(setHeaders)}>
          Add Header
        </Button>

        <FormControlLabel
          control={
            <Switch
              checked={bodyType() === "raw"}
              onChange={(e) => setBodyType(!e.target.checked ? "raw" : "table")}
            />
          }
          label="Use Raw Body"
        />

        <Show when={bodyType() === "raw"}>
          <TextField
            label="Raw Body"
            multiline
            rows={4}
            value={rawBody()}
            onChange={(e) => setRawBody(e.target.value)}
            fullWidth
          />
        </Show>

        <Show when={bodyType() === "table"}>
          <Typography variant="h6">Body</Typography>
          <For each={body()}>
            {(param, index) => (
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  label="Key"
                  value={param.key}
                  onChange={(e) => updateKeyValuePair(index(), "key", e.target.value, setBody)}
                  size="small"
                />
                <TextField
                  label="Value"
                  value={param.value}
                  onChange={(e) => updateKeyValuePair(index(), "value", e.target.value, setBody)}
                  size="small"
                />
                <IconButton onClick={() => removeKeyValuePair(index(), setBody)} size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </For>
          <Button startIcon={<AddIcon />} onClick={() => addKeyValuePair(setBody)}>
            Add Body Parameter
          </Button>
        </Show>

        <Button type="submit" variant="contained" color="primary" fullWidth>
          Send Request
        </Button>
      </Box>
      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
        Response:
      </Typography>
      <TextField
        value={response()}
        multiline
        rows={10}
        fullWidth
        InputProps={{
          readOnly: true,
        }}
      />
    </Container>
  );
};

export default ApiTester;
