export const saveLocalLanguage = (name: string) => {
  localStorage.setItem("language", name);
};

export const loadLocalLanguage = (): string => {
  return localStorage.getItem("language") || "en-US-AndrewMultilingualNeural";
};
