import { emit, listen } from "@tauri-apps/api/event";
import { get, join, map } from "lodash";
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
  Paper,
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
import { styled } from "solid-styled-components";
import { FilePathButton } from "../../components/inputs/FilePathButton";

const ScrollContainer = styled("div")`
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding: 16px 0;
  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
`;

const ScriptCard = styled(Paper)`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-right: 16px;
  padding: 16px;
  height: 100%;
`;

const CardContent = styled("div")`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

const CardActions = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
`;
export const ScriptRunner = () => {
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
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
                        {argumentValues.label}
                      </Typography>
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
                    </Box>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      sx={{ fontWeight: "bold", textAlign: "left" }}
                    >
                      {get(scriptVariables(), [values.name, index], "")}
                    </Typography>
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
                      emit("add_script", values.path);
                    }}
                  >
                    <FileCopy />
                  </IconButton>
                )}
                <IconButton
                  color="error"
                  onClick={() => {
                    emit("remove_script", values.path);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
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
