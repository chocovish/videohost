import fs from "fs";

/**
 * Checks whether the worker is running inside a Docker container.
 * Inspects explicit environment variables (IS_DOCKER, RUNNING_IN_DOCKER, IN_DOCKER, DOCKER_CONTAINER)
 * and container system files (/.dockerenv, /proc/self/cgroup).
 */
export function isDocker(): boolean {
  const envVal = (
    process.env.IS_DOCKER ||
    process.env.RUNNING_IN_DOCKER ||
    process.env.IN_DOCKER ||
    process.env.DOCKER_CONTAINER
  )
    ?.toLowerCase()
    ?.trim();

  if (envVal === "true" || envVal === "1") return true;
  if (envVal === "false" || envVal === "0") return false;

  try {
    if (fs.existsSync("/.dockerenv")) {
      return true;
    }
  } catch {}

  try {
    if (fs.existsSync("/proc/self/cgroup")) {
      const cgroup = fs.readFileSync("/proc/self/cgroup", "utf8");
      if (cgroup.includes("docker") || cgroup.includes("containerd") || cgroup.includes("kubepods")) {
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Utility functions for URL mapping inside worker Docker container.
 * Converts 'localhost' / '127.0.0.1' to 'host.docker.internal' for internal networking ONLY when running inside Docker,
 * and converts 'host.docker.internal' back to 'localhost' when generating output responses or callbacks ONLY when running inside Docker.
 */

export function useDockerHostForLocalhost<T>(obj: T): T {
  if (!isDocker()) {
    return obj;
  }
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
  if (!isDocker()) {
    return obj;
  }
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

