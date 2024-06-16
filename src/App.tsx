import { createEffect, createSignal } from "solid-js";
import { styled } from "solid-styled-components";
import { Logo } from "./components/assets/Logo";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

const Container = styled("div")`
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Header = styled("div")`
  display: flex;
  flex-direction: row;
  padding: 8px;
  gap: 8px;
  background: ${(props) => props?.theme?.colors.ui5};
`;

const Main = styled("div")`
  display: flex;
  padding: 8px;
  flex: 1;
`;

const Footer = styled("div")`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  padding: 8px;
  background-color: ${(props) => props?.theme?.colors.ui5};
  transition: transform 0.3s ease;
`;

export const App = () => {
  const [text, setText] = createSignal("");
  const [name, setName] = createSignal("");

  const onClick = async () => {
    // Invoke tauri command create_audio, and send name and text as arguments
    try {
      await invoke("create_audio", { text: text(), name: name() });
    } catch (error) {
      console.error("Error invoking create_audio command:", error);
    }
  };

  createEffect(() => {
    listen("create_audio", () => {
      setName("");
      setText("");
    });
  });

  return (
    <Container>
      <Header>
        <Logo url="https://solidjs.com/" />
      </Header>
      <Main>
        <textarea
          value={text()}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        />
        <input
          type="text"
          value={name()}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <button onClick={onClick}>Click me</button>
      </Main>
      <Footer>footer</Footer>
    </Container>
  );
};
