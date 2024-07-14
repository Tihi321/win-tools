import { styled } from "solid-styled-components";

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
    width: 60px;
    height: 60px;
    padding: 8px;
  }
`;
