import { isUploadOwned, registerUploadedPhoto } from '@/lib/upload-receipt';
const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue('OK');
jest.mock('@/lib/redis', () => ({getRedisClient: () => ({get: mockGet, set: mockSet})}));
beforeEach(() => { mockGet.mockReset(); mockSet.mockClear(); });
it('binds a signed upload to its account even when a visitor cookie is shared', async () => {
  mockGet.mockResolvedValue({imageKey:'photo',userId:'owner',visitorId:'browser'});
  expect(await isUploadOwned('photo',{userId:'other',visitorId:'browser'})).toBe(false);
  expect(await isUploadOwned('photo',{userId:'owner'})).toBe(true);
});
it('lets a guest resume its upload after signing in on the same browser', async () => {
  mockGet.mockResolvedValue({imageKey:'photo',visitorId:'browser'});
  expect(await isUploadOwned('photo',{userId:'new-account',visitorId:'browser'})).toBe(true);
  expect(await isUploadOwned('photo',{userId:'new-account',visitorId:'other'})).toBe(false);
});
it('rejects missing, expired, or mismatched upload receipts', async () => {
  mockGet.mockResolvedValue(null);
  expect(await isUploadOwned('photo',{userId:'owner'})).toBe(false);
  mockGet.mockResolvedValue({imageKey:'other',userId:'owner'});
  expect(await isUploadOwned('photo',{userId:'owner'})).toBe(false);
});
it('registers a bounded receipt without overwriting the original owner', async () => {
  await registerUploadedPhoto('photo',{userId:'owner',visitorId:'browser'});
  expect(mockSet).toHaveBeenCalledWith(expect.stringMatching(/^upload:receipt:[a-f0-9]{64}$/),expect.objectContaining({imageKey:'photo',userId:'owner'}),{ex:604800,nx:true});
  await expect(registerUploadedPhoto('photo',{})).rejects.toThrow('Upload owner is required');
});
