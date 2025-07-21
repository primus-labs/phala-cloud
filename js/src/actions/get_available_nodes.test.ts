import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createClient } from "../client";
import {
  getAvailableNodes,
  safeGetAvailableNodes,
  type AvailableNodes,
  AvailableNodesSchema,
} from "./get_available_nodes";

// Mock response data matching the API structure
const mockAvailableNodesData: AvailableNodes = {
  tier: "free",
  capacity: {
    max_instances: 16,
    max_vcpu: 16,
    max_memory: 32768,
    max_disk: 640,
  },
  nodes: [
    {
      teepod_id: 1,
      name: "teepod-1",
      listed: true,
      resource_score: 0.8,
      remaining_vcpu: 8,
      remaining_memory: 16000,
      remaining_cvm_slots: 4,
      images: [
        {
          name: "ubuntu",
          is_dev: false,
          version: [1, 0, 0],
          os_image_hash: null,
        },
      ],
      dedicated_for_team_id: null,
      support_onchain_kms: false,
      fmspc: null,
      device_id: null,
      slug: "teepod-1",
    },
  ],
  kms_list: [
    {
      id: "kms_1",
      slug: "kms_1",
      url: "https://kms.example.com",
      version: "1.0.0",
      chain_id: 1,
      kms_contract_address: "0xabc",
      // @ts-expect-error
      gateway_app_id: null,
    },
  ],
};

