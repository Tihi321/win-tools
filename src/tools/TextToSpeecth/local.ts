export const saveLocalLanguage = (name: string) => {
  localStorage.setItem("ttstool/language", name);
};

export const loadLocalLanguage = (): string => {
  return localStorage.getItem("ttstool/language") || "en-US-AndrewMultilingualNeural";
};

export const saveUseFile = (value: boolean) => {
  localStorage.setItem("ttstool/useFile", value.toString());
};

export const loadUsedFile = (): boolean => {
  return localStorage.getItem("ttstool/useFile") === "true";
};

export const savePlayMode = (value: boolean) => {
  localStorage.setItem("ttstool/playMode", value.toString());
};

export const loadPlayMode = (): boolean => {
  // Default to true if not set
  return localStorage.getItem("ttstool/playMode") !== "false";
};

export const saveLastPlayModeText = (text: string) => {
  localStorage.setItem("ttstool/lastPlayModeText", text);
};

export const loadLastPlayModeText = (): string => {
  return localStorage.getItem("ttstool/lastPlayModeText") || "";
};
