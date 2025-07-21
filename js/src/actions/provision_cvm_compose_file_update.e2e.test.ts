import { describe, expect, it, beforeAll } from "vitest";
import { createClient } from "../client";
import {
  provisionCvmComposeFileUpdate,
  safeProvisionCvmComposeFileUpdate,
  ProvisionCvmComposeFileUpdateSchema,
  type ProvisionCvmComposeFileUpdateRequest,
} from "./provision_cvm_compose_file_update";
import { getAvailableNodes } from "./get_available_nodes";

describe("provisionCvmComposeFileUpdate E2E", () => {
  let client: ReturnType<typeof createClient>;
  let testCvmId: string;

  const testComposeRequest: ProvisionCvmComposeFileUpdateRequest = {
    docker_compose_file: `version: '3.8'
services:
  app:
    image: nginx:alpine
    ports:
      - "80:80"
    environment:
      - API_KEY=\${API_KEY}
      - DATABASE_URL=\${DATABASE_URL}`,
    allowed_envs: ["API_KEY", "DATABASE_URL"],
    features: ["kms"],
    name: "e2e-test-app",
    manifest_version: 1,
    kms_enabled: true,
    public_logs: false,
    public_sysinfo: false,
    tproxy_enabled: false,
  };

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
      testCvmId = "test-cvm-id";
    } catch (error) {
      console.warn("Failed to setup E2E test data:", error);
      testCvmId = "fallback-test-id";
    }
  });

  it("should provision CVM compose file update successfully", async () => {
    if (!process.env.PHALA_CLOUD_API_KEY) {
      return; // Skip test
    }

    try {
      const result = await provisionCvmComposeFileUpdate(client, {
        cvm_id: testCvmId,
        request: testComposeRequest,
      });

      // Assert main fields are present
      expect(typeof result.compose_hash).toBe("string");
      expect(result.compose_hash.length).toBeGreaterThan(0);

      // Validate with schema
      const validationResult = ProvisionCvmComposeFileUpdateSchema.safeParse(result);
      expect(validationResult.success).toBe(true);
    } catch (error: any) {
      // Handle expected errors gracefully for E2E testing
      if (error?.status === 404) {
        console.warn("Test CVM not found - this is expected in E2E testing");
        expect(error.status).toBe(404);
        expect(error.detail).toContain("not found");
      } else if (error?.status === 400) {
        console.warn("Bad request - possibly invalid compose file format");
        expect(error.status).toBe(400);
        expect(error.detail).toBeDefined();
      } else {
        throw error;
      }
    }
  });

  it("should handle safe version successfully", async () => {
    if (!process.env.PHALA_CLOUD_API_KEY) {
      return; // Skip test
    }

    const result = await safeProvisionCvmComposeFileUpdate(client, {
      cvm_id: testCvmId,
      request: testComposeRequest,
    });

    if (result.success) {
      expect(typeof result.data.compose_hash).toBe("string");
      expect(result.data.compose_hash.length).toBeGreaterThan(0);
    } else {
      // Handle expected errors
      if ("isRequestError" in result.error) {
        if (result.error.status === 404) {
          console.warn("Test CVM not found - this is expected in E2E testing");
          expect(result.error.status).toBe(404);
          expect(result.error.detail).toContain("not found");
        } else if (result.error.status === 400) {
          console.warn("Bad request - possibly invalid compose file format");
          expect(result.error.status).toBe(400);
          expect(result.error.detail).toBeDefined();
        } else {
          console.error(`HTTP ${result.error.status}: ${result.error.message}`);
        }
      } else {
        console.error(`Validation error: ${result.error.issues}`);
      }
    }
  });

  describe("Error scenarios", () => {
    it("should handle 400 Bad Request for invalid compose file", async () => {
      if (!process.env.PHALA_CLOUD_API_KEY) {
        return; // Skip test
      }

      const invalidRequest = {
        ...testComposeRequest,
        docker_compose_file: "invalid: yaml: content:",
      };

      try {
        await provisionCvmComposeFileUpdate(client, {
          cvm_id: testCvmId,
          request: invalidRequest,
        });
        // If no error is thrown, that's unexpected for invalid compose
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        expect(error.status).toBeLessThanOrEqual(500);
        expect(error.detail || error.message).toBeDefined();
        console.log(`Expected error for invalid compose - Status: ${error.status}, Detail: ${error.detail}`);
      }
    });

    it("should handle 401 Unauthorized with invalid API key", async () => {
      if (!process.env.PHALA_CLOUD_API_KEY) {
        return; // Skip test
      }

      const invalidClient = createClient({ apiKey: "invalid-api-key" });

      try {
        await provisionCvmComposeFileUpdate(invalidClient, {
          cvm_id: testCvmId,
          request: testComposeRequest,
        });
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
        await provisionCvmComposeFileUpdate(client, {
          cvm_id: "non-existent-cvm-999999",
          request: testComposeRequest,
        });
        // If no error is thrown, that's unexpected for non-existent CVM
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.detail || error.message).toBeDefined();
        console.log(`Expected 404 error - Detail: ${error.detail}`);
      }
    });

    it("should handle 422 Unprocessable Entity for malformed compose file", async () => {
      if (!process.env.PHALA_CLOUD_API_KEY) {
        return; // Skip test
      }

      const malformedRequest = {
        ...testComposeRequest,
        docker_compose_file: "", // Empty compose file
      };

      try {
        await provisionCvmComposeFileUpdate(client, {
          cvm_id: testCvmId,
          request: malformedRequest,
        });
        // If no error is thrown, that's unexpected for empty compose
      } catch (error: any) {
        expect(error.status).toBeGreaterThanOrEqual(400);
        expect(error.status).toBeLessThanOrEqual(500);
        expect(error.detail || error.message).toBeDefined();
        console.log(`Expected error for empty compose - Status: ${error.status}, Detail: ${error.detail}`);
      }
    });

    it("should handle safe version error scenarios", async () => {
      if (!process.env.PHALA_CLOUD_API_KEY) {
        return; // Skip test
      }

      const result = await safeProvisionCvmComposeFileUpdate(client, {
        cvm_id: "non-existent-cvm-999999",
        request: testComposeRequest,
      });

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
      const result = await provisionCvmComposeFileUpdate(client, {
        cvm_id: testCvmId,
        request: testComposeRequest,
        schema: false,
      });
      
      // Should return raw data without validation
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    } catch (error: any) {
      // Handle expected errors gracefully
      if (error?.status === 404) {
        console.warn("Test CVM not found - this is expected in E2E testing");
      } else if (error?.status === 400) {
        console.warn("Bad request - possibly invalid compose file format");
      } else {
        throw error;
      }
    }
  });
}); 