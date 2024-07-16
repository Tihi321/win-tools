import { get } from "lodash";
import { openFile } from "../../hooks/file";
import { Component } from "solid-js";
import { Button } from "./Button";
import { FolderIcon } from "../icons/FolderIcon";

interface FilePathButtonProps {
  onFileSelected: (path: string) => void;
  onNameSelected?: (name: string) => void;
  types: string[];
}

export const FilePathButton: Component<FilePathButtonProps> = (props) => {
  const onOpenFile = () => {
    try {
      openFile(props.types).then((selected: any) => {
        props.onFileSelected(get(selected, ["path"]));
        if (props.onNameSelected) {
          props.onNameSelected(get(selected, ["name"]));
        }
      });
    } catch (error) {
      console.error("Error opening file dialog:", error);
    }
  };

  return (
    <Button datatype="secondary" onClick={onOpenFile} class="button">
      <FolderIcon />
    </Button>
  );
};
