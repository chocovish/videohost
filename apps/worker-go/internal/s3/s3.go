package s3

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"videohost-worker-go/internal/urlutils"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	s3client "github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	smithy "github.com/aws/smithy-go"
)

type S3ConfigContext struct {
	Endpoint        string `json:"endpoint"`
	AccessKeyId     string `json:"accessKeyId"`
	SecretAccessKey string `json:"secretAccessKey"`
	Bucket          string `json:"bucket"`
	Region          string `json:"region,omitempty"`
	CdnHost         string `json:"cdnHost,omitempty"`
}

var (
	ociRegex = regexp.MustCompile(`(?i)(?:compat\.objectstorage|objectstorage)\.([a-z0-9-]+)\.oraclecloud\.com`)
	awsRegex = regexp.MustCompile(`(?i)s3[.-]([a-z0-9-]+)\.amazonaws\.com`)
)

func GetRegionFromEndpoint(endpoint string, overrideRegion string) string {
	if overrideRegion != "" && overrideRegion != "auto" {
		return overrideRegion
	}
	if matches := ociRegex.FindStringSubmatch(endpoint); len(matches) > 1 {
		return matches[1]
	}
	if matches := awsRegex.FindStringSubmatch(endpoint); len(matches) > 1 {
		return matches[1]
	}
	return "auto"
}

type S3ClientInfo struct {
	Client  *s3client.Client
	Bucket  string
	CdnHost string
}

