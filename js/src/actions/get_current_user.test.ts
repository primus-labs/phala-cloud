import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { type Client, type SafeResult } from "../client";
import { getCurrentUser, safeGetCurrentUser, type CurrentUser, type GetCurrentUserParameters } from "./get_current_user";

// Mock response data matching the API structure
const mockUserData: CurrentUser = {
  username: "testuser",
  email: "testuser@phala.network",
  credits: 1000,
  granted_credits: 500,
  avatar: "/default-avatar.png",
  team_name: "Test Team",
  team_tier: "pro",
};

describe("getCurrentUser", () => {
  let mockClient: Partial<Client>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockClient = {
      get: vi.fn(),
      safeGet: vi.fn(),
    };
  });

  describe("getCurrentUser", () => {
    it("should return current user data successfully", async () => {
      // Mock the client.get method
      (mockClient.get as jest.Mock).mockResolvedValue(mockUserData);

      const result = await getCurrentUser(mockClient as Client);

      expect(mockClient.get).toHaveBeenCalledWith("/auth/me");
      expect(result).toEqual(mockUserData);
      expect((result as CurrentUser).username).toBe("testuser");
      expect((result as CurrentUser).credits).toBe(1000);
    });

    it("should validate response data with zod schema", async () => {
      const invalidData = {
        username: "testuser",
        email: "testuser@phala.network",
        credits: "invalid", // should be number
        // missing required fields
      };

      (mockClient.get as jest.Mock).mockResolvedValue(invalidData);

      await expect(getCurrentUser(mockClient as Client)).rejects.toThrow();
    });

    it("should handle API errors properly", async () => {
      const apiError = new Error("API Error");
      (mockClient.get as jest.Mock).mockRejectedValue(apiError);

      await expect(getCurrentUser(mockClient as Client)).rejects.toThrow("API Error");
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timed out");
      timeoutError.name = "TimeoutError";
      (mockClient.get as jest.Mock).mockRejectedValue(timeoutError);

      await expect(getCurrentUser(mockClient as Client)).rejects.toThrow("Request timed out");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network error");
      networkError.name = "NetworkError";
      (mockClient.get as jest.Mock).mockRejectedValue(networkError);

      await expect(getCurrentUser(mockClient as Client)).rejects.toThrow("Network error");
    });

    it("should return raw data when schema is false", async () => {
      const rawData = { some: "raw", data: 123 };
      (mockClient.get as jest.Mock).mockResolvedValue(rawData);

      const result = await getCurrentUser(mockClient as Client, { schema: false });

      expect(result).toEqual(rawData);
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        id: z.number(),
        name: z.string(),
      });
      const customData = { id: 1, name: "test" };
      
      (mockClient.get as jest.Mock).mockResolvedValue(customData);

      const result = await getCurrentUser(mockClient as Client, { schema: customSchema });

      expect(result).toEqual(customData);
    });

    it("should throw when custom schema validation fails", async () => {
      const customSchema = z.object({
        id: z.number(),
        name: z.string(),
      });
      const invalidData = { id: "invalid", name: 123 };
      
      (mockClient.get as jest.Mock).mockResolvedValue(invalidData);

      await expect(getCurrentUser(mockClient as Client, { schema: customSchema })).rejects.toThrow();
    });
  });

  describe("safeGetCurrentUser", () => {
    it("should return success result when API call succeeds", async () => {
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUserData,
      });

      const result = await safeGetCurrentUser(mockClient as Client);

      expect(mockClient.safeGet).toHaveBeenCalledWith("/auth/me");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUserData);
        expect((result.data as CurrentUser).username).toBe("testuser");
      }
    });

    it("should return error result when API call fails", async () => {
      const apiError: SafeResult<unknown> = {
        success: false,
        error: {
          name: "RequestError",
          message: "Network Error",
          detail: "Network Error",
          isRequestError: true,
          status: 500,
        },
      };

      (mockClient.safeGet as jest.Mock).mockResolvedValue(apiError);

      const result = await safeGetCurrentUser(mockClient as Client);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Network Error");
        if ("isRequestError" in result.error) {
          expect(result.error.isRequestError).toBe(true);
          expect(result.error.status).toBe(500);
        }
      }
    });

    it("should handle timeout errors", async () => {
      const timeoutError: SafeResult<unknown> = {
        success: false,
        error: {
          name: "TimeoutError",
          message: "Request timed out",
          detail: "Request timed out after 30000ms",
          isRequestError: true,
          status: 408,
        },
      };

      (mockClient.safeGet as jest.Mock).mockResolvedValue(timeoutError);

      const result = await safeGetCurrentUser(mockClient as Client);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Request timed out");
        if ("isRequestError" in result.error) {
          expect(result.error.status).toBe(408);
        }
      }
    });

    it("should handle network errors", async () => {
      const networkError: SafeResult<unknown> = {
        success: false,
        error: {
          name: "NetworkError",
          message: "Network error",
          detail: "Failed to fetch",
          isRequestError: true,
          status: 0,
        },
      };

      (mockClient.safeGet as jest.Mock).mockResolvedValue(networkError);

      const result = await safeGetCurrentUser(mockClient as Client);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Network error");
        if ("isRequestError" in result.error) {
          expect(result.error.status).toBe(0);
        }
      }
    });

    it("should handle zod validation errors", async () => {
      const invalidData = {
        username: 123, // should be string
        email: "testuser@phala.network",
      };

      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetCurrentUser(mockClient as Client);

      expect(result.success).toBe(false);
      if (!result.success) {
        // If it doesn't have isRequestError, it's a ZodError
        if (!("isRequestError" in result.error)) {
          expect(result.error.name).toBe("ZodError");
          expect(result.error.issues).toBeDefined();
          expect(result.error.issues.length).toBeGreaterThan(0);
          expect(result.error.issues[0].path).toEqual(["username"]);
          expect(result.error.issues[0].code).toBe("invalid_type");
        }
      }
    });

    it("should pass through HTTP errors directly", async () => {
      const httpError: SafeResult<unknown> = {
        success: false,
        error: {
          name: "RequestError",
          message: "Unauthorized",
          detail: "Invalid API key",
          status: 401,
          isRequestError: true,
        },
      };

      (mockClient.safeGet as jest.Mock).mockResolvedValue(httpError);

      const result = await safeGetCurrentUser(mockClient as Client);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Unauthorized");
        if ("isRequestError" in result.error && result.error.isRequestError) {
          expect(result.error.status).toBe(401);
        }
      }
    });

    it("should return raw data when schema is false", async () => {
      const rawData = { some: "raw", data: 123 };
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: rawData,
      });

      const result = await safeGetCurrentUser(mockClient as Client, { schema: false });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(rawData);
      }
    });

    it("should use custom schema when provided", async () => {
      const customSchema = z.object({
        id: z.number(),
        name: z.string(),
      });
      const customData = { id: 1, name: "test" };
      
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: customData,
      });

      const result = await safeGetCurrentUser(mockClient as Client, { schema: customSchema });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(customData);
      }
    });

    it("should return validation error when custom schema fails", async () => {
      const customSchema = z.object({
        id: z.number(),
        name: z.string(),
      });
      const invalidData = { id: "invalid", name: 123 };
      
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: invalidData,
      });

      const result = await safeGetCurrentUser(mockClient as Client, { schema: customSchema });

      expect(result.success).toBe(false);
      if (!result.success) {
        if (!("isRequestError" in result.error)) {
          expect(result.error.name).toBe("ZodError");
          expect(result.error.issues).toBeDefined();
        }
      }
    });
  });

  describe("parameter handling", () => {
    it("should work without parameters", async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockUserData);

      const result = await getCurrentUser(mockClient as Client);
      expect(result).toEqual(mockUserData);
    });

    it("should work with empty parameters object", async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockUserData);

      const result = await getCurrentUser(mockClient as Client, {});
      expect(result).toEqual(mockUserData);
    });

    it("should work with safe version without parameters", async () => {
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUserData,
      });

      const result = await safeGetCurrentUser(mockClient as Client);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUserData);
      }
    });

    it("should work with safe version with empty parameters object", async () => {
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUserData,
      });

      const result = await safeGetCurrentUser(mockClient as Client, {});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUserData);
      }
    });
  });

  describe("schema flexibility", () => {
    it("should allow extra fields in API response for forward compatibility", async () => {
      const responseWithExtraFields = {
        ...mockUserData,
        // Extra fields that might be added in future API versions
        new_feature: "some_value",
        premium_features: {
          enabled: true,
          plan: "pro",
        },
        metadata: {
          last_login: "2024-01-01T00:00:00Z",
          preferences: {
            theme: "dark",
            language: "en",
          },
        },
      };

      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: responseWithExtraFields,
      });

      const result = await safeGetCurrentUser(mockClient as Client);

      expect(result.success).toBe(true);
      if (result.success) {
        // Should include the core fields
        expect((result.data as CurrentUser).username).toBe(mockUserData.username);
        expect((result.data as CurrentUser).email).toBe(mockUserData.email);
        expect((result.data as CurrentUser).credits).toBe(mockUserData.credits);
        
        // Should also include the extra fields (due to passthrough())
        expect((result.data as any).new_feature).toBe("some_value");
        expect((result.data as any).premium_features).toEqual({
          enabled: true,
          plan: "pro",
        });
      }
    });
  });

  describe("type inference", () => {
    it("should infer CurrentUser type when no schema provided", async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockUserData);
      
      const result = await getCurrentUser(mockClient as Client);
      
      // TypeScript should infer this as CurrentUser
      expect(result.username).toBe("testuser");
      expect(result.email).toBe("testuser@phala.network");
      expect(result.credits).toBe(1000);
      expect(result.team_name).toBe("Test Team");
    });

    it("should infer unknown type when schema is false", async () => {
      const rawResponse = { id: 1, username: "testuser", custom_field: "extra" };
      (mockClient.get as jest.Mock).mockResolvedValue(rawResponse);
      
      const result = await getCurrentUser(mockClient as Client, { schema: false });
      
      // TypeScript should infer this as unknown
      expect(result).toEqual(rawResponse);
    });

    it("should infer custom schema type when provided", async () => {
      const customSchema = z.object({ id: z.number(), name: z.string() });
      const customResponse = { id: 1, name: "Test User" };
      (mockClient.get as jest.Mock).mockResolvedValue(customResponse);
      
      const result = await getCurrentUser(mockClient as Client, { schema: customSchema });
      
      // TypeScript should infer this as { id: number; name: string }
      expect(result.id).toBe(1);
      expect(result.name).toBe("Test User");
    });

    it("should enforce parameter type safety", async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockUserData);
      
      // @ts-expect-error - schema should be ZodSchema | false | undefined
      await expect(getCurrentUser(mockClient as Client, { schema: "invalid" })).rejects.toThrow("Invalid schema");
      
      // @ts-expect-error - unknown parameter
      await getCurrentUser(mockClient as Client, { unknownParam: true });
      
      // Valid parameters should compile
      const params: GetCurrentUserParameters = {};
      await getCurrentUser(mockClient as Client, params);
      
      // Test with custom schema - use appropriate mock data
      const customSchema = z.object({ id: z.number() });
      const customMockData = { id: 123 };
      (mockClient.get as jest.Mock).mockResolvedValueOnce(customMockData);
      const paramsWithSchema: GetCurrentUserParameters<typeof customSchema> = { schema: customSchema };
      await getCurrentUser(mockClient as Client, paramsWithSchema);
    });
  });

  describe("schema behavior", () => {
    it("should allow unknown fields through passthrough", async () => {
      const dataWithExtra = {
        ...mockUserData,
        unknownField1: "value1",
        unknownField2: 123,
        unknownObject: {
          nested: true,
        },
      };

      (mockClient.get as jest.Mock).mockResolvedValue(dataWithExtra);

      const result = await getCurrentUser(mockClient as Client);
      
      // Should have all required fields
      expect(result.username).toBe(mockUserData.username);
      expect(result.email).toBe(mockUserData.email);
      
      // Should preserve unknown fields
      expect((result as any).unknownField1).toBe("value1");
      expect((result as any).unknownField2).toBe(123);
      expect((result as any).unknownObject).toEqual({ nested: true });
    });

    it("should handle null and undefined fields appropriately", async () => {
      const dataWithNulls = {
        ...mockUserData,
        avatar: null, // Schema expects string
        team_name: undefined, // Schema expects string
      };

      (mockClient.get as jest.Mock).mockResolvedValue(dataWithNulls);

      // Should throw because required fields can't be null/undefined
      await expect(getCurrentUser(mockClient as Client)).rejects.toThrow();
    });
  });

  describe("parameter validation", () => {
    it("should reject invalid parameter types at runtime", async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockUserData);

      // @ts-expect-error - Testing runtime behavior with invalid type
      await expect(getCurrentUser(mockClient as Client, { schema: 123 })).rejects.toThrow();
      
      // @ts-expect-error - Testing runtime behavior with invalid type
      await expect(getCurrentUser(mockClient as Client, { schema: "invalid" })).rejects.toThrow();
      
      // @ts-expect-error - Testing runtime behavior with invalid type
      await expect(getCurrentUser(mockClient as Client, { schema: {} })).rejects.toThrow();
    });
  });

  describe("safe version type inference", () => {
    it("should infer SafeResult<CurrentUser> when no schema provided", async () => {
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUserData,
      });
      
      const result = await safeGetCurrentUser(mockClient as Client);
      
      if (result.success) {
        // TypeScript should infer result.data as CurrentUser
        expect(result.data.username).toBe("testuser");
        expect(result.data.email).toBe("testuser@phala.network");
        expect(result.data.credits).toBe(1000);
        expect(result.data.team_name).toBe("Test Team");
      }
    });

    it("should infer SafeResult<unknown> when schema is false", async () => {
      const rawResponse = { id: 1, username: "testuser", custom_field: "extra" };
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: rawResponse,
      });
      
      const result = await safeGetCurrentUser(mockClient as Client, { schema: false });
      
      if (result.success) {
        // TypeScript should infer result.data as unknown
        expect(result.data).toEqual(rawResponse);
      }
    });

    it("should infer custom type when custom schema provided", async () => {
      const customSchema = z.object({ id: z.number(), name: z.string() });
      const customResponse = { id: 1, name: "Test User" };
      (mockClient.safeGet as jest.Mock).mockResolvedValue({
        success: true,
        data: customResponse,
      });
      
      const result = await safeGetCurrentUser(mockClient as Client, { schema: customSchema });
      
      if (result.success) {
        // TypeScript should infer result.data as { id: number; name: string }
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe("Test User");
      }
    });
  });
}); 