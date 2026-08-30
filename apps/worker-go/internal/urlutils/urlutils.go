package urlutils

import (
	"encoding/json"
	"os"
	"regexp"
	"strings"
)

var (
	localhostRegex  = regexp.MustCompile(`\b(localhost|127\.0\.0\.1)\b`)
	dockerHostRegex = regexp.MustCompile(`\bhost\.docker\.internal\b`)
)

// IsDocker checks whether the process is executing inside a Docker container.
func IsDocker() bool {
	envKeys := []string{"IS_DOCKER", "RUNNING_IN_DOCKER", "IN_DOCKER", "DOCKER_CONTAINER"}
	for _, k := range envKeys {
		val := strings.ToLower(strings.TrimSpace(os.Getenv(k)))
		if val == "true" || val == "1" {
			return true
		}
		if val == "false" || val == "0" {
			return false
		}
	}

	if _, err := os.Stat("/.dockerenv"); err == nil {
		return true
	}

	if data, err := os.ReadFile("/proc/self/cgroup"); err == nil {
		content := string(data)
		if strings.Contains(content, "docker") || strings.Contains(content, "containerd") || strings.Contains(content, "kubepods") {
			return true
		}
	}

	return false
}

// ReplaceLocalhostWithDockerHost replaces localhost and 127.0.0.1 with host.docker.internal in a string.
func ReplaceLocalhostWithDockerHost(s string) string {
	return localhostRegex.ReplaceAllString(s, "host.docker.internal")
}

// ReplaceDockerHostWithLocalhost replaces host.docker.internal with localhost in a string.
func ReplaceDockerHostWithLocalhost(s string) string {
	return dockerHostRegex.ReplaceAllString(s, "localhost")
}

// UseDockerHostForLocalhost transforms localhost URLs to host.docker.internal if running in Docker.
func UseDockerHostForLocalhost(s string) string {
	if !IsDocker() {
		return s
	}
	return ReplaceLocalhostWithDockerHost(s)
}

// UseLocalhostForDockerHost transforms host.docker.internal URLs to localhost if running in Docker.
func UseLocalhostForDockerHost(s string) string {
	if !IsDocker() {
		return s
	}
	return ReplaceDockerHostWithLocalhost(s)
}

// TransformJSONLocalhostToDockerHost transforms any JSON-serializable object by replacing localhost with host.docker.internal when in Docker.
func TransformJSONLocalhostToDockerHost(input any) any {
	if !IsDocker() {
		return input
	}
	return transformGeneric(input, ReplaceLocalhostWithDockerHost)
}

// TransformJSONDockerHostToLocalhost transforms any JSON-serializable object by replacing host.docker.internal with localhost when in Docker.
func TransformJSONDockerHostToLocalhost(input any) any {
	if !IsDocker() {
		return input
	}
	return transformGeneric(input, ReplaceDockerHostWithLocalhost)
}

func transformGeneric(input any, transformer func(string) string) any {
	if input == nil {
		return nil
	}

	switch v := input.(type) {
	case string:
		return transformer(v)
	case map[string]any:
		res := make(map[string]any, len(v))
		for k, val := range v {
			res[k] = transformGeneric(val, transformer)
		}
		return res
	case []any:
		res := make([]any, len(v))
		for i, val := range v {
			res[i] = transformGeneric(val, transformer)
		}
		return res
	default:
		// Convert struct or other type via JSON bytes
		data, err := json.Marshal(input)
		if err != nil {
			return input
		}
		transformedStr := transformer(string(data))
		var out any
		if err := json.Unmarshal([]byte(transformedStr), &out); err != nil {
			return input
		}
		return out
	}
}

