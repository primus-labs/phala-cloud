import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateActionParameters, safeValidateActionParameters } from "./validate-parameters";

describe("validateActionParameters", () => {
  it("should not throw for valid schema", () => {
    const schema = z.object({ id: z.string() });
    expect(() => validateActionParameters({ schema })).not.toThrow();
  });

  it("should not throw for false schema", () => {
    expect(() => validateActionParameters({ schema: false })).not.toThrow();
  });

  it("should not throw for undefined schema", () => {
    expect(() => validateActionParameters()).not.toThrow();
    expect(() => validateActionParameters({})).not.toThrow();
    expect(() => validateActionParameters({ schema: undefined })).not.toThrow();
  });

  it("should throw for invalid schema types", () => {
    // @ts-expect-error - Testing runtime behavior
    expect(() => validateActionParameters({ schema: "invalid" })).toThrow("Invalid schema");
    
    // @ts-expect-error - Testing runtime behavior
    expect(() => validateActionParameters({ schema: 123 })).toThrow("Invalid schema");
    
    // @ts-expect-error - Testing runtime behavior
    expect(() => validateActionParameters({ schema: {} })).toThrow("Invalid schema");
    
    // @ts-expect-error - Testing runtime behavior
    expect(() => validateActionParameters({ schema: null })).toThrow("Invalid schema");
  });
});

describe("safeValidateActionParameters", () => {
  it("should return undefined for valid schema", () => {
    const schema = z.object({ id: z.string() });
    const result = safeValidateActionParameters({ schema });
    expect(result).toBeUndefined();
  });

  it("should return undefined for false schema", () => {
    const result = safeValidateActionParameters({ schema: false });
    expect(result).toBeUndefined();
  });

  it("should return undefined for undefined schema", () => {
    expect(safeValidateActionParameters()).toBeUndefined();
    expect(safeValidateActionParameters({})).toBeUndefined();
    expect(safeValidateActionParameters({ schema: undefined })).toBeUndefined();
  });

  it("should return error for invalid schema types", () => {
    // @ts-expect-error - Testing runtime behavior
    const result1 = safeValidateActionParameters({ schema: "invalid" });
    expect(result1?.success).toBe(false);
    if (!result1?.success) {
      expect(result1.error.message).toBe("Invalid schema: must be a Zod schema object, false, or undefined");
      expect(result1.error.issues[0].code).toBe("invalid_type");
    }

    // @ts-expect-error - Testing runtime behavior
    const result2 = safeValidateActionParameters({ schema: 123 });
    expect(result2?.success).toBe(false);
    if (!result2?.success) {
      expect(result2.error.issues[0].received).toBe("number");
    }

    // @ts-expect-error - Testing runtime behavior
    const result3 = safeValidateActionParameters({ schema: {} });
    expect(result3?.success).toBe(false);

    // @ts-expect-error - Testing runtime behavior
    const result4 = safeValidateActionParameters({ schema: null });
    expect(result4?.success).toBe(false);
  });

  it("should handle different schema types correctly", () => {
    // Valid Zod schemas
    const stringSchema = z.string();
    const objectSchema = z.object({ name: z.string() });
    const arraySchema = z.array(z.number());
    
    expect(safeValidateActionParameters({ schema: stringSchema })).toBeUndefined();
    expect(safeValidateActionParameters({ schema: objectSchema })).toBeUndefined();
    expect(safeValidateActionParameters({ schema: arraySchema })).toBeUndefined();
  });
});
