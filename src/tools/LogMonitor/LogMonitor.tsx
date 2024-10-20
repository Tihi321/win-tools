import { createSignal } from "solid-js";
import { Box, Typography, TextField, Button } from "@suid/material";

import { styled } from "solid-styled-components";
import { invoke } from "@tauri-apps/api/core";

const Container = styled(Box)`
  padding: 16px;
`;

export const LogMonitor = () => {
  const [filePath, setFilePath] = createSignal("");

  const handleInputChange = (value: string) => {
    setFilePath(value);
  };

  const openFileInPowerShell = () => {
    if (filePath()) {
      invoke("monitor_log_file", {
        filepath: filePath(),
      });
    } else {
      alert("Please enter a file path.");
    }
  };
  return (
    <Container>
      <Typography variant="h4" sx={{ mb: "8px" }}>
        Log Monitor
      </Typography>
      <TextField
        label="Enter log file path"
        value={filePath()}
        onChange={(e) => handleInputChange(e.target.value)}
        fullWidth
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={openFileInPowerShell}
        sx={{ mt: "8px" }}
      >
        Monitor Log File
      </Button>
    </Container>
  );
};
