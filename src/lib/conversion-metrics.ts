import { getRedisClient } from "@/lib/redis";
import type { Task } from "@/types";

const RECORD_COMPLETION = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
local t = redis.call('TYPE', KEYS[2]).ok
if t ~= 'none' and t ~= 'hash' then return 0 end
redis.call('HINCRBY', KEYS[2], 'generations_completed', 1)
if ARGV[1] == '1' then redis.call('HINCRBY', KEYS[2], 'paid_generations_completed', 1) end
if ARGV[2] == '1' then redis.call('HINCRBY', KEYS[2], 'hd_remakes_completed', 1) end
if ARGV[3] == '1' then redis.call('HINCRBY', KEYS[2], 'preview_generations_completed', 1) end
redis.call('EXPIRE', KEYS[2], 34560000)
redis.call('SET', KEYS[1], '1', 'EX', 34560000)
return 1
`;

/** Operational counts only. Analytics failures must never retry a paid AI job. */
export async function recordCompletedGeneration(task: Task): Promise<void> {
  try {
    const tier = task.generationTier ?? (task.priority === "normal" ? "free" : "pay_as_you_go");
    await getRedisClient().eval(RECORD_COMPLETION, [
      `conversion:completed:${task.id}`,
      `conversion:${new Date().toISOString().slice(0, 10)}`,
    ], [tier === "free" ? "0" : "1", task.upgradeSourceTaskId ? "1" : "0", task.downloadPolicy === "preview_v1" ? "1" : "0"]);
  } catch {
    console.error("conversion_completion_metric_failed");
  }
}

/** Counts a first authorized master download request, not a completed transfer. */
export async function recordResultDownloadRequest(taskId: string): Promise<void> {
  try {
    await getRedisClient().eval(`
      if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
      local t = redis.call('TYPE', KEYS[2]).ok
      if t ~= 'none' and t ~= 'hash' then return 0 end
      redis.call('HINCRBY', KEYS[2], 'result_download_requests', 1)
      redis.call('EXPIRE', KEYS[2], 34560000)
      redis.call('SET', KEYS[1], '1', 'EX', 34560000)
      return 1`, [`conversion:download:${taskId}`, `conversion:${new Date().toISOString().slice(0, 10)}`], []);
  } catch { console.error("conversion_download_metric_failed"); }
}
