import { execFile } from "child_process";
import { readFileSync } from "fs";
import path from "path";

interface RunnerResult {
  result: unknown;
  strings: Record<string, string>;
  sortedSets: Record<string, Array<[string, number]>>;
}

function runLuaProcess(payload: Record<string, unknown>): Promise<RunnerResult> {
  const runnerPath = path.resolve(
    process.cwd(),
    "scripts/redis-lua-runner.cjs"
  );
  const runnerSource = readFileSync(runnerPath, "utf8");
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      ["-e", runnerSource],
      { maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }
        resolve(JSON.parse(stdout) as RunnerResult);
      }
    );
    child.stdin?.end(JSON.stringify(payload));
  });
}

/**
 * Executes production Lua in an out-of-process official Lua VM. State is
 * serialized between calls, and calls are chained to model Redis EVAL atomicity.
 */
export class RedisLuaFixture {
  private strings = new Map<string, string>();
  private sortedSets = new Map<string, Map<string, number>>();
  private executionTail: Promise<unknown> = Promise.resolve();

  setString(key: string, value: string): void {
    this.strings.set(key, value);
  }

  addSorted(key: string, score: number, member: string): void {
    let set = this.sortedSets.get(key);
    if (!set) {
      set = new Map<string, number>();
      this.sortedSets.set(key, set);
    }
    set.set(member, score);
  }

  sortedMembers(key: string): string[] {
    return Array.from(this.sortedSets.get(key)?.entries() ?? [])
      .sort(
        ([memberA, scoreA], [memberB, scoreB]) =>
          scoreA - scoreB || memberA.localeCompare(memberB)
      )
      .map(([member]) => member);
  }

  sortedScore(key: string, member: string): number | undefined {
    return this.sortedSets.get(key)?.get(member);
  }

  eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    const execution = this.executionTail.then(() =>
      this.executeScript(script, keys, args)
    );
    this.executionTail = execution.then(
      () => undefined,
      () => undefined
    );
    return execution;
  }

  private async executeScript(
    script: string,
    keys: string[],
    args: string[]
  ): Promise<unknown> {
    const response = await runLuaProcess({
      script,
      keys,
      args,
      strings: Object.fromEntries(this.strings),
      sortedSets: Object.fromEntries(
        Array.from(this.sortedSets, ([key, set]) => [key, Array.from(set)])
      ),
    });

    this.strings = new Map(Object.entries(response.strings));
    this.sortedSets = new Map(
      Object.entries(response.sortedSets).map(([key, entries]) => [
        key,
        new Map(entries),
      ])
    );
    return response.result;
  }
}
