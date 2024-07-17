import { emit, listen } from "@tauri-apps/api/event";
import { get, isEmpty, join, map } from "lodash";
import { createEffect, createSignal } from "solid-js";
import {
  Box,
  Checkbox,
  FormControlLabel,
  Modal,
  TextField,
  Typography,
  List,
  ListItem,
  IconButton,
} from "@suid/material";
import PlayArrowIcon from "@suid/icons-material/PlayArrow";
import StopIcon from "@suid/icons-material/Stop";
import DeleteIcon from "@suid/icons-material/Delete";
import FileCopy from "@suid/icons-material/FileCopy";
import AddIcon from "@suid/icons-material/Add";
import { AddScriptModal } from "./AddScriptModal";
import { ScriptInfo } from "./types";
import { FolderPathButton } from "../../components/inputs/FolderPathButton";
import { VISIBILITY } from "./constants";
import { FilePathButton } from "../../components/inputs/FilePathButton";
import { CardActions, CardContent, ScriptCard, ScrollContainer } from "./Styles";

export const ScriptRunner = () => {
  const [scriptsDiskRemove, setScriptsDiskRemove] = createSignal({});
  const [scriptsHidden, setScriptsHidden] = createSignal({});
  const [scriptInfos, setScriptInfos] = createSignal<ScriptInfo>([]);
  const [addScriptModalOpen, setAddScriptModalOpen] = createSignal(false);
  const [scriptVariables, setScriptVariables] = createSignal({});

  createEffect(async () => {
    const unlisten = await listen("scripts", (event: any) => {
      const scripts = JSON.parse(get(event, ["payload"], []));
      const scriptVariables = map(scripts, (values) => ({
        name: get(values, ["name"], ""),
        path: get(values, ["path"], ""),
        args: get(values, ["script_args"], []),
        local: get(values, ["local"], false),
      }));

      setScriptInfos(scriptVariables);
    });

    return () => {
      unlisten();
    };
  });

  createEffect(() => {
    emit("update_title", "Script Runner");
    emit("get_scripts", {});
  });

  return (
    <Box sx={{ p: 3 }}>
      <ScrollContainer>
        {map(scriptInfos(), (values) => (
          <ScriptCard elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
                {values.name}
              </Typography>
              <List sx={{ flexGrow: 1, overflowY: "auto", maxHeight: "200px" }}>
                {map(values.args, (argumentValues, index) => (
                  <ListItem
                    disablePadding
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        gap: "24px",
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
                        {argumentValues.label}
                      </Typography>
                      <Box
                        sx={{
                          flex: 1,
                          maxWidth: "500px",
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        {argumentValues.value === "text" && (
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
                        {argumentValues.value === "number" && (
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
                        {argumentValues.value === "folder" && (
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
                        {argumentValues.value === "file" && (
                          <Box sx={{ my: 1 }}>
                            <FilePathButton
                              types={["*"]}
                              onFileSelected={(path) => {
                                setScriptVariables((state) => {
                                  const scriptArguments = get(state, [values.name], []);
                                  scriptArguments[index] = path;
                                  return { ...state, [values.name]: scriptArguments };
                                });
                              }}
                            />
                          </Box>
                        )}
                        {argumentValues.value === "label" && (
                          <Box sx={{ my: 1 }}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={
                                    get(scriptVariables(), [values.name, index], "") ===
                                    argumentValues.label
                                  }
                                  onChange={(event) => {
                                    const checked = !event.target.checked;
                                    setScriptVariables((state) => {
                                      const scriptArguments = get(state, [values.name], []);
                                      scriptArguments[index] = checked ? argumentValues.label : "";
                                      return { ...state, [values.name]: scriptArguments };
                                    });
                                  }}
                                />
                              }
                              label={`Argument ${index + 1}`}
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                    {!isEmpty(get(scriptVariables(), [values.name, index], "")) && (
                      <Box sx={{ display: "flex", gap: "8px" }}>
                        <Typography
                          variant="overline"
                          gutterBottom
                          sx={{ fontWeight: "bold", textAlign: "left", color: "green" }}
                        >
                          Added
                        </Typography>
                        {(argumentValues.value === "folder" || argumentValues.value === "file") && (
                          <Typography variant="overline" gutterBottom>
                            - {get(scriptVariables(), [values.name, index], "")}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
            </CardContent>
            <CardActions>
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
                      visibility: get(scriptsHidden(), [values.name], false)
                        ? VISIBILITY.HIDDEN
                        : VISIBILITY.VISIBILE,
                      arguments: join(get(scriptVariables(), [values.name], []), " "),
                      path: values.path,
                    });
                  }}
                >
                  <PlayArrowIcon />
                </IconButton>
                <IconButton
                  color="secondary"
                  onClick={() => {
                    emit("stop_script", values.path);
                  }}
                >
                  <StopIcon />
                </IconButton>

                {!values.local && (
                  <IconButton
                    color="error"
                    onClick={() => {
                      emit("add_script", {
                        path: values.path,
                      });
                    }}
                  >
                    <FileCopy />
                  </IconButton>
                )}
                <IconButton
                  color="error"
                  onClick={() => {
                    emit("remove_script", {
                      name: values.name,
                      path: values.path,
                      remove_from_disk: get(scriptsDiskRemove(), [values.name], false),
                    });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
                {values.local && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={get(scriptsDiskRemove(), [values.name], false)}
                        onChange={() => {
                          const currentHidden = get(scriptsDiskRemove(), [values.name], false);
                          setScriptsDiskRemove({
                            ...scriptsDiskRemove(),
                            [values.name]: !currentHidden,
                          });
                        }}
                      />
                    }
                    label="Remove script"
                  />
                )}
              </Box>
            </CardActions>
          </ScriptCard>
        ))}
      </ScrollContainer>
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <IconButton color="primary" size="large" onClick={() => setAddScriptModalOpen(true)}>
          <AddIcon />
        </IconButton>
      </Box>
      <Modal open={addScriptModalOpen()} onClose={() => setAddScriptModalOpen(false)}>
        <AddScriptModal
          onClose={() => {
            setAddScriptModalOpen(false);
          }}
        />
      </Modal>
    </Box>
  );
};
