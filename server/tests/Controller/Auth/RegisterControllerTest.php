<?php

namespace App\Tests\Controller\Auth;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Functional tests for POST /api/register.
 * Requires a running database.
 */
class RegisterControllerTest extends WebTestCase
{
    private static string $uniqueSuffix;

    public static function setUpBeforeClass(): void
    {
        static::$uniqueSuffix = uniqid();
    }

    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'username' => 'TestPilot_' . static::$uniqueSuffix,
            'email'    => 'pilot_' . static::$uniqueSuffix . '@test.com',
            'password' => 'SecurePass123!',
        ], $overrides);
    }

    public function testRegisterReturns201WithTokens(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($this->registerPayload())
        );

        $this->assertResponseStatusCodeSame(201);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('token', $data);
        $this->assertArrayHasKey('refresh_token', $data);
        $this->assertArrayHasKey('user', $data);
        $this->assertSame('TestPilot_' . static::$uniqueSuffix, $data['user']['username']);
        $this->assertSame(0, $data['user']['lp']);
        $this->assertSame('unranked', $data['user']['rank']);
    }

    public function testRegisterReturnsBadRequestWhenFieldsMissing(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => 'NoEmail'])
        );

        $this->assertResponseStatusCodeSame(400);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $data);
    }

    public function testRegisterReturnsConflictOnDuplicateEmail(): void
    {
        $client = static::createClient();
        $payload = json_encode($this->registerPayload(['email' => 'dup_' . static::$uniqueSuffix . '@test.com']));

        // First registration
        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], $payload);
        $this->assertResponseStatusCodeSame(201);

        // Duplicate
        $client->request('POST', '/api/register', [], [], ['CONTENT_TYPE' => 'application/json'], $payload);
        $this->assertResponseStatusCodeSame(409);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $data);
    }
}
