import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createClient } from "../client";
import {
  getAppEnvEncryptPubKey,
  safeGetAppEnvEncryptPubKey,
  GetAppEnvEncryptPubKeySchema,
  GetAppEnvEncryptPubKeyRequestSchema,
  type GetAppEnvEncryptPubKey,
  type GetAppEnvEncryptPubKeyRequest,
} from "./get_app_env_encrypt_pubkey";

// Mock response data matching the API structure
const mockAppEnvEncryptPubKeyData: GetAppEnvEncryptPubKey = {
  public_key: "04a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  signature: "30440220123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0102203456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234",
};

const mockRequest: GetAppEnvEncryptPubKeyRequest = {
  kmsId: "kms-123",
  appId: "app-456",
};

describe("getAppEnvEncryptPubKey", () => {
  let client: ReturnType<typeof createClient>;
  let mockSafeGet: any;

  beforeEach(() => {
    client = createClient({
      apiKey: "test-api-key",
      baseURL: "https://api.test.com",
    });
    mockSafeGet = vi.spyOn(client, "safeGet");
  });

  describe("getAppEnvEncryptPubKey", () => {
    it("should return app env encrypt pubkey data successfully", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      const result = await getAppEnvEncryptPubKey(client, mockRequest);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/kms-123/pubkey/app-456");
      expect(result).toEqual(mockAppEnvEncryptPubKeyData);
      expect((result as GetAppEnvEncryptPubKey).public_key).toBe(mockAppEnvEncryptPubKeyData.public_key);
      expect((result as GetAppEnvEncryptPubKey).signature).toBe(mockAppEnvEncryptPubKeyData.signature);
    });

    it("should handle different KMS and App IDs correctly", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      const differentRequest = {
        kmsId: "another-kms",
        appId: "another-app",
      };

      await getAppEnvEncryptPubKey(client, differentRequest);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/another-kms/pubkey/another-app");
    });

    it("should validate request payload structure", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      // Test valid request structure
      const validRequest = GetAppEnvEncryptPubKeyRequestSchema.parse(mockRequest);
      expect(validRequest).toEqual(mockRequest);

      // Test invalid request structure
      expect(() => {
        GetAppEnvEncryptPubKeyRequestSchema.parse({
          kmsId: 123, // should be string
          appId: "app-456",
        });
      }).toThrow();
    });

    it("should validate response data with zod schema", async () => {
      const invalidData = {
        public_key: 123, // should be string
        signature: null, // should be string
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(getAppEnvEncryptPubKey(client, mockRequest)).rejects.toThrow();
    });

    it("should handle API errors properly", async () => {
      mockSafeGet.mockResolvedValue({
        success: false,
        error: new Error("KMS or App not found"),
      });

      // Note: this function returns the error result directly instead of throwing
      const result = await getAppEnvEncryptPubKey(client, mockRequest);
      expect(result).toEqual({
        success: false,
        error: new Error("KMS or App not found"),
      });
    });

    it("should return raw data when schema is false", async () => {
      const rawData = { some: "raw", data: 123 };
      mockSafeGet.mockResolvedValue({
        success: true,
        data: rawData,
      });

      const result = await getAppEnvEncryptPubKey(client, mockRequest, { schema: false });

      expect(result).toEqual(rawData);
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        custom_key: z.string(),
        custom_signature: z.string(),
      });
      const customData = { 
        custom_key: "custom-key-data",
        custom_signature: "custom-signature-data",
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await getAppEnvEncryptPubKey(client, mockRequest, { schema: customSchema });

      expect(result).toEqual(customData);
    });

    it("should throw when custom schema validation fails", async () => {
      const customSchema = z.object({
        custom_key: z.string(),
        custom_signature: z.string(),
      });
      const invalidData = { custom_key: 123, custom_signature: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      await expect(getAppEnvEncryptPubKey(client, mockRequest, { schema: customSchema })).rejects.toThrow();
    });

    it("should handle special characters in IDs", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      const specialRequest = {
        kmsId: "kms-123_test.special",
        appId: "app-456-special_test",
      };

      await getAppEnvEncryptPubKey(client, specialRequest);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/kms-123_test.special/pubkey/app-456-special_test");
    });

    it("should handle long public key and signature", async () => {
      const longKeyData = {
        public_key: "04" + "a".repeat(128), // Long hex string
        signature: "30440220" + "b".repeat(64) + "02" + "c".repeat(62), // Long signature
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: longKeyData,
      });

      const result = await getAppEnvEncryptPubKey(client, mockRequest);

      expect(result).toEqual(longKeyData);
    });
  });

  describe("safeGetAppEnvEncryptPubKey", () => {
    it("should return success result when API call succeeds", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      const result = await safeGetAppEnvEncryptPubKey(client, mockRequest);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/kms-123/pubkey/app-456");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAppEnvEncryptPubKeyData);
        expect((result.data as GetAppEnvEncryptPubKey).public_key).toBe(mockAppEnvEncryptPubKeyData.public_key);
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

      const result = await safeGetAppEnvEncryptPubKey(client, mockRequest);

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
        public_key: 123, // should be string
        signature: null, // should be string
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetAppEnvEncryptPubKey(client, mockRequest);

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
          status: 403,
          message: "forbidden",
        },
      });

      const result = await safeGetAppEnvEncryptPubKey(client, mockRequest);

      expect(result.success).toBe(false);
      if (!result.success) {
        if ("isRequestError" in result.error) {
          expect(result.error.status).toBe(403);
        }
      }
    });

    it("should return raw data when schema is false", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      const result = await safeGetAppEnvEncryptPubKey(client, mockRequest, { schema: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAppEnvEncryptPubKeyData);
      }
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        custom_key: z.string(),
        custom_signature: z.string(),
      });
      const customData = { 
        custom_key: "custom-key-data",
        custom_signature: "custom-signature-data",
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await safeGetAppEnvEncryptPubKey(client, mockRequest, { schema: customSchema });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(customData);
      }
    });

    it("should return validation error when custom schema fails", async () => {
      const customSchema = z.object({
        custom_key: z.string(),
        custom_signature: z.string(),
      });
      const invalidData = { custom_key: 123, custom_signature: "test" };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetAppEnvEncryptPubKey(client, mockRequest, { schema: customSchema });

      expect(result.success).toBe(false);
      if (!result.success) {
        if (!("isRequestError" in result.error)) {
          expect(result.error.issues).toBeDefined();
        }
      }
    });

    it("should handle different request payloads in safe version", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      const anotherRequest = {
        kmsId: "production-kms",
        appId: "production-app",
      };

      await safeGetAppEnvEncryptPubKey(client, anotherRequest);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/production-kms/pubkey/production-app");
    });

    it("should handle empty string responses", async () => {
      const emptyData = {
        public_key: "",
        signature: "",
      };

      mockSafeGet.mockResolvedValue({
        success: true,
        data: emptyData,
      });

      const result = await safeGetAppEnvEncryptPubKey(client, mockRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(emptyData);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty string IDs", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      const emptyRequest = {
        kmsId: "",
        appId: "",
      };

      await getAppEnvEncryptPubKey(client, emptyRequest);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms//pubkey/");
    });

    it("should handle URL encoding in IDs", async () => {
      mockSafeGet.mockResolvedValue({
        success: true,
        data: mockAppEnvEncryptPubKeyData,
      });

      const encodedRequest = {
        kmsId: "kms with spaces",
        appId: "app/with/slashes",
      };

      await getAppEnvEncryptPubKey(client, encodedRequest);

      expect(mockSafeGet).toHaveBeenCalledWith("/kms/kms with spaces/pubkey/app/with/slashes");
    });

    it("should validate schema structure", async () => {
      // Test the schema validation
      expect(() => {
        GetAppEnvEncryptPubKeySchema.parse({
          public_key: "valid-key",
          signature: "valid-signature",
        });
      }).not.toThrow();

      expect(() => {
        GetAppEnvEncryptPubKeySchema.parse({
          public_key: "valid-key",
          // missing signature
        });
      }).toThrow();
    });
  });
}); 