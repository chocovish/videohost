package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port              int
	WorkerSecretToken string
	MaxConcurrentJobs int
}

func CleanEnv(val string, fallback string) string {
	val = strings.TrimSpace(val)
	val = strings.Trim(val, `"'`+"\r\n")
	val = strings.TrimSpace(val)
	if val == "" {
		return fallback
	}
	return val
}

func CleanEnvInt(val string, fallback int) int {
	cleaned := CleanEnv(val, "")
	if cleaned == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(cleaned)
	if err != nil {
		return fallback
	}
	return parsed
}

func LoadConfig() *Config {
	port := CleanEnvInt(os.Getenv("PORT"), 8080)
	secret := CleanEnv(os.Getenv("WORKER_SECRET_TOKEN"), "")

	maxJobs := CleanEnvInt(os.Getenv("WORKER_MAX_CONCURRENT_JOBS"), 0)
	if maxJobs <= 0 {
		maxJobs = CleanEnvInt(os.Getenv("MAX_CONCURRENT_JOBS"), 2)
	}
	if maxJobs <= 0 {
		maxJobs = 2
	}

	return &Config{
		Port:              port,
		WorkerSecretToken: secret,
		MaxConcurrentJobs: maxJobs,
	}
}
