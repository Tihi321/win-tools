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
  return Boolean(localStorage.getItem("ttstool/useFile"));
};
