import { styled } from "solid-styled-components";
import { Button } from "../../components/inputs/Button";

export const Container = styled("div")`
  display: flex;
  flex: 1;
  flex-direction: column;
`;

export const Main = styled("div")`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 8px;
`;

export const Footer = styled("div")`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  background-color: ${(props) => props?.theme?.colors.background};
  color: ${(props) => props?.theme?.colors.lightText};
  transition: transform 0.3s ease;
  gap: 8px;
`;

export const Loader = styled("div")`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  gap: 16px;
  height: 100%;
`;

export const TextareaContainer = styled("div")`
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;

  .MuiOutlinedInput-root {
    padding: 0;
  }

  textarea {
    background: ${(props) => props?.theme?.colors.lightBackground};
    border-radius: 6px;
    padding: 8px;
  }
`;

export const TextFieldContainer = styled("div")`
  flex: 1;
  input {
    padding: 8px;
    min-width: 300px;
    width: 100%;
    border-radius: 6px;
    background: ${(props) => props?.theme?.colors.lightBackground};
    height: 20px;
  }
`;

export const SelectContainer = styled("div")`
  flex: 1;
  .MuiOutlinedInput-root {
    padding: 0;
    min-width: 300px;
    width: 100%;
    background: ${(props) => props?.theme?.colors.lightBackground};
  }

  input {
    padding: 8px;
  }
`;

export const FileContainer = styled("div")`
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-direction: column;

  .button {
    width: 200px;
    height: 200px;
  }
`;

export const WideButton = styled(Button)`
  width: 200px;
  height: 200px;
`;

export const CreateButton = styled(Button)`
  width: 200px;
`;

export const PlayButtonsContainer = styled("div")`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  margin-bottom: 8px;

  .MuiButtonGroup-root {
    background: ${(props) => props?.theme?.colors.secondary};
    border-radius: 4px;
  }
`;
