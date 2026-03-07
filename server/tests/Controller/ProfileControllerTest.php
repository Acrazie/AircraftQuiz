<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Functional tests for PATCH /api/profile and POST /api/profile/avatar.
 * Requires a running test database with the current schema applied:
 *   php bin/console doctrine:schema:update --env=test --force
 */
class ProfileControllerTest extends WebTestCase
{
    /** Paths of avatar files created on disk — deleted in tearDown. */
    private array $filesToCleanup = [];

    protected function tearDown(): void
    {
        parent::tearDown();
        foreach ($this->filesToCleanup as $path) {
            if (file_exists($path)) {
                unlink($path);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /**
     * Register a fresh user via the given client and return their JWT token.
     * Uses the same client to avoid booting the kernel twice in one test.
     */
    private function registerAndGetToken(KernelBrowser $client): string
    {
        $suffix = uniqid('', true);

        $client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'username' => 'AvatarPilot_' . $suffix,
                'email'    => 'avatar_' . $suffix . '@test.com',
                'password' => 'TestPass123!',
            ])
        );

        $this->assertResponseStatusCodeSame(201);

        return json_decode($client->getResponse()->getContent(), true)['token'];
    }

    /** Create a minimal 1×1 transparent PNG temp file. Returns the path. */
    private function makeTempPng(): string
    {
        $path = sys_get_temp_dir() . '/avatar_test_' . uniqid() . '.png';
        file_put_contents(
            $path,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        );

        return $path;
    }

    /** Create a plain-text temp file (not an image). Returns the path. */
    private function makeTempText(): string
    {
        $path = sys_get_temp_dir() . '/avatar_bad_' . uniqid() . '.txt';
        file_put_contents($path, 'not an image');

        return $path;
    }

    // -----------------------------------------------------------------------
    // PATCH /api/profile — colour update
    // -----------------------------------------------------------------------

    public function testAvatarColorUpdateRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request(
            'PATCH',
            '/api/profile',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['avatarColor' => 'sky'])
        );

        $this->assertResponseStatusCodeSame(401);
    }

    public function testAvatarColorUpdateSucceeds(): void
    {
        $client = static::createClient();
        $token  = $this->registerAndGetToken($client);

        $client->request(
            'PATCH',
            '/api/profile',
            [],
            [],
            [
                'CONTENT_TYPE'       => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
            ],
            json_encode(['avatarColor' => 'sky'])
        );

        $this->assertResponseStatusCodeSame(200);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('sky', $data['avatarColor']);
    }

    public function testAvatarColorUpdateRejectsInvalidColor(): void
    {
        $client = static::createClient();
        $token  = $this->registerAndGetToken($client);

        $client->request(
            'PATCH',
            '/api/profile',
            [],
            [],
            [
                'CONTENT_TYPE'       => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
            ],
            json_encode(['avatarColor' => 'hotpink'])
        );

        $this->assertResponseStatusCodeSame(422);
    }

    // -----------------------------------------------------------------------
    // POST /api/profile/avatar — image upload
    // -----------------------------------------------------------------------

    public function testAvatarUploadRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/profile/avatar');

        $this->assertResponseStatusCodeSame(401);
    }

    public function testAvatarUploadReturnsBadRequestWithNoFile(): void
    {
        $client = static::createClient();
        $token  = $this->registerAndGetToken($client);

        $client->request(
            'POST',
            '/api/profile/avatar',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        $this->assertResponseStatusCodeSame(400);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $data);
    }

    public function testAvatarUploadRejectsInvalidMimeType(): void
    {
        $client  = static::createClient();
        $token   = $this->registerAndGetToken($client);
        $tmpPath = $this->makeTempText();
        $file    = new UploadedFile($tmpPath, 'file.txt', 'text/plain', null, true);

        $client->request(
            'POST',
            '/api/profile/avatar',
            [],
            ['avatar' => $file],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        $this->assertResponseStatusCodeSame(422);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $data);

        if (file_exists($tmpPath)) {
            unlink($tmpPath);
        }
    }

    public function testAvatarUploadSucceedsWithValidPng(): void
    {
        $client  = static::createClient();
        $token   = $this->registerAndGetToken($client);
        $tmpPath = $this->makeTempPng();
        $file    = new UploadedFile($tmpPath, 'avatar.png', 'image/png', null, true);

        $client->request(
            'POST',
            '/api/profile/avatar',
            [],
            ['avatar' => $file],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );

        $this->assertResponseStatusCodeSame(200);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('avatarUrl', $data);
        $this->assertStringStartsWith('http://localhost:8080', $data['avatarUrl']);
        $this->assertStringContainsString('/avatars/', $data['avatarUrl']);

        // File must exist on disk
        $filename   = basename($data['avatarUrl']);
        $uploadPath = dirname(__DIR__, 2) . '/images/avatars/' . $filename;
        $this->assertFileExists($uploadPath);

        $this->filesToCleanup[] = $uploadPath;
    }

    public function testSecondUploadReplacesTheFirst(): void
    {
        $client = static::createClient();
        $token  = $this->registerAndGetToken($client);

        // First upload
        $tmp1  = $this->makeTempPng();
        $file1 = new UploadedFile($tmp1, 'first.png', 'image/png', null, true);
        $client->request(
            'POST', '/api/profile/avatar',
            [], ['avatar' => $file1],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );
        $this->assertResponseStatusCodeSame(200);
        $first     = json_decode($client->getResponse()->getContent(), true);
        $firstPath = dirname(__DIR__, 2) . '/images/avatars/' . basename($first['avatarUrl']);
        $this->filesToCleanup[] = $firstPath;

        // Second upload — controller deletes old file and writes a new one (same UUID path)
        $tmp2  = $this->makeTempPng();
        $file2 = new UploadedFile($tmp2, 'second.png', 'image/png', null, true);
        $client->request(
            'POST', '/api/profile/avatar',
            [], ['avatar' => $file2],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $token]
        );
        $this->assertResponseStatusCodeSame(200);
        $second     = json_decode($client->getResponse()->getContent(), true);
        $secondPath = dirname(__DIR__, 2) . '/images/avatars/' . basename($second['avatarUrl']);
        $this->filesToCleanup[] = $secondPath;

        // Same UUID → same filename → same URL
        $this->assertSame($first['avatarUrl'], $second['avatarUrl']);
        $this->assertFileExists($secondPath);
    }
}
