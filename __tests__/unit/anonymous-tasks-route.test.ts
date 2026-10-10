import { NextRequest } from "next/server";
import { POST } from "@/app/api/anonymous-tasks/route";
const mockCreate = jest.fn();
jest.mock("@/lib/task-creation", () => ({createAnonymousTaskAtomic: mockCreate}));
it.each([{}, {imageKey:"tasks/photo/original.jpg"}, {imageKey:"https://example.com/photo.jpg"}])("older anonymous clients cannot queue a free task %#", async body => {
  const res = await POST(new NextRequest("http://localhost/api/anonymous-tasks",{method:"POST",body:JSON.stringify(body)}));
  expect(res.status).toBe(402);
  expect(await res.json()).toMatchObject({code:"PAYMENT_REQUIRED",allowanceConsumed:false});
  expect(mockCreate).not.toHaveBeenCalled();
});
