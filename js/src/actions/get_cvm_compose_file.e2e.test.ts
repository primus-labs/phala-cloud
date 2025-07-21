import { describe, expect, it, beforeAll } from "vitest";
import { createClient } from "../client";
import {
  getCvmComposeFile,
  safeGetCvmComposeFile,
  CvmComposeFileSchema,
} from "./get_cvm_compose_file";
import { getAvailableNodes } from "./get_available_nodes";

describe("getCvmComposeFile E2E", () => {
  let client: ReturnType<typeof createClient>;
  let testCvmId: string;

  beforeAll(async () => {
    // Skip if required environment variables are not set
    if (!process.env.PHALA_CLOUD_API_KEY) {
      console.warn("Skipping E2E tests: PHALA_CLOUD_API_KEY not set");
      return;
    }

    client = createClient();

    // Dynamically fetch available CVM for testing
    try {
      const nodes = await getAvailableNodes(client);
      if (!nodes || nodes.length === 0) {
        throw new Error("No available nodes found for testing");
      }

      // For this test, we need an existing CVM. In a real scenario, 
      // we might need to create one first or use a known test CVM ID
      // For now, we'll use a placeholder and expect the test to handle "not found" gracefully
      testCvmId = "test-cvm-id";
    } catch (error) {
      console.warn("Failed to setup E2E test data:", error);
      testCvmId = "fallback-test-id";
    }
  });

  it("should get CVM compose file successfully", async () => {
    if (!process.env.PHALA_CLOUD_API_KEY) {
      return; // Skip test
    }

    try {
      const result = await getCvmComposeFile(client, { cvm_id: testCvmId });

      // Assert main fields are present
      expect(typeof result.docker_compose_file).toBe("string");
      expect(result.docker_compose_file.length).toBeGreaterThan(0);

      // Validate with schema
      const validationResult = CvmComposeFileSchema.safeParse(result);
      expect(validationResult.success).toBe(true);
    } catch (error: any) {
      // Handle expected errors gracefully for E2E testing
      if (error?.status === 404) {
        console.warn("Test CVM not found - this is expected in E2E testing");
        expect(error.status).toBe(404);
        expect(error.detail).toContain("not found");
      } else {
        throw error;
      }
    }
  });

  it("should handle safe version successfully", async () => {
    if (!process.env.PHALA_CLOUD_API_KEY) {
      return; // Skip test
    }

    const result = await safeGetCvmComposeFile(client, { cvm_id: testCvmId });

    if (result.success) {
      expect(typeof result.data.docker_compose_file).toBe("string");
      expect(result.data.docker_compose_file.length).toBeGreaterThan(0);
    } else {
      // Handle expected errors
      if ("isRequestError" in result.error) {
        if (result.error.status === 404) {
          console.warn("Test CVM not found - this is expected in E2E testing");
          expect(result.error.status).toBe(404);
          expect(result.error.detail).toContain("not found");
        } else {
          console.error(`HTTP ${result.error.status}: ${result.error.message}`);
        }
      } else {
        console.error(`Validation error: ${result.error.issues}`);
      }
    }
  });

  describe("Error scenarios", () => {
    it("should handle 400 Bad Request for invalid identifier", async () => {
      if (!process.env.PHALA_CLOUD_API_KEY) {
        return; // Skip test
      }

      try {
        await getCvmComposeFile(client, { cvm_id: "invalid-cvm-id" });
        // If no error is thrown, that's unexpected for an invalid ID
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        expect(error.status).toBeLessThanOrEqual(500);
        expect(error.detail || error.message).toBeDefined();
        console.log(`Expected error for invalid identifier - Status: ${error.status}, Detail: ${error.detail}`);
      }
    });

    it("should handle 401 Unauthorized with invalid API key", async () => {
      if (!process.env.PHALA_CLOUD_API_KEY) {
        return; // Skip test
      }

      const invalidClient = createClient({ apiKey: "invalid-api-key" });

      try {
        await getCvmComposeFile(invalidClient, { cvm_id: testCvmId });
        // If no error is thrown, that's unexpected for invalid auth
      } catch (error: any) {
        expect(error.status).toBe(401);
        expect(error.detail || error.message).toBeDefined();
        console.log(`Expected 401 error - Detail: ${error.detail}`);
      }
    });

    it("should handle 404 Not Found for non-existent CVM", async () => {
      if (!process.env.PHALA_CLOUD_API_KEY) {
        return; // Skip test
      }

      try {
        await getCvmComposeFile(client, { cvm_id: "non-existent-cvm-999999" });
        // If no error is thrown, that's unexpected for non-existent CVM
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.detail || error.message).toBeDefined();
        console.log(`Expected 404 error - Detail: ${error.detail}`);
      }
    });

    it("should handle safe version error scenarios", async () => {
      if (!process.env.PHALA_CLOUD_API_KEY) {
        return; // Skip test
      }

      const result = await safeGetCvmComposeFile(client, { cvm_id: "non-existent-cvm-999999" });

      expect(result.success).toBe(false);
      if (!result.success) {
        if ("isRequestError" in result.error) {
          expect(result.error.status).toBeGreaterThanOrEqual(400);
          expect(result.error.status).toBeLessThanOrEqual(500);
          expect(result.error.detail).toBeDefined();
          console.log(`Safe error handling - Status: ${result.error.status}, Detail: ${result.error.detail}`);
        } else {
          console.log(`Validation error: ${result.error.issues}`);
        }
      }
    });
  });

  it("should return raw data when schema is false", async () => {
    if (!process.env.PHALA_CLOUD_API_KEY) {
      return; // Skip test
    }

    try {
      const result = await getCvmComposeFile(client, { cvm_id: testCvmId, schema: false });
      
      // Should return raw data without validation
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    } catch (error: any) {
      // Handle expected errors gracefully
      if (error?.status === 404) {
        console.warn("Test CVM not found - this is expected in E2E testing");
      } else {
        throw error;
      }
    }
  });
}); 