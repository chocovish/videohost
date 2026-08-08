/**
 * Utility functions for URL mapping inside worker Docker container.
 * Converts 'localhost' / '127.0.0.1' to 'host.docker.internal' for internal networking,
 * and converts 'host.docker.internal' back to 'localhost' when generating output responses or callbacks.
 */

export function useDockerHostForLocalhost<T>(obj: T): T {
  if (typeof obj === "string") {
    return obj.replace(/\b(localhost|127\.0\.0\.1)\b/g, "host.docker.internal") as unknown as T;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const copy: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      copy[key] = useDockerHostForLocalhost(value);
    }
    return copy as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(useDockerHostForLocalhost) as unknown as T;
  }
  return obj;
}

export function useLocalhostForDockerHost<T>(obj: T): T {
  if (typeof obj === "string") {
    return obj.replace(/\bhost\.docker\.internal\b/g, "localhost") as unknown as T;
  }
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const copy: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      copy[key] = useLocalhostForDockerHost(value);
    }
    return copy as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(useLocalhostForDockerHost) as unknown as T;
  }
  return obj;
}
