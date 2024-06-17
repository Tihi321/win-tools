export const saveLocalLanguage = (name: string) => {
  localStorage.setItem("language", name);
};

export const loadLocalLanguage = (): string => {
  return localStorage.getItem("language") || "en-US-AndrewMultilingualNeural";
};

export const saveUseFile = (value: boolean) => {
  localStorage.setItem("useFile", value.toString());
};

export const loadUsedFile = (): boolean => {
  return Boolean(localStorage.getItem("useFile"));
};
