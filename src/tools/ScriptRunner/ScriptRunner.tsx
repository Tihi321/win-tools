import { emit, listen } from "@tauri-apps/api/event";
import { filter, get, includes, join, map } from "lodash";
import { createEffect, createSignal, onMount, createMemo } from "solid-js";
import {
  Box,
  Checkbox,
  FormControlLabel,
  Modal,
  TextField,
  Typography,
  List,
  ListItem,
  Paper,
  Grid,
  IconButton,
} from "@suid/material";
import PlayArrowIcon from "@suid/icons-material/PlayArrow";
import StopIcon from "@suid/icons-material/Stop";
import DeleteIcon from "@suid/icons-material/Delete";
import AddIcon from "@suid/icons-material/Add";
import { AddScriptModal } from "./AddScriptModal";
import { getScriptInfos, removeScriptInfo } from "./local";
import { ScriptInfo } from "./types";
import { FolderPathButton } from "../../components/inputs/FolderPathButton";
import { VISIBILITY } from "./constants";

export const ScriptRunner = () => {
  const [scriptsHidden, setScriptsHidden] = createSignal({});
  const [scriptInfos, setScriptInfos] = createSignal<ScriptInfo>({});
  const [scriptNames, setScriptNames] = createSignal<string[]>([]);
  const [addScriptModalOpen, setAddScriptModalOpen] = createSignal(false);
  const [scriptVariables, setScriptVariables] = createSignal({});

  const scriptInfoList = createMemo(() => {
    const list = map(scriptInfos(), (args, name) => ({
      name,
      args,
    }));

    return filter(list, (script) => !includes(scriptNames(), script.name));
  });

  onMount(() => {
    const scriptInfos = getScriptInfos();
    setScriptInfos(scriptInfos);
    emit("update_title", "Script Runner");
    emit("get_scripts", {});
  });

  createEffect(async () => {
    const unlisten = await listen("scripts", (event: any) => {
      const scripts = get(event, ["payload"], []);

      setScriptNames(scripts);
    });

    return () => unlisten();
  });

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {map(scriptInfoList(), (values) => (
          <Grid item xs={12} md={6} lg={4}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {values.name}
              </Typography>
              <List>
                {map(values.args, (type, index) => (
                  <ListItem disablePadding>
                    {type === "text" && (
                      <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        margin="dense"
                        label={`Argument ${index + 1}`}
                        onBlur={(event: any) => {
                          setScriptVariables((state) => {
                            const scriptArguments = get(state, [values.name], []);
                            scriptArguments[index] = event.target.value;
                            return { ...state, [values.name]: scriptArguments };
                          });
                        }}
                      />
                    )}
                    {type === "number" && (
                      <TextField
                        fullWidth
                        type="number"
                        variant="outlined"
                        size="small"
                        margin="dense"
                        label={`Argument ${index + 1}`}
                        onBlur={(event: any) => {
                          setScriptVariables((state) => {
                            const scriptArguments = get(state, [values.name], []);
                            scriptArguments[index] = event.target.value;
                            return { ...state, [values.name]: scriptArguments };
                          });
                        }}
                      />
                    )}
                    {type === "folder" && (
                      <Box sx={{ my: 1 }}>
                        <FolderPathButton
                          onFolderSelected={(path) => {
                            setScriptVariables((state) => {
                              const scriptArguments = get(state, [values.name], []);
                              scriptArguments[index] = path;
                              return { ...state, [values.name]: scriptArguments };
                            });
                          }}
                        />
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mt: 2,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={get(scriptsHidden(), [values.name], false)}
                      onChange={() => {
                        const currentHidden = get(scriptsHidden(), [values.name], false);
                        setScriptsHidden({ ...scriptsHidden(), [values.name]: !currentHidden });
                      }}
                    />
                  }
                  label="Hidden"
                />
                <Box>
                  <IconButton
                    color="primary"
                    onClick={() => {
                      emit("start_script", {
                        name: values.name,
                        visibility: get(scriptsHidden(), [values.name], false)
                          ? VISIBILITY.HIDDEN
                          : VISIBILITY.VISIBILE,
                        arguments: join(get(scriptVariables(), [values.name], []), " "),
                      });
                    }}
                  >
                    <PlayArrowIcon />
                  </IconButton>
                  <IconButton
                    color="secondary"
                    onClick={() => {
                      emit("stop_script", values.name);
                    }}
                  >
                    <StopIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => {
                      emit("remove_script", values.name);
                      const newScripts = removeScriptInfo(values.name);
                      setScriptInfos(newScripts);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 3 }}>
        <IconButton color="primary" size="large" onClick={() => setAddScriptModalOpen(true)}>
          <AddIcon />
        </IconButton>
      </Box>
      <Modal open={addScriptModalOpen()} onClose={() => setAddScriptModalOpen(false)}>
        <AddScriptModal
          onClose={() => {
            setAddScriptModalOpen(false);
            const scriptInfos = getScriptInfos();
            setScriptInfos(scriptInfos);
          }}
        />
      </Modal>
    </Box>
  );
};
