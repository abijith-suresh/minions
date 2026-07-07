import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { MINIONS_DELEGATE_SKILL_CONTENT, MINIONS_DELEGATE_SKILL_ID } from "@minions/core";

export const MINIONS_SKILLS_DIRECTORY = "skills";
export const MINIONS_SKILL_FILE = "SKILL.md";

export function minionsDelegateSkillPath(configDirectory: string): string {
  return join(
    configDirectory,
    MINIONS_SKILLS_DIRECTORY,
    MINIONS_DELEGATE_SKILL_ID,
    MINIONS_SKILL_FILE,
  );
}

export async function installMinionsDelegateSkill(configDirectory: string): Promise<string> {
  if (!configDirectory) throw new Error("OpenCode did not provide its global config directory");

  const file = minionsDelegateSkillPath(configDirectory);
  const temporary = `${file}.${process.pid}.tmp`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(temporary, `${MINIONS_DELEGATE_SKILL_CONTENT}\n`, "utf8");
  await rename(temporary, file);
  return file;
}
