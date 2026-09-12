package transcoder

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// AudioFolderName is the shared subfolder for audio segments under dash/.
const AudioFolderName = "audio"

var (
	mediaPlaylistRegex       = regexp.MustCompile(`^media_(\d+)\.m3u8$`)
	representationBlockRegex = regexp.MustCompile(`(?s)<Representation id="(\d+?)".*?</Representation>`)
)

// RenditionFolderName returns the subfolder for a video rendition —
// numeric height only (e.g. 480, 720, 1080, 2160).
func RenditionFolderName(height int) string {
	return strconv.Itoa(height)
}

// RepresentationFolderName maps a DASH RepresentationID to its output subfolder:
// video representations 0..N-1 map to "<height>", audio representation N
// (when present) maps to "audio". Returns ("", false) for unknown IDs.
func RepresentationFolderName(repID int, targetRenditions []RenditionConfig, hasAudio bool) (string, bool) {
	if repID >= 0 && repID < len(targetRenditions) {
		return RenditionFolderName(targetRenditions[repID].Height), true
	}
	if hasAudio && repID == len(targetRenditions) {
		return AudioFolderName, true
	}
	return "", false
}

// OrganizeDashOutput reorganizes a flat FFmpeg DASH output directory into
// per-rendition folders:
//
//	dash/master.mpd, master.m3u8, media_*.m3u8  (kept at root)
//	dash/480/, dash/720/, dash/1080/, ...       (video segments)
//	dash/audio/                                  (audio segments)
//
// Segment filenames still embed the RepresentationID
// (stream_0.mp4, init-stream0.m4s, chunk-stream0-00001.m4s), so the mapping
// stays unambiguous. Manifests are patched so relative URLs point into the
// new subfolders:
//   - master.mpd: per-Representation SegmentTemplate $RepresentationID$
//     placeholders are expanded to concrete folder-prefixed paths, and
//     single-file <BaseURL>stream_X.mp4</BaseURL> entries are prefixed.
//   - media_X.m3u8 (kept at root): init/chunk/stream references are prefixed.
//   - master.m3u8: untouched (only references media_*.m3u8 at root).
//
// Returns the representationID -> folder map used.
func OrganizeDashOutput(dashOutputDir string, targetRenditions []RenditionConfig, hasAudio bool) (map[int]string, error) {
	repFolders := make(map[int]string)
	for i, r := range targetRenditions {
		repFolders[i] = RenditionFolderName(r.Height)
	}
	if hasAudio {
		repFolders[len(targetRenditions)] = AudioFolderName
	}

	// 1. Move flat segment files into per-representation subfolders.
	// Playlists (master.mpd, master.m3u8, media_*.m3u8) stay at root.
	topEntries, err := os.ReadDir(dashOutputDir)
	if err != nil {
		return repFolders, err
	}
	for _, entry := range topEntries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if name == "master.mpd" || name == "master.m3u8" || mediaPlaylistRegex.MatchString(name) {
			continue
		}
		repID := -1
		if m := singleFileRegex.FindStringSubmatch(name); len(m) > 1 {
			if id, err := strconv.Atoi(m[1]); err == nil {
				repID = id
			}
		} else if m := chunkFileRegex.FindStringSubmatch(name); len(m) > 1 {
			if id, err := strconv.Atoi(m[1]); err == nil {
				repID = id
			}
		}
		if repID < 0 {
			continue
		}
		folder, ok := repFolders[repID]
		if !ok {
			continue
		}
		destDir := filepath.Join(dashOutputDir, folder)
		if err := os.MkdirAll(destDir, 0755); err != nil {
			return repFolders, fmt.Errorf("failed creating subfolder %s: %w", folder, err)
		}
		if err := os.Rename(filepath.Join(dashOutputDir, name), filepath.Join(destDir, name)); err != nil {
			return repFolders, fmt.Errorf("failed moving %s to %s/: %w", name, folder, err)
		}
	}

	// 2. Patch master.mpd so SegmentTemplate/BaseURL point into subfolders.
	masterMpdPath := filepath.Join(dashOutputDir, "master.mpd")
	if mpdBytes, err := os.ReadFile(masterMpdPath); err == nil {
		mpd := string(mpdBytes)
		// Single-file mode: <BaseURL>stream_X.mp4</BaseURL> -> <BaseURL>folder/stream_X.mp4</BaseURL>
		for repID, folder := range repFolders {
			mpd = strings.ReplaceAll(mpd,
				fmt.Sprintf(">stream_%d.mp4<", repID),
				fmt.Sprintf(">%s/stream_%d.mp4<", folder, repID))
			mpd = strings.ReplaceAll(mpd,
				fmt.Sprintf("\"stream_%d.mp4\"", repID),
				fmt.Sprintf("\"%s/stream_%d.mp4\"", folder, repID))
		}
		// Chunked mode: expand $RepresentationID$ templates per Representation block.
		mpd = representationBlockRegex.ReplaceAllStringFunc(mpd, func(block string) string {
			sub := representationBlockRegex.FindStringSubmatch(block)
			if len(sub) < 2 {
				return block
			}
			repID, err := strconv.Atoi(sub[1])
			if err != nil {
				return block
			}
			folder, ok := repFolders[repID]
			if !ok {
				return block
			}
			patched := block
			patched = strings.ReplaceAll(patched,
				"init-stream$RepresentationID$.m4s",
				fmt.Sprintf("%s/init-stream%d.m4s", folder, repID))
			patched = strings.ReplaceAll(patched,
				"chunk-stream$RepresentationID$-$Number%05d$.m4s",
				fmt.Sprintf("%s/chunk-stream%d-$Number%%05d$.m4s", folder, repID))
			patched = strings.ReplaceAll(patched,
				"stream_$RepresentationID$.mp4",
				fmt.Sprintf("%s/stream_%d.mp4", folder, repID))
			// Generic fallback for any other $RepresentationID$ template usage.
			patched = strings.ReplaceAll(patched, "$RepresentationID$", strconv.Itoa(repID))
			// Safety net for already-expanded concrete names lacking a folder
			// prefix (attribute-start quote ensures no double-prefixing).
			patched = strings.ReplaceAll(patched,
				fmt.Sprintf("\"init-stream%d.m4s\"", repID),
				fmt.Sprintf("\"%s/init-stream%d.m4s\"", folder, repID))
			patched = strings.ReplaceAll(patched,
				fmt.Sprintf("\"chunk-stream%d-", repID),
				fmt.Sprintf("\"%s/chunk-stream%d-", folder, repID))
			return patched
		})
		_ = os.WriteFile(masterMpdPath, []byte(mpd), 0644)
	}

	// 3. Patch media_*.m3u8 playlists (kept at root) to reference subfolders.
	rootEntries, err := os.ReadDir(dashOutputDir)
	if err == nil {
		for _, entry := range rootEntries {
			if entry.IsDir() {
				continue
			}
			m := mediaPlaylistRegex.FindStringSubmatch(entry.Name())
			if len(m) < 2 {
				continue
			}
			repID, err := strconv.Atoi(m[1])
			if err != nil {
				continue
			}
			folder, ok := repFolders[repID]
			if !ok {
				continue
			}
			playlistPath := filepath.Join(dashOutputDir, entry.Name())
			plBytes, err := os.ReadFile(playlistPath)
			if err != nil {
				continue
			}
			content := string(plBytes)
			content = strings.ReplaceAll(content,
				fmt.Sprintf("init-stream%d.m4s", repID),
				fmt.Sprintf("%s/init-stream%d.m4s", folder, repID))
			content = strings.ReplaceAll(content,
				fmt.Sprintf("chunk-stream%d-", repID),
				fmt.Sprintf("%s/chunk-stream%d-", folder, repID))
			content = strings.ReplaceAll(content,
				fmt.Sprintf("stream_%d.mp4", repID),
				fmt.Sprintf("%s/stream_%d.mp4", folder, repID))
			_ = os.WriteFile(playlistPath, []byte(content), 0644)
		}
	}

	return repFolders, nil
}
