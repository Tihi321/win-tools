import { openFolder } from "../../hooks/file";
import { Component } from "solid-js";
import { Button } from "./Button";
import { FolderIcon } from "../icons/FolderIcon";

interface FolderPathButtonProps {
  onFolderSelected: (path: string) => void;
}

export const FolderPathButton: Component<FolderPathButtonProps> = (props) => {
  const onOpenFolder = () => {
    try {
      openFolder().then((selected: any) => {
        props.onFolderSelected(selected);
      });
    } catch (error) {
      console.error("Error opening file dialog:", error);
    }
  };

  return (
    <Button datatype="secondary" onClick={onOpenFolder} class="button">
      <FolderIcon />
    </Button>
  );
};
