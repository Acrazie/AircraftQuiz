# PHPUnit — Symfony 7.4

## Base classes
- `KernelTestCase` → services, repositories
- `WebTestCase` → controllers, HTTP, API endpoints

## Auth simulation (Lexik JWT)
$client = static::createClient();
$user = $this->getEntityManager()->getRepository(User::class)->findOneBy(['email' => 'test@example.com']);
$client->loginUser($user);

## Assertions
- assertResponseStatusCodeSame(200)
- assertResponseIsSuccessful()
- assertSame('expected', $decoded['key'])  // decode with json_decode($client->getResponse()->getContent(), true)

## Naming: test_it_[does]_when_[condition]()

## Example
public function test_it_returns_401_when_token_missing(): void
{
    $client = static::createClient();
    $client->request('GET', '/api/users/me');
    $this->assertResponseStatusCodeSame(401);
}

## Commands
php bin/phpunit
php bin/phpunit tests/Controller/UserControllerTest.php
php bin/phpunit --filter test_it_returns_401