describe("getAvailableNodes", () => {
  let mockClient: ReturnType<typeof createClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockClient = {
      get: vi.fn(),
      safeGet: vi.fn(),
    } as unknown as ReturnType<typeof createClient>;
  });

  describe("getAvailableNodes", () => {
    it("should return data successfully", async () => {
      // @ts-expect-error
      mockClient.get.mockResolvedValueOnce(mockAvailableNodesData);
      const result = await getAvailableNodes(mockClient);
      expect(result).toEqual(mockAvailableNodesData);
    });

    it("should validate response data with zod schema", async () => {
      // @ts-expect-error
      mockClient.get.mockResolvedValueOnce(mockAvailableNodesData);
      const result = await getAvailableNodes(mockClient);
      expect(AvailableNodesSchema.parse(result)).toEqual(mockAvailableNodesData);
    });

    it("should handle API errors properly", async () => {
      // @ts-expect-error
      mockClient.get.mockRejectedValueOnce(new Error("API error"));
      await expect(getAvailableNodes(mockClient)).rejects.toThrow("API error");
    });

    it("should return raw data when schema is false", async () => {
      // @ts-expect-error
      mockClient.get.mockResolvedValueOnce(mockAvailableNodesData);
      const result = await getAvailableNodes(mockClient, { schema: false });
      expect(result).toEqual(mockAvailableNodesData);
    });

    it("should use custom schema when provided", async () => {
      // @ts-expect-error
      mockClient.get.mockResolvedValueOnce({ tier: "free" });
      const customSchema = z.object({ tier: z.string() });
      const result = await getAvailableNodes(mockClient, { schema: customSchema });
      expect(result).toEqual({ tier: "free" });
    });

    it("should throw when custom schema validation fails", async () => {
      // @ts-expect-error
      mockClient.get.mockResolvedValueOnce({ foo: "bar" });
      const customSchema = z.object({ tier: z.string() });
      await expect(getAvailableNodes(mockClient, { schema: customSchema })).rejects.toThrow();
    });
  });

  describe("safeGetAvailableNodes", () => {
    it("should return success result when API call succeeds", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: true, data: mockAvailableNodesData });
      const result = await safeGetAvailableNodes(mockClient);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAvailableNodesData);
      }
    });

    it("should return error result when API call fails", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: false, error: { isRequestError: true, status: 500, message: "fail" } });
      const result = await safeGetAvailableNodes(mockClient);
      expect(result.success).toBe(false);
      if (!result.success) {
        if ("isRequestError" in result.error) {
          expect(result.error.isRequestError).toBe(true);
        }
      }
    });

    it("should handle zod validation errors", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: true, data: { foo: "bar" } });
      const result = await safeGetAvailableNodes(mockClient);
      expect(result.success).toBe(false);
      if (!result.success) {
        if (!("isRequestError" in result.error)) {
          expect(result.error.issues).toBeDefined();
        }
      }
    });

    it("should pass through HTTP errors directly", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: false, error: { isRequestError: true, status: 400, message: "bad request" } });
      const result = await safeGetAvailableNodes(mockClient);
      expect(result.success).toBe(false);
      if (!result.success) {
        if ("isRequestError" in result.error) {
          expect(result.error.status).toBe(400);
        }
      }
    });

    it("should return raw data when schema is false", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: true, data: mockAvailableNodesData });
      const result = await safeGetAvailableNodes(mockClient, { schema: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAvailableNodesData);
      }
    });

    it("should use custom schema when provided", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: true, data: { tier: "free" } });
      const customSchema = z.object({ tier: z.string() });
      const result = await safeGetAvailableNodes(mockClient, { schema: customSchema });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ tier: "free" });
      }
    });

    it("should return validation error when custom schema fails", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: true, data: { foo: "bar" } });
      const customSchema = z.object({ tier: z.string() });
      const result = await safeGetAvailableNodes(mockClient, { schema: customSchema });
      expect(result.success).toBe(false);
      if (!result.success) {
        if (!("isRequestError" in result.error)) {
          expect(result.error.issues).toBeDefined();
        }
      }
    });
  });

  describe("parameter handling", () => {
    it("should work without parameters", async () => {
      // @ts-expect-error
      mockClient.get.mockResolvedValueOnce(mockAvailableNodesData);
      await expect(getAvailableNodes(mockClient)).resolves.toBeDefined();
    });
    it("should work with empty parameters object", async () => {
      // @ts-expect-error
      mockClient.get.mockResolvedValueOnce(mockAvailableNodesData);
      await expect(getAvailableNodes(mockClient, {})).resolves.toBeDefined();
    });
    it("should work with safe version without parameters", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: true, data: mockAvailableNodesData });
      await expect(safeGetAvailableNodes(mockClient)).resolves.toBeDefined();
    });
    it("should work with safe version with empty parameters object", async () => {
      // @ts-expect-error
      mockClient.safeGet.mockResolvedValueOnce({ success: true, data: mockAvailableNodesData });
      await expect(safeGetAvailableNodes(mockClient, {})).resolves.toBeDefined();
    });
  });

  describe("schema flexibility", () => {
    it("should allow extra fields in API response for forward compatibility", async () => {
      const extra = { ...mockAvailableNodesData, extra_field: "extra" };
      // @ts-expect-error
      mockClient.get.mockResolvedValueOnce(extra);
      const result = await getAvailableNodes(mockClient);
      expect(result).toMatchObject({ ...mockAvailableNodesData, extra_field: "extra" });
    });
  });

  describe("type inference", () => {
    it("should infer AvailableNodes type when no schema provided", async () => {
      type T = Awaited<ReturnType<typeof getAvailableNodes>>;
      type _Assert = T extends AvailableNodes ? true : false;
      const assert: _Assert = true;
      expect(assert).toBe(true);
    });

    it("should infer unknown type when schema is false", async () => {
      type T = Awaited<ReturnType<typeof getAvailableNodes<false>>>;
      type _Assert = T extends unknown ? true : false;
      const assert: _Assert = true;
      expect(assert).toBe(true);
    });

    it("should infer custom schema type when provided", async () => {
      const customSchema = z.object({ tier: z.string() });
      type T = Awaited<ReturnType<typeof getAvailableNodes<typeof customSchema>>>;
      type _Assert = T extends { tier: string } ? true : false;
      const assert: _Assert = true;
      expect(assert).toBe(true);
    });
  });

  describe("safe version type inference", () => {
    it("should infer SafeResult<AvailableNodes> when no schema provided", async () => {
      type T = Awaited<ReturnType<typeof safeGetAvailableNodes>>;
      type _Assert = T extends { success: true; data: AvailableNodes } | { success: false; error: any } ? true : false;
      const assert: _Assert = true;
      expect(assert).toBe(true);
    });

    it("should infer SafeResult<unknown> when schema is false", async () => {
      type T = Awaited<ReturnType<typeof safeGetAvailableNodes<false>>>;
      type _Assert = T extends { success: true; data: unknown } | { success: false; error: any } ? true : false;
      const assert: _Assert = true;
      expect(assert).toBe(true);
    });

    it("should infer custom type when custom schema provided", async () => {
      const customSchema = z.object({ tier: z.string() });
      type T = Awaited<ReturnType<typeof safeGetAvailableNodes<typeof customSchema>>>;
      type _Assert = T extends { success: true; data: { tier: string } } | { success: false; error: any } ? true : false;
      const assert: _Assert = true;
      expect(assert).toBe(true);
    });
  });
}); 