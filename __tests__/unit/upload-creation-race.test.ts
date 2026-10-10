import {RedisLuaFixture} from '../helpers/redis-lua-fixture';
import {AUTHENTICATED_CREATE_SCRIPT, buildTask} from '@/lib/task-creation';
import {CLAIM_UPLOAD_CLEANUP_SCRIPT} from '@/lib/upload-cleanup';
import {REGISTER_UPLOADED_PHOTO_SCRIPT, uploadReceiptKey} from '@/lib/upload-receipt';
const source='tasks/source/original.jpg';
const now=new Date('2026-10-10T00:00:00.000Z');
const receiptKey=uploadReceiptKey(source);
let redis:RedisLuaFixture;
const mockEval=jest.fn();
jest.mock('@/lib/redis',()=>({getRedisClient:()=>({eval:mockEval})}));
jest.mock('@/lib/r2',()=>({deleteFromR2:jest.fn()}));
beforeEach(async()=>{
 redis=new RedisLuaFixture();
 redis.setString('quota:u1',JSON.stringify({tier:'pay_as_you_go',credits:1}));
 await redis.eval(REGISTER_UPLOADED_PHOTO_SCRIPT,[receiptKey,'upload:cleanup'],[JSON.stringify({userId:'u1',imageKey:source,createdAt:'2026-10-01T00:00:00.000Z'}),String(Date.parse('2026-10-01T00:00:00.000Z')),source]);
});
const create=()=>{
 const task=buildTask('u1',source,'high','restore',now);
 return redis.eval(AUTHENTICATED_CREATE_SCRIPT,['quota:u1',`task:${task.id}`,'user:u1:tasks','queue:tasks','task:create:digest',receiptKey,'upload:cleanup'],[task.id,JSON.stringify(task),String(now.getTime()),String(now.getTime()),'pay_as_you_go',now.toISOString(),'create']);
};
const cleanup=()=>redis.eval(CLAIM_UPLOAD_CLEANUP_SCRIPT,[receiptKey,'upload:cleanup'],[source,String(Date.parse('2026-10-03T00:00:00.000Z')),'2026-10-03T00:00:00.000Z']);
it('a paid task pins the original before temporary cleanup can delete it',async()=>{
 expect(await create()).toEqual(['CREATED',expect.any(String),'0']);
 expect(await cleanup()).toEqual(['SKIPPED','PINNED_OR_REMOVED']);
 expect(redis.sortedMembers('queue:tasks')).toHaveLength(1);
});
it('cleanup winning the race refuses creation without consuming the last credit',async()=>{
 expect(await cleanup()).toEqual(['CLAIMED','2026-10-01T00:00:00.000Z']);
 expect(await create()).toEqual(['REJECTED','UPLOAD_UNAVAILABLE','0']);
 expect(JSON.parse(redis.getString('quota:u1')!).credits).toBe(1);
 expect(redis.sortedMembers('queue:tasks')).toEqual([]);
});
