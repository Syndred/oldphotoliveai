const { LuaFactory } = require("wasmoon");

function redisBound(value) {
  if (value === "-inf") return Number.NEGATIVE_INFINITY;
  if (value === "+inf") return Number.POSITIVE_INFINITY;
  return Number(value);
}

async function readInput() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return JSON.parse(input);
}

async function main() {
  const payload = await readInput();
  const strings = new Map(Object.entries(payload.strings));
  const sortedSets = new Map(
    Object.entries(payload.sortedSets).map(([key, entries]) => [
      key,
      new Map(entries),
    ])
  );

  function getSortedSet(key) {
    let set = sortedSets.get(key);
    if (!set) {
      set = new Map();
      sortedSets.set(key, set);
    }
    return set;
  }

  function sortedEntries(key) {
    return Array.from(sortedSets.get(key)?.entries() ?? []).sort(
      ([memberA, scoreA], [memberB, scoreB]) =>
        scoreA - scoreB || memberA.localeCompare(memberB)
    );
  }

  function redisCall(commandValue, ...rawArgs) {
    const command = String(commandValue).toUpperCase();
    const key = String(rawArgs[0]);

    if (command === "GET") return strings.get(key);

    if (command === "ZRANGEBYSCORE") {
      const min = redisBound(rawArgs[1]);
      const max = redisBound(rawArgs[2]);
      let entries = sortedEntries(key).filter(
        ([, score]) => score >= min && score <= max
      );
      if (String(rawArgs[3]).toUpperCase() === "LIMIT") {
        const offset = Number(rawArgs[4]);
        entries = entries.slice(offset, offset + Number(rawArgs[5]));
      }
      return entries.map(([member]) => member);
    }

    if (command === "ZPOPMIN") {
      const entries = sortedEntries(key).slice(0, Number(rawArgs[1] ?? 1));
      const set = getSortedSet(key);
      const result = [];
      for (const [member, score] of entries) {
        set.delete(member);
        result.push(member, score);
      }
      return result;
    }

    if (command === "ZADD") {
      const set = getSortedSet(key);
      let index = 1;
      let mode;
      const possibleMode = String(rawArgs[index]).toUpperCase();
      if (possibleMode === "NX" || possibleMode === "XX") {
        mode = possibleMode;
        index += 1;
      }
      const score = Number(rawArgs[index]);
      const member = String(rawArgs[index + 1]);
      const exists = set.has(member);
      if ((mode === "NX" && exists) || (mode === "XX" && !exists)) return 0;
      set.set(member, score);
      return exists ? 0 : 1;
    }

    if (command === "ZREM") {
      return getSortedSet(key).delete(String(rawArgs[1])) ? 1 : 0;
    }

    if (command === "ZSCORE") {
      return getSortedSet(key).get(String(rawArgs[1])) ?? false;
    }

    throw new Error(`Unsupported Redis command in Lua fixture: ${command}`);
  }

  const lua = await new LuaFactory().createEngine();
  try {
    lua.global.set("KEYS", payload.keys);
    lua.global.set("ARGV", payload.args);
    lua.global.set("redis", { call: redisCall });
    lua.global.set("cjson", {
      encode: JSON.stringify,
      decode: JSON.parse,
    });
    const result = await lua.doString(payload.script);
    process.stdout.write(
      JSON.stringify({
        result,
        strings: Object.fromEntries(strings),
        sortedSets: Object.fromEntries(
          Array.from(sortedSets, ([key, set]) => [key, Array.from(set)])
        ),
      })
    );
  } finally {
    lua.global.close();
  }
}

main().catch((error) => {
  process.stderr.write(error?.stack || String(error));
  process.exitCode = 1;
});
