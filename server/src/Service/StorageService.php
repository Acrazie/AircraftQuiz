<?php

namespace App\Service;

use App\Entity\User;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class StorageService
{
    private ?S3Client $s3Client = null;

    public function __construct(
        private readonly string $r2Endpoint,
        private readonly string $r2AccessKeyId,
        private readonly string $r2SecretAccessKey,
        private readonly string $r2Bucket,
        private readonly string $r2PublicUrl,
        private readonly LoggerInterface $logger,
    ) {}

    public function isConfigured(): bool
    {
        return $this->r2Endpoint !== '' && $this->r2AccessKeyId !== '' && $this->r2SecretAccessKey !== '';
    }

    /**
     * Upload an avatar for the given user, replacing the old one if present.
     *
     * @return string The public URL of the uploaded avatar.
     *
     * @throws \RuntimeException If the upload fails.
     */
    public function uploadAvatar(User $user, UploadedFile $file): string
    {
        $client = $this->getClient();

        // Delete old avatar from R2 if it exists
        $oldUrl = $user->getAvatarUrl();
        if ($oldUrl) {
            $this->deleteAvatar($oldUrl);
        }

        $ext = $file->guessExtension() ?? 'jpg';
        $filename = $user->getId()->toRfc4122() . '.' . $ext;
        $key = 'avatars/' . $filename;

        try {
            $client->putObject([
                'Bucket'      => $this->r2Bucket,
                'Key'         => $key,
                'SourceFile'  => $file->getPathname(),
                'ContentType' => $file->getMimeType(),
            ]);
        } catch (S3Exception $e) {
            $this->logger->error('R2 avatar upload failed', ['error' => $e->getAwsErrorMessage()]);
            throw new \RuntimeException('Avatar upload failed. Please try again.', 0, $e);
        }

        return $this->r2PublicUrl . '/' . $key;
    }

    /**
     * Delete an avatar from R2 by its public URL.
     */
    public function deleteAvatar(string $url): void
    {
        // Derive the S3 key by stripping the public URL prefix
        $key = ltrim(str_replace($this->r2PublicUrl, '', $url), '/');

        if ($key === '' || $key === $url) {
            // URL does not match the expected public prefix — skip deletion
            return;
        }

        try {
            $this->getClient()->deleteObject([
                'Bucket' => $this->r2Bucket,
                'Key'    => $key,
            ]);
        } catch (S3Exception $e) {
            $this->logger->warning('R2 avatar deletion failed', ['key' => $key, 'error' => $e->getAwsErrorMessage()]);
        }
    }

    private function getClient(): S3Client
    {
        if ($this->s3Client === null) {
            $this->s3Client = new S3Client([
                'version'                 => 'latest',
                'region'                  => 'auto',
                'endpoint'                => $this->r2Endpoint,
                'credentials'             => [
                    'key'    => $this->r2AccessKeyId,
                    'secret' => $this->r2SecretAccessKey,
                ],
                'use_path_style_endpoint' => true,
            ]);
        }

        return $this->s3Client;
    }
}
