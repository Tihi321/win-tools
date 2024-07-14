import { styled } from "solid-styled-components";
import { TextToSpeach } from "./tools/TextToSpeach";
import { createSignal, For, Show } from "solid-js";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@suid/material";
import MenuIcon from "@suid/icons-material/Menu";
import { replace, startCase } from "lodash";

const Container = styled("div")`
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  color: ${(props) => props?.theme?.colors.text};
`;

const tools: string[] = ["text-to-speach"];

export const App = () => {
  const [isDrawerOpen, setIsDrawerOpen] = createSignal<boolean>(false);
  const [selectedTool, setSelectedTool] = createSignal<string>("text-to-speach");

  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen());

  const selectTool = (toolName: string) => {
    setSelectedTool(toolName);
  };

  return (
    <Container>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Tools
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={isDrawerOpen()} onClose={toggleDrawer}>
        <List sx={{ width: "250px" }}>
          <For each={tools}>
            {(toolName, index) => (
              <ListItemButton onClick={() => selectTool(toolName)}>
                {index() + 1}. <ListItemText primary={startCase(replace(toolName, "-", " "))} />
              </ListItemButton>
            )}
          </For>
        </List>
      </Drawer>
      <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Show when={selectedTool()}>{selectedTool() === "text-to-speach" && <TextToSpeach />}</Show>
      </Box>
    </Container>
  );
};
