import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createClient } from "../client";
import {
  getKmsList,
  safeGetKmsList,
  GetKmsListSchema,
  type GetKmsListResponse,
} from "./get_kms_list";
import type { KmsInfo } from "../types/kms_info";

// Mock response data matching the API structure
const mockKmsData: KmsInfo = {
  id: "kms-123",
  slug: "test-kms",
  url: "https://kms.example.com",
  version: "1.0.0",
  chain_id: 1,
  kms_contract_address: "0x1234567890123456789012345678901234567890" as any,
  gateway_app_id: "0x123456789abcdef" as any,
};

const mockKmsListData = {
  items: [mockKmsData],
  total: 1,
  page: 1,
  page_size: 10,
  pages: 1,
};

describe("getKmsList", () => {
  let client: ReturnType<typeof createClient>;
  let mockSafeGet: any;

  beforeEach(() => {
    client = createClient({
      apiKey: "test-api-key",
      baseURL: "https://api.test.com",
    });
    mockSafeGet = vi.spyOn(client, "safeGet");
  });

  describe("getKmsList", () => {
    it("should return KMS list data successfully", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsListData,
      });

      const result = await getKmsList(client);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms");
      expect(result).toEqual(mockKmsListData);
      expect((result as any).items).toHaveLength(1);
      expect((result as any).total).toBe(1);
    });

    it("should validate response data with zod schema", async () => {
      const invalidData = {
        items: "invalid", // should be array
        total: "invalid", // should be number
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(getKmsList(client)).rejects.toThrow();
    });

    it("should handle API errors properly", async () => {
      const apiError = new Error("KMS service unavailable");
      mockSafeGet.mockResolvedValue({
        success: false,
        error: apiError,
      });

      await expect(getKmsList(client)).rejects.toThrow("KMS service unavailable");
    });

    it("should return raw data when schema is false", async () => {
      const rawData = { some: "raw", data: 123 };
      mockSafeGet.mockResolvedValue({
        success: true,
        data: rawData,
      });

      const result = await getKmsList(client, { schema: false });

      expect(result).toEqual(rawData);
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        custom: z.string(),
        items: z.array(z.object({ id: z.string() })),
      });
      const customData = { 
        custom: "test",
        items: [{ id: "kms-1" }],
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await getKmsList(client, { schema: customSchema });

      expect(result).toEqual(customData);
    });

    it("should throw when custom schema validation fails", async () => {
      const customSchema = z.object({
        custom: z.string(),
        items: z.array(z.object({ id: z.string() })),
      });
      const invalidData = { custom: 123, items: "invalid" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(getKmsList(client, { schema: customSchema })).rejects.toThrow();
    });

    it("should handle empty KMS list", async () => {
      const emptyList = {
        items: [],
        total: 0,
        page: 1,
        page_size: 10,
        pages: 0,
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: emptyList,
      });

      const result = await getKmsList(client);

      expect(result).toEqual(emptyList);
      expect((result as any).items).toHaveLength(0);
    });

    it("should handle multiple KMS instances", async () => {
      const multipleKmsData = {
        items: [
          mockKmsData,
          {
            ...mockKmsData,
            id: "kms-456",
            slug: "another-kms",
            url: "https://kms2.example.com",
          },
        ],
        total: 2,
        page: 1,
        page_size: 10,
        pages: 1,
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: multipleKmsData,
      });

      const result = await getKmsList(client);

      expect(result).toEqual(multipleKmsData);
      expect((result as any).items).toHaveLength(2);
    });
  });

  describe("safeGetKmsList", () => {
    it("should return success result when API call succeeds", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsListData,
      });

      const result = await safeGetKmsList(client);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockKmsListData);
        expect((result.data as any).items).toHaveLength(1);
      }
    });

    it("should return error result when API call fails", async () => {
      const apiError = {
        success: false,
        error: {
          name: "RequestError",
          message: "KMS service unavailable",
          detail: "KMS service unavailable",
          isRequestError: true,
          status: 503,
        },
      } as const;

      mockSafeGet.mockResolvedValue(apiError);

      const result = await safeGetKmsList(client);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("KMS service unavailable");
        if ("isRequestError" in result.error) {
          expect(result.error.isRequestError).toBe(true);
          expect(result.error.status).toBe(503);
        }
      }
    });

    it("should handle zod validation errors", async () => {
      const invalidData = {
        items: "invalid", // should be array
        total: "invalid", // should be number
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetKmsList(client);

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
          status: 401,
          message: "unauthorized",
        },
      });

      const result = await safeGetKmsList(client);

      expect(result.success).toBe(false);
      if (!result.success) {
        if ("isRequestError" in result.error) {
          expect(result.error.status).toBe(401);
        }
      }
    });

    it("should return raw data when schema is false", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsListData,
      });

      const result = await safeGetKmsList(client, { schema: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockKmsListData);
      }
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        custom: z.string(),
        items: z.array(z.object({ id: z.string() })),
      });
      const customData = { 
        custom: "test",
        items: [{ id: "kms-1" }],
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await safeGetKmsList(client, { schema: customSchema });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(customData);
      }
    });

    it("should return validation error when custom schema fails", async () => {
      const customSchema = z.object({
        custom: z.string(),
        items: z.array(z.object({ id: z.string() })),
      });
      const invalidData = { custom: 123, items: "invalid" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetKmsList(client, { schema: customSchema });

      expect(result.success).toBe(false);
      if (!result.success) {
        if (!("isRequestError" in result.error)) {
          expect(result.error.issues).toBeDefined();
        }
      }
    });

    it("should handle null values in KMS data", async () => {
      const kmsWithNulls = {
        items: [{
          id: "kms-123",
          slug: null,
          url: "https://kms.example.com",
          version: "1.0.0",
          chain_id: null,
          kms_contract_address: null,
          gateway_app_id: null,
        }],
        total: 1,
        page: 1,
        page_size: 10,
        pages: 1,
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: kmsWithNulls,
      });

      const result = await safeGetKmsList(client);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(kmsWithNulls);
      }
    });
  });

  describe("parameter handling", () => {
    it("should work without parameters", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsListData,
      });

      await expect(getKmsList(client)).resolves.toBeDefined();
      expect(mockSafeGet).toHaveBeenCalledWith("/kms");
    });

    it("should handle undefined parameters gracefully", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsListData,
      });

      await getKmsList(client, undefined);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms");
    });
  });
}); 