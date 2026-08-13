package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type S3ConfigContext struct {
	Endpoint        string `json:"endpoint,omitempty"`
	AccessKeyId     string `json:"accessKeyId,omitempty"`
	SecretAccessKey string `json:"secretAccessKey,omitempty"`
	Bucket          string `json:"bucket,omitempty"`
	Region          string `json:"region,omitempty"`
	CdnHost         string `json:"cdnHost,omitempty"`
}

type S3ClientInfo struct {
	Client  *s3.Client
	Bucket  string
	CdnHost string
}

func cleanEnv(val, fallback string) string {
	if val == "" {
		return fallback
	}
	cleaned := strings.Trim(strings.TrimSpace(val), "\"'`\r\n")
	if cleaned == "" {
		return fallback
	}
	return cleaned
}

func getRegionFromEndpoint(endpoint, overrideRegion string) string {
	if overrideRegion != "" && overrideRegion != "auto" {
		return overrideRegion
	}
	if envRegion := os.Getenv("R2_REGION"); envRegion != "" {
		return cleanEnv(envRegion, "us-east-1")
	}
	if envRegion := os.Getenv("S3_REGION"); envRegion != "" {
		return cleanEnv(envRegion, "us-east-1")
	}

	ociRegex := regexp.MustCompile(`(?i)(?:compat\.objectstorage|objectstorage)\.([a-z0-9-]+)\.oraclecloud\.com`)
	if matches := ociRegex.FindStringSubmatch(endpoint); len(matches) > 1 {
		return matches[1]
	}

	awsRegex := regexp.MustCompile(`(?i)s3[.-]([a-z0-9-]+)\.amazonaws\.com`)
	if matches := awsRegex.FindStringSubmatch(endpoint); len(matches) > 1 {
		return matches[1]
	}

	return "us-east-1"
}

func GetS3ClientAndBucket(config *S3ConfigContext) *S3ClientInfo {
	rawEndpoint := cleanEnv(func() string {
		if config != nil && config.Endpoint != "" {
			return config.Endpoint
		}
		return os.Getenv("R2_ENDPOINT")
	}(), "http://localhost:9000")

	endpoint := ReplaceLocalhost(rawEndpoint)
	accessKeyId := cleanEnv(func() string {
		if config != nil && config.AccessKeyId != "" {
			return config.AccessKeyId
		}
		return os.Getenv("R2_ACCESS_KEY_ID")
	}(), "minioadmin")

	secretAccessKey := cleanEnv(func() string {
		if config != nil && config.SecretAccessKey != "" {
			return config.SecretAccessKey
		}
		return os.Getenv("R2_SECRET_ACCESS_KEY")
	}(), "passpass")

	bucket := cleanEnv(func() string {
		if config != nil && config.Bucket != "" {
			return config.Bucket
		}
		return os.Getenv("R2_BUCKET_NAME")
	}(), "videohost")

	region := getRegionFromEndpoint(rawEndpoint, func() string {
		if config != nil {
			return config.Region
		}
		return ""
	}())

	cdnHost := cleanEnv(func() string {
		if config != nil && config.CdnHost != "" {
			return config.CdnHost
		}
		return ""
	}(), fmt.Sprintf("%s/%s", strings.TrimRight(rawEndpoint, "/"), bucket))

	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, reg string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			PartitionID:       "aws",
			URL:               endpoint,
			SigningRegion:     region,
			HostnameImmutable: true,
		}, nil
	})

	awsCfg := aws.Config{
		Region:                      region,
		Credentials:                 credentials.NewStaticCredentialsProvider(accessKeyId, secretAccessKey, ""),
		EndpointResolverWithOptions: customResolver,
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	return &S3ClientInfo{
		Client:  client,
		Bucket:  bucket,
		CdnHost: cdnHost,
	}
}

func EnsureBucketExists(config *S3ConfigContext) error {
	info := GetS3ClientAndBucket(config)
	ctx := context.Background()

	_, err := info.Client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(info.Bucket),
	})
	if err != nil {
		_, createErr := info.Client.CreateBucket(ctx, &s3.CreateBucketInput{
			Bucket: aws.String(info.Bucket),
		})
		if createErr != nil {
			fmt.Printf("Failed to auto-create bucket: %v\n", createErr)
		}
	}

	_, _ = info.Client.PutBucketCors(ctx, &s3.PutBucketCorsInput{
		Bucket: aws.String(info.Bucket),
		CORSConfiguration: &types.CORSConfiguration{
			CORSRules: []types.CORSRule{
				{
					AllowedHeaders: []string{"*"},
					AllowedMethods: []string{"GET", "PUT", "POST", "DELETE", "HEAD"},
					AllowedOrigins: []string{"*"},
					ExposeHeaders:  []string{"ETag"},
					MaxAgeSeconds:  aws.Int32(3000),
				},
			},
		},
	})

	return nil
}

func DownloadFileFromS3(key, destinationPath string, config *S3ConfigContext) error {
	info := GetS3ClientAndBucket(config)
	ctx := context.Background()

	output, err := info.Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(info.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to download file from S3 (bucket: %s, key: %s): %w", info.Bucket, key, err)
	}
	defer output.Body.Close()

	if err := os.MkdirAll(filepath.Dir(destinationPath), 0755); err != nil {
		return err
	}

	outFile, err := os.Create(destinationPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	_, err = io.Copy(outFile, output.Body)
	return err
}

func UploadFileToS3(filePath, key, contentType string, config *S3ConfigContext) (string, error) {
	if err := EnsureBucketExists(config); err != nil {
		// Log but continue
	}
	info := GetS3ClientAndBucket(config)
	ctx := context.Background()

	fileBytes, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file for upload: %w", err)
	}

	_, err = info.Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(info.Bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(fileBytes),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file to S3: %w", err)
	}

	url := fmt.Sprintf("%s/%s", strings.TrimRight(info.CdnHost, "/"), key)
	return url, nil
}

func UploadDirectoryToS3(dirPath, keyPrefix string, config *S3ConfigContext, onProgress func(ratio float64)) error {
	if err := EnsureBucketExists(config); err != nil {
		// Log but continue
	}

	var filePaths []string
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			filePaths = append(filePaths, path)
		}
		return nil
	})
	if err != nil {
		return err
	}

	totalFiles := len(filePaths)
	uploadedCount := 0

	for _, fullPath := range filePaths {
		relPath, err := filepath.Rel(dirPath, fullPath)
		if err != nil {
			relPath = filepath.Base(fullPath)
		}
		slashRelPath := strings.ReplaceAll(relPath, "\\", "/")
		s3Key := fmt.Sprintf("%s/%s", strings.TrimRight(keyPrefix, "/"), slashRelPath)

		contentType := "application/octet-stream"
		lower := strings.ToLower(slashRelPath)
		if strings.HasSuffix(lower, ".m3u8") {
			contentType = "application/x-mpegURL"
		} else if strings.HasSuffix(lower, ".ts") {
			contentType = "video/MP2T"
		} else if strings.HasSuffix(lower, ".m4s") || strings.HasSuffix(lower, ".mp4") {
			contentType = "video/mp4"
		} else if strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg") {
			contentType = "image/jpeg"
		} else if strings.HasSuffix(lower, ".webp") {
			contentType = "image/webp"
		} else if strings.HasSuffix(lower, ".vtt") {
			contentType = "text/vtt"
		}

		if _, err := UploadFileToS3(fullPath, s3Key, contentType, config); err != nil {
			return err
		}

		uploadedCount++
		if onProgress != nil && totalFiles > 0 {
			onProgress(float64(uploadedCount) / float64(totalFiles))
		}
	}

	return nil
}
