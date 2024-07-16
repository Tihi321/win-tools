export type ScriptInfo = Array<{
  name: string;
  path: string;
  args: Array<{ label: string; value: string }>;
  local: boolean;
}>;
