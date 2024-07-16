import { open } from "@tauri-apps/plugin-dialog";

export const openFile = async (types: string[]) => {
  try {
    // Opens a file dialog allowing the user to select files
    const selected = await open({
      // Optional: specify filters for file types
      filters: [
        {
          name: "Application",
          extensions: types,
        },
      ],
      // Optional: specify if multiple files can be selected
      multiple: false,
      // Optional: specify if directories can be selected
      directory: false,
    });
    return selected;

    // Handle the selected file path
  } catch (error) {
    console.error("Error opening file dialog:", error);

    return "";
  }
};

export const openFolder = async () => {
  try {
    // Opens a file dialog allowing the user to select directories
    const selected = await open({
      // Remove filters for file types since we're selecting directories
      // Optional: specify if multiple directories can be selected
      multiple: false,
      // Set to true to specify that directories can be selected
      directory: true,
    });
    return selected;
  } catch (error) {
    console.error("Error opening file dialog:", error);
    return "";
  }
};
