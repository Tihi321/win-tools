import { omit } from "lodash";
import { ScriptInfo } from "./types";

export const getScriptInfos = (): ScriptInfo => {
  const data = localStorage.getItem("scriptstool/scriptsinfo");
  return JSON.parse(data || "{}") || {};
};

export const saveScriptInfo = (name: string, args: string[]) => {
  const localValues = getScriptInfos();
  const output: any = { ...localValues, [name]: args };
  localStorage.setItem("scriptstool/scriptsinfo", JSON.stringify(output));
  return output;
};

export const removeScriptInfo = (name: string) => {
  const localValues = getScriptInfos();
  const output: any = omit(localValues, name);
  localStorage.setItem("scriptstool/scriptsinfo", JSON.stringify(output));

  return output;
};
