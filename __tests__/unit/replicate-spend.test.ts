import {
  assertAndReserveReplicateSpend,
  getReplicateMonthlySpendLimitUsd,
  ReplicateSpendLimitError,
} from "@/lib/replicate-spend";

const incrbyfloat = jest.fn();
const expire = jest.fn();

jest.mock("@/lib/redis", () => ({
  getRedisClient: () => ({
    incrbyfloat,
    expire,
  }),
}));

beforeEach(() => {
  incrbyfloat.mockReset();
  expire.mockReset();
  process.env.REPLICATE_SPEND_GUARD_ENABLED = "true";
  process.env.REPLICATE_MONTHLY_SPEND_LIMIT_USD = "50";
});

describe("getReplicateMonthlySpendLimitUsd", () => {
  it("defaults to 50", () => {
    delete process.env.REPLICATE_MONTHLY_SPEND_LIMIT_USD;
    expect(getReplicateMonthlySpendLimitUsd()).toBe(50);
  });
});

describe("assertAndReserveReplicateSpend", () => {
  it("reserves estimated spend under the limit", async () => {
    incrbyfloat.mockResolvedValueOnce(0.15);
    expire.mockResolvedValueOnce(1);

    await expect(
      assertAndReserveReplicateSpend("animationFree")
    ).resolves.toBeUndefined();

    expect(incrbyfloat).toHaveBeenCalledWith(
      expect.stringMatching(/^replicate:spend:\d{4}-\d{2}$/),
      0.15
    );
    expect(expire).toHaveBeenCalled();
  });

  it("rolls back and throws when over the monthly limit", async () => {
    incrbyfloat
      .mockResolvedValueOnce(50.15)
      .mockResolvedValueOnce(50);
    expire.mockResolvedValueOnce(1);

    await expect(
      assertAndReserveReplicateSpend("animationFree")
    ).rejects.toBeInstanceOf(ReplicateSpendLimitError);

    expect(incrbyfloat).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      -0.15
    );
  });

  it("skips when guard is disabled", async () => {
    process.env.REPLICATE_SPEND_GUARD_ENABLED = "false";
    await assertAndReserveReplicateSpend("restoration");
    expect(incrbyfloat).not.toHaveBeenCalled();
  });
});
