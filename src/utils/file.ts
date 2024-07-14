import { split, head } from "lodash";

export const basename = (fileName: string): string => {
  const fileNameArray = split(fileName, ".");
  const output = head(fileNameArray);
  return output as string;
};
