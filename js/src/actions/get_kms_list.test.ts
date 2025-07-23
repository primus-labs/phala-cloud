import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createClient } from "../client";
import {
  getKmsList,
  safeGetKmsList,
  GetKmsListSchema,
  type GetKmsListResponse,
  type GetKmsListRequest,
  type GetKmsListParameters,
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
  let mockGet: any;
  let mockSafeGet: any;

  beforeEach(() => {
    client = createClient({
      apiKey: "test-api-key",
      baseURL: "https://api.test.com",
    });
    mockGet = vi.spyOn(client, "get");
    mockSafeGet = vi.spyOn(client, "safeGet");
  });

  describe("getKmsList", () => {
    it("should return KMS list data successfully", async () => {
      mockGet.mockResolvedValue(mockKmsListData);

      const result = await getKmsList(client);

      expect(mockGet).toHaveBeenCalledWith("/kms", { params: {} });
      expect(result).toEqual(mockKmsListData);
      expect((result as any).items).toHaveLength(1);
      expect((result as any).total).toBe(1);
    });

    it("should handle pagination parameters", async () => {
      mockGet.mockResolvedValue(mockKmsListData);

      await getKmsList(client, { page: 2, page_size: 20 });

      expect(mockGet).toHaveBeenCalledWith("/kms", { params: { page: 2, page_size: 20 } });
    });

    it("should validate pagination parameters", async () => {
      await expect(getKmsList(client, { page: 0 })).rejects.toThrow();
      await expect(getKmsList(client, { page_size: 0 })).rejects.toThrow();
      await expect(getKmsList(client, { page: -1 })).rejects.toThrow();
      await expect(getKmsList(client, { page_size: -1 })).rejects.toThrow();
      await expect(getKmsList(client, { page: 1.5 })).rejects.toThrow();
      await expect(getKmsList(client, { page_size: 1.5 })).rejects.toThrow();
    });

    it("should validate response data with zod schema", async () => {
      const invalidData = {
        items: "invalid", // should be array
        total: "invalid", // should be number
      };

      mockGet.mockResolvedValue(invalidData);

      await expect(getKmsList(client)).rejects.toThrow();
    });

    it("should handle API errors properly", async () => {
      const apiError = new Error("KMS service unavailable");
      mockGet.mockRejectedValue(apiError);

      await expect(getKmsList(client)).rejects.toThrow("KMS service unavailable");
    });

    it("should return raw data when schema is false", async () => {
      const rawData = { some: "raw", data: 123 };
      mockGet.mockResolvedValue(rawData);

      const result = await getKmsList(client, undefined, { schema: false });

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

      mockGet.mockResolvedValue(customData);

      const result = await getKmsList(client, undefined, { schema: customSchema });

      expect(result).toEqual(customData);
    });

    it("should throw when custom schema validation fails", async () => {
      const customSchema = z.object({
        custom: z.string(),
        items: z.array(z.object({ id: z.string() })),
      });
      const invalidData = { custom: 123, items: "invalid" };

      mockGet.mockResolvedValue(invalidData);

      await expect(getKmsList(client, undefined, { schema: customSchema })).rejects.toThrow();
    });

    it("should handle empty KMS list", async () => {
      const emptyList = {
        items: [],
        total: 0,
        page: 1,
        page_size: 10,
        pages: 0,
      };

      mockGet.mockResolvedValue(emptyList);

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

      mockGet.mockResolvedValue(multipleKmsData);

      const result = await getKmsList(client);

      expect(result).toEqual(multipleKmsData);
      expect((result as any).items).toHaveLength(2);
    });

    it("should enforce schema strictness", async () => {
      const dataWithExtraFields = {
        ...mockKmsListData,
        extraField: "should not be allowed",
      };

      mockGet.mockResolvedValue(dataWithExtraFields);

      await expect(getKmsList(client)).rejects.toThrow();
    });

    it("should enforce request schema strictness", async () => {
      // @ts-expect-error - Testing runtime behavior with invalid field
      await expect(getKmsList(client, { unknownField: "value" })).rejects.toThrow();
    });
  });

  describe("safeGetKmsList", () => {
    it("should return success result when API call succeeds", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsListData,
      });

      const result = await safeGetKmsList(client);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms", { params: {} });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockKmsListData);
        expect((result.data as any).items).toHaveLength(1);
      }
    });

    it("should handle pagination parameters in safe version", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsListData,
      });

      const result = await safeGetKmsList(client, { page: 2, page_size: 20 });

      expect(mockSafeGet).toHaveBeenCalledWith("/kms", { params: { page: 2, page_size: 20 } });
      expect(result.success).toBe(true);
    });

    it("should return validation error for invalid pagination parameters", async () => {
      const result = await safeGetKmsList(client, { page: 0 });
      expect(result.success).toBe(false);
      if (!result.success) {
        // @ts-expect-error - issues is not defined on RequestError
        expect(result.error.issues).toBeDefined();
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

      const result = await safeGetKmsList(client, undefined, { schema: false });

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

      const result = await safeGetKmsList(client, undefined, { schema: customSchema });

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

      const result = await safeGetKmsList(client, undefined, { schema: customSchema });

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

  describe("type inference", () => {
    it("should infer GetKmsListResponse type when no schema provided", async () => {
      mockGet.mockResolvedValue(mockKmsListData);
      
      const result = await getKmsList(client);
      
      // TypeScript should infer this as GetKmsListResponse
      expect(result.items[0].id).toBe("kms-123");
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(10);
      expect(result.pages).toBe(1);
    });

    it("should infer unknown type when schema is false", async () => {
      const rawResponse = { items: [], custom: "field" };
      mockGet.mockResolvedValue(rawResponse);
      
      const result = await getKmsList(client, undefined, { schema: false });
      
      // TypeScript should infer this as unknown
      expect(result).toEqual(rawResponse);
    });

    it("should infer custom schema type when provided", async () => {
      const customSchema = z.object({
        items: z.array(z.object({ id: z.number() })),
        meta: z.object({ total: z.number() }),
      });
      const customResponse = { items: [{ id: 1 }], meta: { total: 1 } };
      mockGet.mockResolvedValue(customResponse);
      
      const result = await getKmsList(client, undefined, { schema: customSchema });
      
      // TypeScript should infer this as { items: { id: number }[]; meta: { total: number } }
      expect(result.items[0].id).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it("should enforce parameter type safety", async () => {
      mockGet.mockResolvedValue(mockKmsListData);
      
      // @ts-expect-error - schema should be ZodSchema | false | undefined
      await expect(getKmsList(client, undefined, { schema: "invalid" })).rejects.toThrow("Invalid schema");
      
      // @ts-expect-error - unknown parameter
      await getKmsList(client, undefined, { unknownParam: true });
      
      // @ts-expect-error - page should be number
      await expect(getKmsList(client, { page: "1" })).rejects.toThrow();
      
      // @ts-expect-error - page_size should be number
      await expect(getKmsList(client, { page_size: "20" })).rejects.toThrow();
      
      // Valid parameters should compile
      const request: GetKmsListRequest = { page: 1, page_size: 20 };
      const params: GetKmsListParameters = {};
      await getKmsList(client, request, params);
      
      // Test with custom schema that expects id as number
      const customSchema = z.object({ items: z.array(z.object({ id: z.number() })) });
      const customData = { items: [{ id: 123 }] };
      mockGet.mockResolvedValueOnce(customData);
      const paramsWithSchema: GetKmsListParameters<typeof customSchema> = { schema: customSchema };
      await getKmsList(client, request, paramsWithSchema);
    });
  });

  describe("safe version type inference", () => {
    it("should infer SafeResult<GetKmsListResponse> when no schema provided", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockKmsListData,
      });
      
      const result = await safeGetKmsList(client);
      
      if (result.success) {
        // TypeScript should infer result.data as GetKmsListResponse
        expect(result.data.items[0].id).toBe("kms-123");
        expect(result.data.total).toBe(1);
        expect(result.data.page).toBe(1);
        expect(result.data.page_size).toBe(10);
        expect(result.data.pages).toBe(1);
      }
    });

    it("should infer SafeResult<unknown> when schema is false", async () => {
      const rawResponse = { items: [], custom: "field" };
      mockSafeGet.mockResolvedValue({
        success: true,
        data: rawResponse,
      });
      
      const result = await safeGetKmsList(client, undefined, { schema: false });
      
      if (result.success) {
        // TypeScript should infer result.data as unknown
        expect(result.data).toEqual(rawResponse);
      }
    });

    it("should infer custom type when custom schema provided", async () => {
      const customSchema = z.object({
        items: z.array(z.object({ id: z.number() })),
        meta: z.object({ total: z.number() }),
      });
      const customResponse = { items: [{ id: 1 }], meta: { total: 1 } };
      mockSafeGet.mockResolvedValue({
        success: true,
        data: customResponse,
      });
      
      const result = await safeGetKmsList(client, undefined, { schema: customSchema });
      
      if (result.success) {
        // TypeScript should infer result.data as { items: { id: number }[]; meta: { total: number } }
        expect(result.data.items[0].id).toBe(1);
        expect(result.data.meta.total).toBe(1);
      }
    });
  });

  describe("parameter handling", () => {
    it("should work without parameters", async () => {
      mockGet.mockResolvedValue(mockKmsListData);

      await expect(getKmsList(client)).resolves.toBeDefined();
      expect(mockGet).toHaveBeenCalledWith("/kms", { params: {} });
    });

    it("should handle undefined parameters gracefully", async () => {
      mockGet.mockResolvedValue(mockKmsListData);

      await getKmsList(client, undefined);

      expect(mockGet).toHaveBeenCalledWith("/kms", { params: {} });
    });

    it("should handle empty object parameters", async () => {
      mockGet.mockResolvedValue(mockKmsListData);

      await getKmsList(client, {});

      expect(mockGet).toHaveBeenCalledWith("/kms", { params: {} });
    });
  });
}); 