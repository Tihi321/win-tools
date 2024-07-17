import { Paper } from "@suid/material";
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

export const ScrollContainer = styled("div")`
  display: flex;
  flex-wrap: wrap;
  overflow-x: auto;
  padding: 16px 0;
  gap: 16px;
  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
`;

export const ScriptCard = styled(Paper)`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-right: 16px;
  padding: 16px;
  height: 100%;
`;

export const CardContent = styled("div")`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

export const CardActions = styled("div")`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
`;
