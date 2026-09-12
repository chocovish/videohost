package transcoder

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRepresentationFolderName(t *testing.T) {
	rends := []RenditionConfig{
		{Resolution: "480p", Width: 854, Height: 480, BitrateKbps: 1000},
		{Resolution: "720p", Width: 1280, Height: 720, BitrateKbps: 3000},
	}
	if f, ok := RepresentationFolderName(0, rends, true); !ok || f != "480" {
		t.Errorf("rep 0 = %q,%v; want 480,true", f, ok)
	}
	if f, ok := RepresentationFolderName(1, rends, true); !ok || f != "720" {
		t.Errorf("rep 1 = %q,%v; want 720,true", f, ok)
	}
	if f, ok := RepresentationFolderName(2, rends, true); !ok || f != "audio" {
		t.Errorf("rep 2 (audio) = %q,%v; want audio,true", f, ok)
	}
	if _, ok := RepresentationFolderName(2, rends, false); ok {
		t.Errorf("rep 2 without audio should be unknown")
	}
	if _, ok := RepresentationFolderName(99, rends, true); ok {
		t.Errorf("rep 99 should be unknown")
	}
}

func writeFiles(t *testing.T, dir string, files map[string]string) {
	t.Helper()
	for name, content := range files {
		p := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(p), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}
}

func TestOrganizeDashOutputChunked(t *testing.T) {
	dir := t.TempDir()
	rends := []RenditionConfig{
		{Resolution: "480p", Width: 854, Height: 480, BitrateKbps: 1000},
		{Resolution: "720p", Width: 1280, Height: 720, BitrateKbps: 3000},
	}
	mpd := `<?xml version="1.0"?>
<MPD><Period><AdaptationSet contentType="video">
<Representation id="0" bandwidth="1000000" width="854" height="480">
<SegmentTemplate initialization="init-stream$RepresentationID$.m4s" media="chunk-stream$RepresentationID$-$Number%05d$.m4s"/>
</Representation>
<Representation id="1" bandwidth="3000000" width="1280" height="720">
<SegmentTemplate initialization="init-stream$RepresentationID$.m4s" media="chunk-stream$RepresentationID$-$Number%05d$.m4s"/>
</Representation>
</AdaptationSet><AdaptationSet contentType="audio">
<Representation id="2" bandwidth="128000">
<SegmentTemplate initialization="init-stream$RepresentationID$.m4s" media="chunk-stream$RepresentationID$-$Number%05d$.m4s"/>
</Representation>
</AdaptationSet></Period></MPD>`
	writeFiles(t, dir, map[string]string{
		"master.mpd":            mpd,
		"master.m3u8":           "#EXTM3U\nmedia_0.m3u8\nmedia_1.m3u8\n",
		"media_0.m3u8":          "#EXTM3U\n#EXT-X-MAP:URI=\"init-stream0.m4s\"\nchunk-stream0-00001.m4s\n",
		"media_1.m3u8":          "#EXTM3U\n#EXT-X-MAP:URI=\"init-stream1.m4s\"\nchunk-stream1-00001.m4s\n",
		"media_2.m3u8":          "#EXTM3U\n#EXT-X-MAP:URI=\"init-stream2.m4s\"\nchunk-stream2-00001.m4s\n",
		"init-stream0.m4s":      "v0",
		"chunk-stream0-00001.m4s": "c0",
		"init-stream1.m4s":      "v1",
		"chunk-stream1-00001.m4s": "c1",
		"init-stream2.m4s":      "a",
		"chunk-stream2-00001.m4s": "ca",
	})

	repFolders, err := OrganizeDashOutput(dir, rends, true)
	if err != nil {
		t.Fatalf("OrganizeDashOutput error: %v", err)
	}
	if repFolders[0] != "480" || repFolders[1] != "720" || repFolders[2] != "audio" {
		t.Fatalf("unexpected rep folders: %+v", repFolders)
	}

	// Segments moved
	for _, p := range []string{"480/init-stream0.m4s", "480/chunk-stream0-00001.m4s", "720/init-stream1.m4s", "audio/init-stream2.m4s"} {
		if _, err := os.Stat(filepath.Join(dir, p)); err != nil {
			t.Errorf("expected %s to exist: %v", p, err)
		}
	}
	// Flat leftovers gone
	for _, p := range []string{"init-stream0.m4s", "chunk-stream0-00001.m4s"} {
		if _, err := os.Stat(filepath.Join(dir, p)); !os.IsNotExist(err) {
			t.Errorf("expected flat %s to be moved away", p)
		}
	}
	// Playlists stay at root
	for _, p := range []string{"master.mpd", "master.m3u8", "media_0.m3u8"} {
		if _, err := os.Stat(filepath.Join(dir, p)); err != nil {
			t.Errorf("expected playlist %s at root: %v", p, err)
		}
	}

	mpdOut, _ := os.ReadFile(filepath.Join(dir, "master.mpd"))
	mpdStr := string(mpdOut)
	if strings.Contains(mpdStr, "$RepresentationID$") {
		t.Errorf("master.mpd still contains $RepresentationID$ placeholder")
	}
	for _, want := range []string{"480/init-stream0.m4s", "480/chunk-stream0-$Number%05d$.m4s", "720/init-stream1.m4s", "audio/init-stream2.m4s"} {
		if !strings.Contains(mpdStr, want) {
			t.Errorf("master.mpd missing %q\n%s", want, mpdStr)
		}
	}

	m0, _ := os.ReadFile(filepath.Join(dir, "media_0.m3u8"))
	if !strings.Contains(string(m0), "480/init-stream0.m4s") || !strings.Contains(string(m0), "480/chunk-stream0-00001.m4s") {
		t.Errorf("media_0.m3u8 not patched:\n%s", string(m0))
	}
	m2, _ := os.ReadFile(filepath.Join(dir, "media_2.m3u8"))
	if !strings.Contains(string(m2), "audio/init-stream2.m4s") {
		t.Errorf("media_2.m3u8 not patched:\n%s", string(m2))
	}
}

