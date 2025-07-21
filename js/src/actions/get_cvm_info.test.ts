import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createClient } from "../client";
import {
  getCvmInfo,
  safeGetCvmInfo,
  GetCvmInfoSchema,
  type GetCvmInfoResponse,
} from "./get_cvm_info";
import type { CvmInfo } from "../types/cvm_info";

// Mock response data matching the API structure
const mockCvmInfoData: CvmInfo = {
  hosted: {
    id: "vm-123",
    name: "test-vm",
    status: "running",
    uptime: "24h",
    app_url: "https://app.example.com",
    app_id: "app-123",
    instance_id: "instance-123",
    configuration: {
      vcpu: 2,
      memory: 4096,
      disk_size: 40,
    },
    exited_at: null,
    boot_progress: null,
    boot_error: null,
    shutdown_progress: null,
    image_version: "1.0.0",
  },
  name: "test-cvm",
  managed_user: {
    id: 1,
    username: "testuser",
  },
  node: {
    id: 1,
    name: "test-node",
    region_identifier: "us-west-1",
  },
  listed: true,
  status: "running",
  in_progress: false,
  dapp_dashboard_url: "https://dashboard.example.com",
  syslog_endpoint: "https://syslog.example.com",
  allow_upgrade: true,
  project_id: "project-123",
  project_type: "webapp",
  billing_period: "monthly",
  kms_info: {
    id: "kms-123",
    slug: "test-kms",
    url: "https://kms.example.com",
    version: "1.0.0",
    chain_id: 1,
    kms_contract_address: "0x1234567890123456789012345678901234567890",
    gateway_app_id: "gateway-123",
  },
  vcpu: 2,
  memory: 4096,
  disk_size: 40,
  gateway_domain: "gateway.example.com",
  public_urls: [
    {
      app: "https://app.example.com",
      instance: "https://instance.example.com",
    },
  ],
};

describe("getCvmInfo", () => {
  let client: ReturnType<typeof createClient>;
  let mockSafeGet: any;

  beforeEach(() => {
    client = createClient({
      apiKey: "test-api-key",
      baseURL: "https://api.test.com",
    });
    mockSafeGet = vi.spyOn(client, "safeGet");
  });

  describe("getCvmInfo", () => {
    it("should return CVM info data successfully", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockCvmInfoData,
      });

      const result = await getCvmInfo(client, "test-cvm-id");

      expect(mockSafeGet).toHaveBeenCalledWith("/cvms/test-cvm-id");
      expect(result).toEqual(mockCvmInfoData);
      expect((result as CvmInfo).name).toBe("test-cvm");
      expect((result as CvmInfo).status).toBe("running");
    });

    it("should handle different CVM IDs correctly", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockCvmInfoData,
      });

      await getCvmInfo(client, "another-cvm-id");

      expect(mockSafeGet).toHaveBeenCalledWith("/cvms/another-cvm-id");
    });

    it("should validate response data with zod schema", async () => {
      const invalidData = {
        name: 123, // should be string
        status: null, // should be string
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(getCvmInfo(client, "test-cvm-id")).rejects.toThrow();
    });

    it("should handle API errors properly", async () => {
      const apiError = new Error("CVM not found");
      mockSafeGet.mockResolvedValue({
        success: false,
        error: apiError,
      });

      await expect(getCvmInfo(client, "nonexistent-cvm")).rejects.toThrow("CVM not found");
    });

    it("should return raw data when schema is false", async () => {
      const rawData = { some: "raw", data: 123 };
      mockSafeGet.mockResolvedValue({
        success: true,
        data: rawData,
      });

      const result = await getCvmInfo(client, "test-cvm-id", { schema: false });

      expect(result).toEqual(rawData);
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        id: z.string(),
        custom: z.string(),
      });
      const customData = { id: "test-id", custom: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await getCvmInfo(client, "test-cvm-id", { schema: customSchema });

      expect(result).toEqual(customData);
    });

    it("should throw when custom schema validation fails", async () => {
      const customSchema = z.object({
        id: z.string(),
        custom: z.string(),
      });
      const invalidData = { id: 123, custom: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(getCvmInfo(client, "test-cvm-id", { schema: customSchema })).rejects.toThrow();
    });

    it("should handle partial CVM data correctly", async () => {
      const partialData: Partial<CvmInfo> = {
        name: "minimal-cvm",
        status: "stopped",
        listed: false,
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: partialData,
      });

      const result = await getCvmInfo(client, "test-cvm-id");

      expect(result).toEqual(partialData);
      expect((result as CvmInfo).name).toBe("minimal-cvm");
    });
  });

  describe("safeGetCvmInfo", () => {
    it("should return success result when API call succeeds", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockCvmInfoData,
      });

      const result = await safeGetCvmInfo(client, "test-cvm-id");

      expect(mockSafeGet).toHaveBeenCalledWith("/cvms/test-cvm-id");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCvmInfoData);
        expect((result.data as CvmInfo).name).toBe("test-cvm");
      }
    });

    it("should return error result when API call fails", async () => {
      const apiError = {
        success: false,
        error: {
          name: "RequestError",
          message: "CVM not found",
          detail: "CVM not found",
          isRequestError: true,
          status: 404,
        },
      } as const;

      mockSafeGet.mockResolvedValue(apiError);

      const result = await safeGetCvmInfo(client, "nonexistent-cvm");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("CVM not found");
        if ("isRequestError" in result.error) {
          expect(result.error.isRequestError).toBe(true);
          expect(result.error.status).toBe(404);
        }
      }
    });

    it("should handle zod validation errors", async () => {
      const invalidData = {
        name: 123, // should be string
        status: null, // should be string
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetCvmInfo(client, "test-cvm-id");

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

      const result = await safeGetCvmInfo(client, "test-cvm-id");

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
        data: mockCvmInfoData,
      });

      const result = await safeGetCvmInfo(client, "test-cvm-id", { schema: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCvmInfoData);
      }
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        id: z.string(),
        custom: z.string(),
      });
      const customData = { id: "test-id", custom: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await safeGetCvmInfo(client, "test-cvm-id", { schema: customSchema });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(customData);
      }
    });

    it("should return validation error when custom schema fails", async () => {
      const customSchema = z.object({
        id: z.string(),
        custom: z.string(),
      });
      const invalidData = { id: 123, custom: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetCvmInfo(client, "test-cvm-id", { schema: customSchema });

      expect(result.success).toBe(false);
      if (!result.success) {
        if (!("isRequestError" in result.error)) {
          expect(result.error.issues).toBeDefined();
        }
      }
    });

    it("should handle different CVM IDs correctly in safe version", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockCvmInfoData,
      });

      await safeGetCvmInfo(client, "special-cvm-123");

      expect(mockSafeGet).toHaveBeenCalledWith("/cvms/special-cvm-123");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string CVM ID", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockCvmInfoData,
      });

      await getCvmInfo(client, "");

      expect(mockSafeGet).toHaveBeenCalledWith("/cvms/");
    });

    it("should handle CVM ID with special characters", async () => {
      const specialId = "cvm-123-test_special.id";
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockCvmInfoData,
      });

      await getCvmInfo(client, specialId);

      expect(mockSafeGet).toHaveBeenCalledWith(`/cvms/${specialId}`);
    });
  });
}); 