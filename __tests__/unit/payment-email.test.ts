import { sendPaymentEmail } from "@/lib/email";
const fetchMock = jest.fn();
const originalFetch = global.fetch;
const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.RESEND_FROM_EMAIL;
beforeEach(() => {
  jest.resetAllMocks();
  process.env.RESEND_API_KEY = "test-key-never-sent";
  process.env.RESEND_FROM_EMAIL = "test@example.com";
  global.fetch = fetchMock.mockResolvedValue({ ok: true });
});
afterAll(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL; else process.env.RESEND_FROM_EMAIL = originalFrom;
});
it("describes a single result unlock without claiming credits or a Professional subscription", async () => {
  await sendPaymentEmail({ to: "recipient@example.com", type: "payment_success", plan: "single_photo" });
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.html).toContain("Single Result Unlock");
  expect(body.html).toContain("photos and any video included in this result");
  expect(body.html).not.toMatch(/single_photo|credits|Professional/);
  expect(body.to).toEqual(["recipient@example.com"]);
});
it("uses a readable single-result label in a payment failure email", async () => {
  await sendPaymentEmail({ to: "recipient@example.com", type: "payment_failed", plan: "single_photo" });
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.html).toContain("Single Result Unlock");
  expect(body.html).not.toContain("single_photo");
});
it("preserves existing credit-pack success wording", async () => {
  await sendPaymentEmail({ to: "recipient@example.com", type: "payment_success", plan: "starter_pack" });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).html).toContain("Your Starter Pack access has been activated");
});

it("confirms a prepaid processing order without promising a finished download or floating credits", async () => {
  await sendPaymentEmail({ to: "recipient@example.com", type: "payment_success", plan: "single_run" });
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.html).toContain("Single Photo Processing");
  expect(body.html).toContain("submitted for processing");
  expect(body.html).not.toMatch(/single_run|credits|Professional|you can now download/);
});