func TestOrganizeDashOutputSingleFile(t *testing.T) {
	dir := t.TempDir()
	rends := []RenditionConfig{
		{Resolution: "720p", Width: 1280, Height: 720, BitrateKbps: 3000},
	}
	mpd := `<MPD><Period><AdaptationSet contentType="video">
<Representation id="0"><BaseURL>stream_0.mp4</BaseURL></Representation>
</AdaptationSet><AdaptationSet contentType="audio">
<Representation id="1"><BaseURL>stream_1.mp4</BaseURL></Representation>
</AdaptationSet></Period></MPD>`
	writeFiles(t, dir, map[string]string{
		"master.mpd":   mpd,
		"media_0.m3u8": "#EXT-X-MAP:URI=\"stream_0.mp4\",BYTERANGE=\"813@0\"\nstream_0.mp4\n",
		"media_1.m3u8": "#EXT-X-MAP:URI=\"stream_1.mp4\",BYTERANGE=\"765@0\"\nstream_1.mp4\n",
		"stream_0.mp4": "video",
		"stream_1.mp4": "audio",
	})

	if _, err := OrganizeDashOutput(dir, rends, true); err != nil {
		t.Fatalf("OrganizeDashOutput error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "720", "stream_0.mp4")); err != nil {
		t.Errorf("expected 720/stream_0.mp4: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "audio", "stream_1.mp4")); err != nil {
		t.Errorf("expected audio/stream_1.mp4: %v", err)
	}
	mpdOut, _ := os.ReadFile(filepath.Join(dir, "master.mpd"))
	if !strings.Contains(string(mpdOut), "720/stream_0.mp4") || !strings.Contains(string(mpdOut), "audio/stream_1.mp4") {
		t.Errorf("master.mpd BaseURL not patched:\n%s", string(mpdOut))
	}
	m0, _ := os.ReadFile(filepath.Join(dir, "media_0.m3u8"))
	if !strings.Contains(string(m0), "720/stream_0.mp4") {
		t.Errorf("media_0.m3u8 not patched:\n%s", string(m0))
	}
}
