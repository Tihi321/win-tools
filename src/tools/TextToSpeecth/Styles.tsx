import { styled } from "solid-styled-components";
import { Button } from "../../components/inputs/Button";

export const Main = styled("div")`
  display: flex;
  flex: 1;
  flex-direction: column;
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
  input {
    padding: 8px;
    width: 300px;
    border-radius: 6px;
    background: ${(props) => props?.theme?.colors.lightBackground};
    height: 20px;
  }
`;

export const SelectContainer = styled("div")`
  .MuiOutlinedInput-root {
    padding: 0;
    width: 300px;
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

export const Footer = styled("div")`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px;
  background-color: ${(props) => props?.theme?.colors.background};
  color: ${(props) => props?.theme?.colors.lightText};
  transition: transform 0.3s ease;
  gap: 8px;
`;

export const CreateButton = styled(Button)`
  width: 200px;
`;
