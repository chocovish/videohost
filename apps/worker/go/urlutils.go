package main

import (
	"os"
	"regexp"
	"strings"
)

var (
	localhostRegex  = regexp.MustCompile(`\b(localhost|127\.0\.0\.1)\b`)
	dockerHostRegex = regexp.MustCompile(`\bhost\.docker\.internal\b`)
)

// IsDocker checks whether the worker is running inside a Docker container.
func IsDocker() bool {
	envVars := []string{"IS_DOCKER", "RUNNING_IN_DOCKER", "IN_DOCKER", "DOCKER_CONTAINER"}
	for _, env := range envVars {
		val := strings.ToLower(strings.TrimSpace(os.Getenv(env)))
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

// ReplaceLocalhost replaces localhost/127.0.0.1 with host.docker.internal if running in Docker.
func ReplaceLocalhost(str string) string {
	if !IsDocker() {
		return str
	}
	return localhostRegex.ReplaceAllString(str, "host.docker.internal")
}

// ReplaceDockerHost replaces host.docker.internal with localhost if running in Docker.
func ReplaceDockerHost(str string) string {
	if !IsDocker() {
		return str
	}
	return dockerHostRegex.ReplaceAllString(str, "localhost")
}

// UseDockerHostForLocalhost recursively transforms string values in maps/slices/strings for Docker networking.
func UseDockerHostForLocalhost(val interface{}) interface{} {
	if !IsDocker() {
		return val
	}
	return transformStrings(val, ReplaceLocalhost)
}

// UseLocalhostForDockerHost recursively transforms string values in maps/slices/strings for output/callbacks.
func UseLocalhostForDockerHost(val interface{}) interface{} {
	if !IsDocker() {
		return val
	}
	return transformStrings(val, ReplaceDockerHost)
}

func transformStrings(val interface{}, replacer func(string) string) interface{} {
	if val == nil {
		return nil
	}

	switch v := val.(type) {
	case string:
		return replacer(v)
	case map[string]interface{}:
		res := make(map[string]interface{}, len(v))
		for k, item := range v {
			res[k] = transformStrings(item, replacer)
		}
		return res
	case []interface{}:
		res := make([]interface{}, len(v))
		for i, item := range v {
			res[i] = transformStrings(item, replacer)
		}
		return res
	default:
		return val
	}
}
