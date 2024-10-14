import { createSignal, Component, createEffect } from "solid-js";
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  Typography,
  Switch,
  FormControlLabel,
} from "@suid/material";
import { styled } from "solid-styled-components";
import { SelectChangeEvent } from "@suid/material/Select";
import { invoke } from "@tauri-apps/api/core";

const Container = styled(Box)`
  padding: 16px;
`;

/**
 * ApiTester component allows users to send HTTP requests to a specified URL
 * and view the response. It supports GET, POST, PUT, and DELETE methods,
 * and allows setting custom headers and body for the request.
 */
const ApiTester: Component = () => {
  const [url, setUrl] = createSignal("");
  const [method, setMethod] = createSignal("GET");
  const [headers, setHeaders] = createSignal("");
  const [body, setBody] = createSignal("");
  const [response, setResponse] = createSignal("");
  const [useBackend, setUseBackend] = createSignal(false);

  createEffect(() => {
    console.log("ApiTester component rendered");
    console.log("Current state:", {
      url: url(),
      method: method(),
      headers: headers(),
      body: body(),
      useBackend: useBackend(),
    });
  });

  /**
   * Handles the form submission by sending the HTTP request and updating the response.
   * @param e - The form submission event
   */
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    console.log("Form submitted");
    try {
      if (useBackend()) {
        // Use Rust backend
        const result = await invoke("make_api_request", {
          url: url(),
          method: method(),
          headers: headers() ? JSON.parse(headers()) : {},
          body: method() !== "GET" && body() ? body() : undefined,
        });
        console.log("Backend response:", result);
        setResponse(JSON.stringify(result, null, 2));
      } else {
        console.log("Using frontend-only request");
        // Frontend-only request
        const options: RequestInit = {
          method: method(),
          headers: headers() ? JSON.parse(headers()) : {},
          body: method() !== "GET" && body() ? body() : undefined,
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

  const handleUseBackendChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    setUseBackend(!target.checked);
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 2 }}>
        API Tester
      </Typography>
      <FormControlLabel
        control={<Switch checked={useBackend()} onChange={handleUseBackendChange} />}
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
          onChange={(e: { target: { value: string } }) => {
            console.log("URL changed:", e.target.value);
            setUrl(e.target.value);
          }}
          fullWidth
        />
        <Select
          value={method()}
          onChange={(e: SelectChangeEvent<string>) => {
            console.log("Method changed:", e.target.value);
            setMethod(e.target.value as string);
          }}
          fullWidth
        >
          <MenuItem value="GET">GET</MenuItem>
          <MenuItem value="POST">POST</MenuItem>
          <MenuItem value="PUT">PUT</MenuItem>
          <MenuItem value="DELETE">DELETE</MenuItem>
        </Select>
        <TextField
          label="Headers (JSON)"
          value={headers()}
          onChange={(e: { target: { value: string } }) => {
            console.log("Headers changed:", e.target.value);
            setHeaders(e.target.value);
          }}
          multiline
          rows={4}
          fullWidth
        />
        <TextField
          label="Body"
          value={body()}
          onChange={(e: { target: { value: string } }) => {
            console.log("Body changed:", e.target.value);
            setBody(e.target.value);
          }}
          multiline
          rows={4}
          fullWidth
        />
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
