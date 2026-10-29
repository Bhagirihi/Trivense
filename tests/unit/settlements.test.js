import {
  computeBoardSettlements,
  fromPaise,
  toPaise,
} from "../../src/utils/settlements";

describe("settlements money math (integer paise)", () => {
  it("splits an even total with no remainder", () => {
    const result = computeBoardSettlements({
      members: [
        { id: "a", name: "Asha" },
        { id: "b", name: "Bina" },
        { id: "c", name: "Chetan" },
      ],
      expenses: [{ created_by: "a", amount: 300 }],
    });
    expect(result.totalExpenses).toBe(300);
    expect(result.settlements).toEqual([
      expect.objectContaining({ from: "Bina", to: "Asha", amount: 100 }),
      expect.objectContaining({ from: "Chetan", to: "Asha", amount: 100 }),
    ]);
    // Settlements exactly cover what debtors owe — no paise lost.
    const settled = result.settlements.reduce((s, x) => s + x.amountPaise, 0);
    expect(settled).toBe(20000);
  });

  it("distributes a 1-paise remainder exactly, never by float", () => {
    // ₹10 split 3 ways: fair shares are 334 / 333 / 333 paise.
    const result = computeBoardSettlements({
      members: [
        { id: "a", name: "Asha" },
        { id: "b", name: "Bina" },
        { id: "c", name: "Chetan" },
      ],
      expenses: [{ created_by: "a", amount: 10 }],
    });
    expect(result.participants.map((p) => p.fairSharePaise)).toEqual([
      334, 333, 333,
    ]);
    expect(
      result.participants.reduce((s, p) => s + p.fairSharePaise, 0)
    ).toBe(1000);
    expect(
      result.participants.reduce((s, p) => s + p.balancePaise, 0)
    ).toBe(0);
    // Bina owes 333, Chetan owes 333 — together exactly Asha's 666 credit.
    expect(result.settlements.map((s) => s.amount)).toEqual([3.33, 3.33]);
  });

  it("does not drift on classic float amounts (19.99 + 0.01)", () => {
    const result = computeBoardSettlements({
      members: [
        { id: "a", name: "Asha" },
        { id: "b", name: "Bina" },
      ],
      expenses: [
        { created_by: "a", amount: 19.99 },
        { created_by: "b", amount: 0.01 },
      ],
    });
    expect(result.totalExpenses).toBe(20);
    expect(result.settlements).toEqual([
      expect.objectContaining({ from: "Bina", to: "Asha", amount: 9.99 }),
    ]);
  });

  it("handles a multi-creditor chain and a member who spent nothing", () => {
    const result = computeBoardSettlements({
      members: [
        { id: "a", name: "Asha" },
        { id: "b", name: "Bina" },
        { id: "c", name: "Chetan" },
        { id: "d", name: "Deep" },
      ],
      expenses: [
        { created_by: "a", amount: 400 },
        { created_by: "b", amount: 200 },
      ],
    });
    // Total 600, fair 150 each: Chetan and Deep each owe 150.
    expect(result.settlements.map((s) => s.amount).sort()).toEqual([
      50, 100, 150,
    ]);
    const settled = result.settlements.reduce((s, x) => s + x.amountPaise, 0);
    expect(settled).toBe(30000);
    expect(result.settlements.every((s) => s.amountPaise > 0)).toBe(true);
  });

  it("counts expenses from a creator who is not in the member list", () => {
    const result = computeBoardSettlements({
      members: [{ id: "a", name: "Asha" }],
      expenses: [
        { created_by: "a", amount: 100 },
        { created_by: "outsider", amount: 100 },
      ],
    });
    expect(result.totalExpenses).toBe(200);
    expect(result.participants.map((p) => p.id)).toEqual(["a", "outsider"]);
    expect(
      result.participants.reduce((s, p) => s + p.spentPaise, 0)
    ).toBe(result.totalPaise);
  });

  it("returns empty settlements when nobody spent anything", () => {
    const result = computeBoardSettlements({
      members: [
        { id: "a", name: "Asha" },
        { id: "b", name: "Bina" },
      ],
      expenses: [],
    });
    expect(result.totalExpenses).toBe(0);
    expect(result.settlements).toEqual([]);
  });

  it("rejects negative, NaN and non-numeric amounts instead of warping balances", () => {
    const members = [{ id: "a", name: "Asha" }];
    expect(() =>
      computeBoardSettlements({ members, expenses: [{ created_by: "a", amount: -5 }] })
    ).toThrow(/Invalid expense amount/);
    expect(() =>
      computeBoardSettlements({ members, expenses: [{ created_by: "a", amount: NaN }] })
    ).toThrow(/Invalid expense amount/);
    expect(() =>
      computeBoardSettlements({ members, expenses: [{ created_by: "a", amount: "abc" }] })
    ).toThrow(/Invalid expense amount/);
  });

  it("converts paise without float drift", () => {
    expect(toPaise(19.99)).toBe(1999);
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(fromPaise(1999)).toBe(19.99);
  });
});