func GetS3ClientAndBucket(ctx context.Context, cfg *S3ConfigContext) (*S3ClientInfo, error) {
	if cfg == nil || cfg.Endpoint == "" {
		return nil, errors.New("S3 configuration with endpoint is required from payload")
	}

	rawEndpoint := cfg.Endpoint
	endpoint := urlutils.UseDockerHostForLocalhost(rawEndpoint)

	accessKeyId := cfg.AccessKeyId
	if accessKeyId == "" {
		accessKeyId = "minioadmin"
	}

	secretAccessKey := cfg.SecretAccessKey
	if secretAccessKey == "" {
		secretAccessKey = "passpass"
	}

	bucket := cfg.Bucket
	if bucket == "" {
		bucket = "videohost"
	}

	region := GetRegionFromEndpoint(rawEndpoint, cfg.Region)
	clientRegion := region
	if clientRegion == "" || clientRegion == "auto" {
		clientRegion = "us-east-1"
	}

	cdnHost := cfg.CdnHost
	if cdnHost == "" {
		cdnHost = fmt.Sprintf("%s/%s", strings.TrimRight(rawEndpoint, "/"), bucket)
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(clientRegion),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyId, secretAccessKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3client.NewFromConfig(awsCfg, func(o *s3client.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
		if clientRegion != "" {
			o.Region = clientRegion
		}
	})

	return &S3ClientInfo{
		Client:  client,
		Bucket:  bucket,
		CdnHost: cdnHost,
	}, nil
}

func EnsureBucketExists(ctx context.Context, cfg *S3ConfigContext) error {
	info, err := GetS3ClientAndBucket(ctx, cfg)
	if err != nil {
		return err
	}

	_, headErr := info.Client.HeadBucket(ctx, &s3client.HeadBucketInput{
		Bucket: aws.String(info.Bucket),
	})

	if headErr != nil {
		// Attempt to create bucket
		_, createErr := info.Client.CreateBucket(ctx, &s3client.CreateBucketInput{
			Bucket: aws.String(info.Bucket),
		})
		if createErr != nil {
			var apiErr smithy.APIError
			if !errors.As(createErr, &apiErr) || (apiErr.ErrorCode() != "BucketAlreadyOwnedByYou" && apiErr.ErrorCode() != "BucketAlreadyExists") {
				fmt.Printf("[S3] Failed to auto-create bucket %s: %v\n", info.Bucket, createErr)
			}
		}
	}

	// Set CORS configuration
	_, _ = info.Client.PutBucketCors(ctx, &s3client.PutBucketCorsInput{
		Bucket: aws.String(info.Bucket),
		CORSConfiguration: &s3types.CORSConfiguration{
			CORSRules: []s3types.CORSRule{
				{
					AllowedHeaders: []string{"*"},
					AllowedMethods: []string{"GET", "PUT", "POST", "DELETE", "HEAD"},
					AllowedOrigins: []string{"*"},
					ExposeHeaders:  []string{"ETag", "Content-Range", "Accept-Ranges", "Content-Length"},
					MaxAgeSeconds:  aws.Int32(3000),
				},
			},
		},
	})

	return nil
}

func DownloadFileFromS3(ctx context.Context, key, destinationPath string, cfg *S3ConfigContext) error {
	info, err := GetS3ClientAndBucket(ctx, cfg)
	if err != nil {
		return err
	}

	out, err := info.Client.GetObject(ctx, &s3client.GetObjectInput{
		Bucket: aws.String(info.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("GetObject failed for key %s in bucket %s: %w", key, info.Bucket, err)
	}
	defer out.Body.Close()

	if err := os.MkdirAll(filepath.Dir(destinationPath), 0755); err != nil {
		return err
	}

	destFile, err := os.Create(destinationPath)
	if err != nil {
		return fmt.Errorf("failed to create destination file %s: %w", destinationPath, err)
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, out.Body)
	if err != nil {
		return fmt.Errorf("failed writing downloaded S3 data: %w", err)
	}

	return nil
}

func UploadFileToS3(ctx context.Context, filePath, key, contentType string, cfg *S3ConfigContext) (string, error) {
	_ = EnsureBucketExists(ctx, cfg)
	info, err := GetS3ClientAndBucket(ctx, cfg)
	if err != nil {
		return "", err
	}

	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file %s for S3 upload: %w", filePath, err)
	}
	defer file.Close()

	uploader := manager.NewUploader(info.Client, func(u *manager.Uploader) {
		u.PartSize = 5 * 1024 * 1024 // 5MB part size
		u.Concurrency = 4
	})

	_, err = uploader.Upload(ctx, &s3client.PutObjectInput{
		Bucket:      aws.String(info.Bucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed uploading %s to S3: %w", key, err)
	}

	return fmt.Sprintf("%s/%s", strings.TrimRight(info.CdnHost, "/"), strings.TrimLeft(key, "/")), nil
}

func DetectContentType(fileName string) string {
	ext := strings.ToLower(filepath.Ext(fileName))
	switch ext {
	case ".m3u8":
		return "application/x-mpegURL"
	case ".mpd":
		return "application/dash+xml"
	case ".ts":
		return "video/MP2T"
	case ".m4s", ".mp4":
		return "video/mp4"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".webp":
		return "image/webp"
	case ".vtt":
		return "text/vtt"
	default:
		return "application/octet-stream"
	}
}

func UploadDirectoryToS3(ctx context.Context, dirPath, keyPrefix string, cfg *S3ConfigContext, onProgress func(ratio float64)) error {
	_ = EnsureBucketExists(ctx, cfg)
	info, err := GetS3ClientAndBucket(ctx, cfg)
	if err != nil {
		return err
	}

	var filePaths []string
	err = filepath.Walk(dirPath, func(p string, fileInfo os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if !fileInfo.IsDir() {
			filePaths = append(filePaths, p)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to walk directory %s: %w", dirPath, err)
	}

	totalFiles := len(filePaths)
	if totalFiles == 0 {
		return nil
	}

	uploader := manager.NewUploader(info.Client, func(u *manager.Uploader) {
		u.PartSize = 5 * 1024 * 1024
		u.Concurrency = 4
	})

	concurrency := 5
	if totalFiles < concurrency {
		concurrency = totalFiles
	}

	jobs := make(chan string, totalFiles)
	for _, p := range filePaths {
		jobs <- p
	}
	close(jobs)

	var wg sync.WaitGroup
	var progressMu sync.Mutex
	var errOnce sync.Once
	var uploadErr error

	uploadCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	uploadedCount := 0

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for fullPath := range jobs {
				select {
				case <-uploadCtx.Done():
					return
				default:
				}

				relPath, relErr := filepath.Rel(dirPath, fullPath)
				if relErr != nil {
					continue
				}
				forwardRelPath := filepath.ToSlash(relPath)
				s3Key := fmt.Sprintf("%s/%s", strings.TrimRight(keyPrefix, "/"), forwardRelPath)
				contentType := DetectContentType(fullPath)

				file, openErr := os.Open(fullPath)
				if openErr != nil {
					errOnce.Do(func() {
						uploadErr = fmt.Errorf("failed to open file %s: %w", fullPath, openErr)
						cancel()
					})
					return
				}

				_, upErr := uploader.Upload(uploadCtx, &s3client.PutObjectInput{
					Bucket:      aws.String(info.Bucket),
					Key:         aws.String(s3Key),
					Body:        file,
					ContentType: aws.String(contentType),
				})
				file.Close()

				if upErr != nil {
					errOnce.Do(func() {
						uploadErr = fmt.Errorf("failed to upload directory file %s to S3: %w", s3Key, upErr)
						cancel()
					})
					return
				}

				progressMu.Lock()
				uploadedCount++
				if onProgress != nil && totalFiles > 0 {
					onProgress(float64(uploadedCount) / float64(totalFiles))
				}
				progressMu.Unlock()
			}
		}()
	}

	wg.Wait()

	if uploadErr != nil {
		return uploadErr
	}

	return nil
}

func DeleteS3Prefix(ctx context.Context, prefix string, cfg *S3ConfigContext) error {
	if prefix == "" || cfg == nil {
		return nil
	}
	normalizedPrefix := prefix
	if !strings.HasSuffix(normalizedPrefix, "/") {
		normalizedPrefix += "/"
	}
	fmt.Printf("[S3 Delete Prefix] Deleting prefix \"%s\"...\n", normalizedPrefix)
	info, err := GetS3ClientAndBucket(ctx, cfg)
	if err != nil {
		return err
	}

	var continuationToken *string
	totalDeleted := 0

	for {
		listOut, err := info.Client.ListObjectsV2(ctx, &s3client.ListObjectsV2Input{
			Bucket:            aws.String(info.Bucket),
			Prefix:            aws.String(normalizedPrefix),
			ContinuationToken: continuationToken,
		})
		if err != nil {
			return fmt.Errorf("failed listing prefix %s: %w", normalizedPrefix, err)
		}

		if len(listOut.Contents) > 0 {
			var keysToDelete []s3types.ObjectIdentifier
			for _, obj := range listOut.Contents {
				if obj.Key != nil {
					keysToDelete = append(keysToDelete, s3types.ObjectIdentifier{Key: obj.Key})
				}
			}

			// Batch delete up to 1000 keys per request (DeleteObjects limit)
			for i := 0; i < len(keysToDelete); i += 1000 {
				end := i + 1000
				if end > len(keysToDelete) {
					end = len(keysToDelete)
				}
				batch := keysToDelete[i:end]
				delOut, err := info.Client.DeleteObjects(ctx, &s3client.DeleteObjectsInput{
					Bucket: aws.String(info.Bucket),
					Delete: &s3types.Delete{Objects: batch, Quiet: aws.Bool(false)},
				})
				if err != nil {
					// fallback to individual deletes
					for _, k := range batch {
						_, _ = info.Client.DeleteObject(ctx, &s3client.DeleteObjectInput{
							Bucket: aws.String(info.Bucket),
							Key:    k.Key,
						})
						totalDeleted++
					}
					continue
				}
				totalDeleted += len(delOut.Deleted)
				if len(delOut.Errors) > 0 {
					for _, e := range delOut.Errors {
						if e.Key != nil {
							_, _ = info.Client.DeleteObject(ctx, &s3client.DeleteObjectInput{
								Bucket: aws.String(info.Bucket),
								Key:    e.Key,
							})
							totalDeleted++
						}
					}
				}
			}
		}

		if listOut.NextContinuationToken == nil {
			break
		}
		continuationToken = listOut.NextContinuationToken
	}

	fmt.Printf("[S3 Delete Prefix] Deleted %d object(s) under prefix \"%s\"\n", totalDeleted, normalizedPrefix)
	return nil
}

func DeleteS3Object(ctx context.Context, key string, cfg *S3ConfigContext) error {
	if key == "" || cfg == nil {
		return nil
	}
	info, err := GetS3ClientAndBucket(ctx, cfg)
	if err != nil {
		return err
	}
	_, err = info.Client.DeleteObject(ctx, &s3client.DeleteObjectInput{
		Bucket: aws.String(info.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed deleting S3 object %s: %w", key, err)
	}
	fmt.Printf("[S3 Delete Object] Deleted object \"%s\"\n", key)
	return nil
}

