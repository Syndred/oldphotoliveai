import { isUploadOwned, registerUploadedPhoto } from '@/lib/upload-receipt';
const mockGet = jest.fn();
const mockEval = jest.fn().mockResolvedValue('REGISTERED');
jest.mock('@/lib/redis', () => ({getRedisClient: () => ({get: mockGet, eval: mockEval})}));
beforeEach(() => { mockGet.mockReset(); mockEval.mockReset().mockResolvedValue("REGISTERED"); });
it('binds a signed upload to its account even when a visitor cookie is shared', async () => {
  mockGet.mockResolvedValue({createdAt:new Date().toISOString(),imageKey:'photo',userId:'owner',visitorId:'browser'});
  expect(await isUploadOwned('photo',{userId:'other',visitorId:'browser'})).toBe(false);
  expect(await isUploadOwned('photo',{userId:'owner'})).toBe(true);
});
it('lets a guest resume its upload after signing in on the same browser', async () => {
  mockGet.mockResolvedValue({createdAt:new Date().toISOString(),imageKey:'photo',visitorId:'browser'});
  expect(await isUploadOwned('photo',{userId:'new-account',visitorId:'browser'})).toBe(true);
  expect(await isUploadOwned('photo',{userId:'new-account',visitorId:'other'})).toBe(false);
});
it('rejects missing, expired, or mismatched upload receipts', async () => {
  mockGet.mockResolvedValue(null);
  expect(await isUploadOwned('photo',{userId:'owner'})).toBe(false);
  mockGet.mockResolvedValue({createdAt:new Date().toISOString(),imageKey:'other',userId:'owner'});
  expect(await isUploadOwned('photo',{userId:'owner'})).toBe(false);
});
it('registers a bounded receipt without overwriting the original owner', async () => {
  await registerUploadedPhoto('photo',{userId:'owner',visitorId:'browser'});
  expect(mockEval.mock.calls[0][1]).toEqual([expect.stringMatching(/^upload:receipt:[a-f0-9]{64}$/),"upload:cleanup"]);
  expect(JSON.parse(mockEval.mock.calls[0][2][0])).toMatchObject({imageKey:"photo",userId:"owner"});
  await expect(registerUploadedPhoto('photo',{})).rejects.toThrow('Upload owner is required');
});

it('denies a source claimed for cleanup before task creation', async () => {
  mockGet.mockResolvedValue({imageKey:'photo',userId:'owner',createdAt:new Date().toISOString(),cleanupPending:true});
  expect(await isUploadOwned('photo',{userId:'owner'})).toBe(false);
});
