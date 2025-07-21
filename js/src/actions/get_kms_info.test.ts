import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createClient } from "../client";
import {
  getKmsInfo,
  safeGetKmsInfo,
  type GetKmsInfoParameters,
  type GetKmsInfoReturnType,
} from "./get_kms_info";
import type { KmsInfo } from "../types/kms_info";

// Mock response data matching the API structure
const mockKmsInfoData: KmsInfo = {
  id: "kms-123",
  slug: "test-kms",
  url: "https://kms.example.com",
  version: "1.0.0",
  chain_id: 1,
  kms_contract_address: "0x1234567890123456789012345678901234567890" as any,
  gateway_app_id: "0x123456789abcdef" as any,
};

describe("getKmsInfo", () => {
  let client: ReturnType<typeof createClient>;
  let mockSafeGet: any;

  beforeEach(() => {
    client = createClient({
      apiKey: "test-api-key",
      baseURL: "https://api.test.com",
    });
    mockSafeGet = vi.spyOn(client, "safeGet");
  });

  describe("getKmsInfo", () => {
    it("should return KMS info data successfully", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsInfoData,
      });

      const result = await getKmsInfo(client, "test-kms-id");

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/test-kms-id");
      expect(result).toEqual(mockKmsInfoData);
      expect((result as KmsInfo).id).toBe("kms-123");
      expect((result as KmsInfo).url).toBe("https://kms.example.com");
    });

    it("should handle different KMS IDs correctly", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsInfoData,
      });

      await getKmsInfo(client, "another-kms-id");

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/another-kms-id");
    });

    it("should validate response data with zod schema", async () => {
      const invalidData = {
        id: 123, // should be string
        url: null, // should be string
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(getKmsInfo(client, "test-kms-id")).rejects.toThrow();
    });

    it("should handle API errors properly", async () => {
      const apiError = new Error("KMS not found");
      mockSafeGet.mockResolvedValue({
        success: false,
        error: apiError,
      });

      await expect(getKmsInfo(client, "nonexistent-kms")).rejects.toThrow("KMS not found");
    });

    it("should return raw data when schema is false", async () => {
      const rawData = { some: "raw", data: 123 };
      mockSafeGet.mockResolvedValue({
        success: true,
        data: rawData,
      });

      const result = await getKmsInfo(client, "test-kms-id", { schema: false });

      expect(result).toEqual(rawData);
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        id: z.string(),
        custom_field: z.string(),
      });
      const customData = { id: "test-id", custom_field: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await getKmsInfo(client, "test-kms-id", { schema: customSchema });

      expect(result).toEqual(customData);
    });

    it("should throw when custom schema validation fails", async () => {
      const customSchema = z.object({
        id: z.string(),
        custom_field: z.string(),
      });
      const invalidData = { id: 123, custom_field: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(getKmsInfo(client, "test-kms-id", { schema: customSchema })).rejects.toThrow();
    });

    it("should handle KMS with null optional fields", async () => {
      const kmsWithNulls: KmsInfo = {
        id: "kms-123",
        slug: null,
        url: "https://kms.example.com",
        version: "1.0.0",
        chain_id: null,
        kms_contract_address: null,
        gateway_app_id: null,
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: kmsWithNulls,
      });

      const result = await getKmsInfo(client, "test-kms-id");

      expect(result).toEqual(kmsWithNulls);
      expect((result as KmsInfo).slug).toBeNull();
      expect((result as KmsInfo).chain_id).toBeNull();
    });

    it("should handle KMS with passthrough fields", async () => {
      const kmsWithExtra = {
        ...mockKmsInfoData,
        extra_field: "extra_value",
        another_field: 123,
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: kmsWithExtra,
      });

      const result = await getKmsInfo(client, "test-kms-id");

      expect(result).toEqual(kmsWithExtra);
      expect((result as any).extra_field).toBe("extra_value");
    });
  });

  describe("safeGetKmsInfo", () => {
    it("should return success result when API call succeeds", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsInfoData,
      });

      const result = await safeGetKmsInfo(client, "test-kms-id");

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/test-kms-id");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockKmsInfoData);
        expect((result.data as KmsInfo).id).toBe("kms-123");
      }
    });

    it("should return error result when API call fails", async () => {
      const apiError = {
        success: false,
        error: {
          name: "RequestError",
          message: "KMS not found",
          detail: "KMS not found",
          isRequestError: true,
          status: 404,
        },
      } as const;

      mockSafeGet.mockResolvedValue(apiError);

      const result = await safeGetKmsInfo(client, "nonexistent-kms");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("KMS not found");
        if ("isRequestError" in result.error) {
          expect(result.error.isRequestError).toBe(true);
          expect(result.error.status).toBe(404);
        }
      }
    });

    it("should handle zod validation errors", async () => {
      const invalidData = {
        id: 123, // should be string
        url: null, // should be string
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetKmsInfo(client, "test-kms-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        if (!("isRequestError" in result.error)) {
          expect(result.error.issues).toBeDefined();
        }
      }
    });

    it("should pass through HTTP errors directly", async () => {
      mockSafeGet.mockResolvedValue({
        success: false,
        error: {
          isRequestError: true,
          status: 500,
          message: "internal server error",
        },
      });

      const result = await safeGetKmsInfo(client, "test-kms-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        if ("isRequestError" in result.error) {
          expect(result.error.status).toBe(500);
        }
      }
    });

    it("should return raw data when schema is false", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsInfoData,
      });

      const result = await safeGetKmsInfo(client, "test-kms-id", { schema: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockKmsInfoData);
      }
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        id: z.string(),
        custom_field: z.string(),
      });
      const customData = { id: "test-id", custom_field: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await safeGetKmsInfo(client, "test-kms-id", { schema: customSchema });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(customData);
      }
    });

    it("should return validation error when custom schema fails", async () => {
      const customSchema = z.object({
        id: z.string(),
        custom_field: z.string(),
      });
      const invalidData = { id: 123, custom_field: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetKmsInfo(client, "test-kms-id", { schema: customSchema });

      expect(result.success).toBe(false);
      if (!result.success) {
        if (!("isRequestError" in result.error)) {
          expect(result.error.issues).toBeDefined();
        }
      }
    });

    it("should handle different KMS IDs correctly in safe version", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsInfoData,
      });

      await safeGetKmsInfo(client, "special-kms-456");

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/special-kms-456");
    });

    it("should handle KMS with minimal data", async () => {
      const minimalKms: KmsInfo = {
        id: "minimal-kms",
        slug: null,
        url: "https://minimal.kms.com",
        version: "0.1.0",
        chain_id: null,
        kms_contract_address: null,
        gateway_app_id: null,
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: minimalKms,
      });

      const result = await safeGetKmsInfo(client, "minimal-kms");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalKms);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty string KMS ID", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsInfoData,
      });

      await getKmsInfo(client, "");

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/");
    });

    it("should handle KMS ID with special characters", async () => {
      const specialId = "kms-123_test.special-id";
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsInfoData,
      });

      await getKmsInfo(client, specialId);

      expect(mockSafeGet).toHaveBeenCalledWith(`/kms/${specialId}`);
    });

    it("should handle very long KMS IDs", async () => {
      const longId = "a".repeat(256);
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsInfoData,
      });

      await getKmsInfo(client, longId);

      expect(mockSafeGet).toHaveBeenCalledWith(`/kms/${longId}`);
    });
  });
}); 