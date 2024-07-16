import { Component } from "solid-js";
import { styled } from "solid-styled-components";
import { MenuItem, Select } from "@suid/material";

const SelectContainer = styled("div")`
  .MuiOutlinedInput-root {
    padding: 0;
    width: 300px;
    background: ${(props) => props?.theme?.colors.lightBackground};
  }

  input {
    padding: 8px;
  }
`;

interface SelectedTypeProps {
  type: string;
  onChange: (values: string) => void;
}

export const SelectType: Component<SelectedTypeProps> = (props) => {
  return (
    <SelectContainer>
      <Select
        value={props.type}
        onChange={(event) => {
          props.onChange(event.target.value as string);
        }}
        size="small"
      >
        <MenuItem value="text">Text</MenuItem>
        <MenuItem value="number">Number</MenuItem>
        <MenuItem value="folder">Folder</MenuItem>
        <MenuItem value="file">File</MenuItem>
      </Select>
    </SelectContainer>
  );
};
