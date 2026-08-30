package urlutils

import (
	"os"
	"testing"
)

func TestURLMapping(t *testing.T) {
	str := "http://localhost:9000/videohost and http://127.0.0.1:3000/api"
	expectedDocker := "http://host.docker.internal:9000/videohost and http://host.docker.internal:3000/api"

	converted := ReplaceLocalhostWithDockerHost(str)
	if converted != expectedDocker {
		t.Fatalf("expected %q, got %q", expectedDocker, converted)
	}

	back := ReplaceDockerHostWithLocalhost(converted)
	expectedBack := "http://localhost:9000/videohost and http://localhost:3000/api"
	if back != expectedBack {
		t.Fatalf("expected %q, got %q", expectedBack, back)
	}
}

func TestDockerDetection(t *testing.T) {
	_ = os.Setenv("IS_DOCKER", "true")
	if !IsDocker() {
		t.Fatalf("expected IsDocker to be true")
	}

	_ = os.Setenv("IS_DOCKER", "false")
	if IsDocker() {
		t.Fatalf("expected IsDocker to be false")
	}

	_ = os.Unsetenv("IS_DOCKER")
}

