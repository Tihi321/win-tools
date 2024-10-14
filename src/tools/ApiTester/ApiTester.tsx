import { createSignal, Component } from "solid-js";
import { Box, Typography, TextField, FormControlLabel, Switch } from "@suid/material";
import { styled } from "solid-styled-components";
import { invoke } from "@tauri-apps/api/core";
import PresetManager from "./PresetManager";
import RequestForm from "./RequestForm";

const Container = styled(Box)`
  padding: 16px;
`;

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

const ApiTester: Component = () => {
  const [url, setUrl] = createSignal("");
  const [method, setMethod] = createSignal("GET");
  const [headers, setHeaders] = createSignal<KeyValuePair[]>([{ key: "", value: "" }]);
  const [body, setBody] = createSignal<KeyValuePair[]>([{ key: "", value: "" }]);
  const [response, setResponse] = createSignal("");
  const [useBackend, setUseBackend] = createSignal(false);
  const [bodyType, setBodyType] = createSignal<"raw" | "table">("table");
  const [rawBody, setRawBody] = createSignal("");
  const [presets, setPresets] = createSignal<Preset[]>([]);

  // Load presets from local storage on component mount
  const loadPresetsFromStorage = () => {
    const storedPresets = localStorage.getItem("apiTesterPresets");
    if (storedPresets) {
      setPresets(JSON.parse(storedPresets));
    }
  };

  // Save presets to local storage
  const savePresetsToStorage = () => {
    localStorage.setItem("apiTesterPresets", JSON.stringify(presets()));
  };

  // Initialize presets from local storage
  loadPresetsFromStorage();

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
        bodyContent = rawBody();
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

  const savePreset = (name: string) => {
    const newPreset: Preset = {
      name,
      url: url(),
      method: method(),
      headers: headers(),
      body: body(),
      bodyType: bodyType(),
      rawBody: rawBody(),
    };
    setPresets((prev) => [...prev, newPreset]);
    savePresetsToStorage();
  };

  const loadPreset = (preset: Preset) => {
    setUrl(preset.url);
    setMethod(preset.method);
    setHeaders(preset.headers);
    setBody(preset.body);
    setBodyType(preset.bodyType);
    setRawBody(preset.rawBody);
  };

  const deletePreset = (preset: Preset) => {
    setPresets((prev) => prev.filter((p) => p.name !== preset.name));
    savePresetsToStorage();
  };

  const renamePreset = (oldName: string, newName: string) => {
    setPresets((prev) => prev.map((p) => (p.name === oldName ? { ...p, name: newName } : p)));
    savePresetsToStorage();
  };

  const updatePreset = (preset: Preset) => {
    const updatedPreset: Preset = {
      ...preset,
      url: url(),
      method: method(),
      headers: headers(),
      body: body(),
      bodyType: bodyType(),
      rawBody: rawBody(),
    };
    setPresets((prev) => prev.map((p) => (p.name === preset.name ? updatedPreset : p)));
    savePresetsToStorage();
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 2 }}>
        API Tester
      </Typography>

      <PresetManager
        presets={presets()}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
        onRenamePreset={renamePreset}
        onUpdatePreset={updatePreset}
      />

      <FormControlLabel
        control={
          <Switch checked={useBackend()} onChange={(e) => setUseBackend(e.target.checked)} />
        }
        label="Use Rust Backend"
      />

      <RequestForm
        url={url()}
        setUrl={setUrl}
        method={method()}
        setMethod={setMethod}
        headers={headers()}
        setHeaders={setHeaders}
        body={body()}
        setBody={setBody}
        bodyType={bodyType()}
        setBodyType={setBodyType}
        rawBody={rawBody()}
        setRawBody={setRawBody}
        onSubmit={handleSubmit}
      />

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
