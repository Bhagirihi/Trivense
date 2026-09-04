import { isValidEmail } from "../../src/utils/validation";

describe("Validation module", () => {
  it("accepts valid email addresses", () => {
    expect(isValidEmail("user@trivense.app")).toBe(true);
    expect(isValidEmail("test.user+tag@example.co.in")).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@missing.com")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(isValidEmail("  user@trivense.app  ")).toBe(true);
  });
});
