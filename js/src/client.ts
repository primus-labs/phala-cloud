import { ofetch, type FetchOptions, type FetchRequest } from "ofetch";
import {
  type SafeResult,
  RequestError,
  type ClientConfig,
} from "./types/client";

/**
 * HTTP Client class with ofetch compatibility
 */
export class Client {
  private fetchInstance: typeof ofetch;
  public readonly config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;

    // Extract our custom options and pass the rest to ofetch
    const { apiKey, baseURL, timeout, headers, ...fetchOptions } = config;

    this.fetchInstance = ofetch.create({
      baseURL: baseURL || "https://cloud-api.phala.network/v1",
      timeout: timeout || 30000,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      ...fetchOptions,

      // Generic handlers for response error (similar to request.ts)
      onResponseError: ({ response }) => {
        console.warn(`HTTP ${response.status}: ${response.url}`);
      },
    });
  }

  /**
   * Get the underlying ofetch instance for advanced usage
   */
  get raw() {
    return this.fetchInstance;
  }

  // ===== Direct methods (throw on error) =====

  /**
   * Perform GET request (throws on error)
   */
  async get<T = unknown>(
    request: FetchRequest,
    options?: Omit<FetchOptions, "method">,
  ): Promise<T> {
    // Note: Type assertion needed due to ofetch's complex generic type system
    return this.fetchInstance<T>(request, {
      ...options,
      method: "GET",
    } as Parameters<typeof this.fetchInstance<T>>[1]);
  }

  /**
   * Perform POST request (throws on error)
   */
  async post<T = unknown>(
    request: FetchRequest,
    body?: RequestInit["body"] | Record<string, unknown>,
    options?: Omit<FetchOptions, "method" | "body">,
  ): Promise<T> {
    // Note: Type assertion needed due to ofetch's complex generic type system
    return this.fetchInstance<T>(request, {
      ...options,
      method: "POST",
      body,
    } as Parameters<typeof this.fetchInstance<T>>[1]);
  }

  /**
   * Perform PUT request (throws on error)
   */
  async put<T = unknown>(
    request: FetchRequest,
    body?: RequestInit["body"] | Record<string, unknown>,
    options?: Omit<FetchOptions, "method" | "body">,
  ): Promise<T> {
    // Note: Type assertion needed due to ofetch's complex generic type system
    return this.fetchInstance<T>(request, {
      ...options,
      method: "PUT",
      body,
    } as Parameters<typeof this.fetchInstance<T>>[1]);
  }

  /**
   * Perform PATCH request (throws on error)
   */
  async patch<T = unknown>(
    request: FetchRequest,
    body?: RequestInit["body"] | Record<string, unknown>,
    options?: Omit<FetchOptions, "method" | "body">,
  ): Promise<T> {
    // Note: Type assertion needed due to ofetch's complex generic type system
    return this.fetchInstance<T>(request, {
      ...options,
      method: "PATCH",
      body,
    } as Parameters<typeof this.fetchInstance<T>>[1]);
  }

  /**
   * Perform DELETE request (throws on error)
   */
  async delete<T = unknown>(
    request: FetchRequest,
    options?: Omit<FetchOptions, "method">,
  ): Promise<T> {
    // Note: Type assertion needed due to ofetch's complex generic type system
    return this.fetchInstance<T>(request, {
      ...options,
      method: "DELETE",
    } as Parameters<typeof this.fetchInstance<T>>[1]);
  }

  // ===== Safe methods (return SafeResult) =====

  /**
   * Safe wrapper for any request method (zod-style result)
   */
  private async safeRequest<T>(
    fn: () => Promise<T>,
  ): Promise<SafeResult<T, RequestError>> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      if (error && typeof error === "object" && "data" in error) {
        const requestError = RequestError.fromFetchError(
          error as import("ofetch").FetchError,
        );
        return { success: false, error: requestError };
      }
      if (error instanceof Error) {
        const requestError = RequestError.fromError(error);
        return { success: false, error: requestError };
      }
      const requestError = new RequestError("Unknown error occurred", {
        detail: "Unknown error occurred",
      });
      return { success: false, error: requestError };
    }
  }

  /**
   * Safe GET request (returns SafeResult)
   */
  async safeGet<T = unknown>(
    request: FetchRequest,
    options?: Omit<FetchOptions, "method">,
  ): Promise<SafeResult<T, RequestError>> {
    return this.safeRequest(() => this.get<T>(request, options));
  }

  /**
   * Safe POST request (returns SafeResult)
   */
  async safePost<T = unknown>(
    request: FetchRequest,
    body?: RequestInit["body"] | Record<string, unknown>,
    options?: Omit<FetchOptions, "method" | "body">,
  ): Promise<SafeResult<T, RequestError>> {
    return this.safeRequest(() => this.post<T>(request, body, options));
  }

  /**
   * Safe PUT request (returns SafeResult)
   */
  async safePut<T = unknown>(
    request: FetchRequest,
    body?: RequestInit["body"] | Record<string, unknown>,
    options?: Omit<FetchOptions, "method" | "body">,
  ): Promise<SafeResult<T, RequestError>> {
    return this.safeRequest(() => this.put<T>(request, body, options));
  }

  /**
   * Safe PATCH request (returns SafeResult)
   */
  async safePatch<T = unknown>(
    request: FetchRequest,
    body?: RequestInit["body"] | Record<string, unknown>,
    options?: Omit<FetchOptions, "method" | "body">,
  ): Promise<SafeResult<T, RequestError>> {
    return this.safeRequest(() => this.patch<T>(request, body, options));
  }

  /**
   * Safe DELETE request (returns SafeResult)
   */
  async safeDelete<T = unknown>(
    request: FetchRequest,
    options?: Omit<FetchOptions, "method">,
  ): Promise<SafeResult<T, RequestError>> {
    return this.safeRequest(() => this.delete<T>(request, options));
  }
}

/**
 * Create a new HTTP client instance
 * Compatible with ofetch.create() parameters plus additional API-specific options
 */
export function createClient(config: ClientConfig): Client {
  return new Client(config);
}
