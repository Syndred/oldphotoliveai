/** @jest-environment jsdom */
import { clearPendingUpload, readPendingUpload, savePendingUpload } from "@/lib/pending-upload";

beforeEach(() => sessionStorage.clear());
it("preserves an upload through checkout only for the same account, page and workflow", () => {
  savePendingUpload({ userId: "owner", imageKey: "uploads/private.jpg", pathname: "/zh", workflow: "colorize" });
  expect(readPendingUpload("owner", "/zh", "colorize")?.imageKey).toBe("uploads/private.jpg");
  expect(readPendingUpload("other", "/zh", "colorize")).toBeNull();
  expect(readPendingUpload("owner", "/animate", "animate")).toBeNull();
  clearPendingUpload();
  expect(readPendingUpload("owner", "/zh", "colorize")).toBeNull();
});
it("expires stored uploads after one day and tolerates unavailable storage", () => {
  jest.spyOn(Date, "now").mockReturnValueOnce(100);
  savePendingUpload({ userId: "owner", imageKey: "uploads/a.jpg", pathname: "/", workflow: "full" });
  expect(readPendingUpload("owner", "/", "full")).toBeNull();
  jest.restoreAllMocks();
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
  expect(readPendingUpload("owner", "/", "full")).toBeNull();
  jest.restoreAllMocks();
});

it("adopts a guest upload once while preserving account isolation", () => {
  savePendingUpload({ userId: "", imageKey: "uploads/guest.jpg", pathname: "/animate", workflow: "animate" });
  expect(readPendingUpload("", "/animate", "animate")).toBeNull();
  expect(readPendingUpload("owner", "/animate", "restore")).toBeNull();
  expect(readPendingUpload("owner", "/animate", "animate")?.userId).toBe("owner");
  expect(readPendingUpload("other", "/animate", "animate")).toBeNull();
});
