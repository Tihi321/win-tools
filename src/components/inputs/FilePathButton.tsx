import { openFile } from "../../hooks/file";
import { Component } from "solid-js";
import { Button } from "./Button";
import { FolderIcon } from "../icons/FolderIcon";

interface FilePathButtonProps {
  onFileSelected: (path: string) => void;
  types: string[];
}

export const FilePathButton: Component<FilePathButtonProps> = (props) => {
  const onOpenFile = () => {
    try {
      openFile(props.types).then((selected: any) => {
        return selected;
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
