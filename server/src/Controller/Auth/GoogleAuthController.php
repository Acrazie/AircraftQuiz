<?php

namespace App\Controller\Auth;

use App\Entity\User;
use App\Service\AuthTokenService;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class GoogleAuthController extends AbstractController
{
    private const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
    private const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
    private const JWKS_CACHE_KEY = 'google_jwks';
    private const JWKS_CACHE_TTL_FALLBACK = 3600; // 1 hour fallback

    #[Route('/api/auth/google', name: 'app_auth_google', methods: ['POST'])]
    public function googleAuth(
        Request $request,
        HttpClientInterface $httpClient,
        EntityManagerInterface $entityManager,
        AuthTokenService $authTokenService,
        RateLimiterFactoryInterface $authGoogleLimiter,
        CacheInterface $cache,
    ): JsonResponse {
        $limiter = $authGoogleLimiter->create($request->getClientIp());
        if (!$limiter->consume()->isAccepted()) {
            return $this->json(['message' => 'Too many attempts. Please try again later.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['id_token']) || !is_string($data['id_token'])) {
            return $this->json(['message' => 'id_token is required'], Response::HTTP_BAD_REQUEST);
        }

        $googleClientId = $this->getParameter('app.google_client_id');
        if (empty($googleClientId)) {
            return $this->json(['message' => 'Google login is not configured'], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $verifyResult = $this->verifyIdToken($data['id_token'], $googleClientId, $cache, $httpClient);

        // On failure, bust the JWKS cache and retry once (handles Google key rotation)
        if ($verifyResult === null) {
            $cache->delete(self::JWKS_CACHE_KEY);
            $verifyResult = $this->verifyIdToken($data['id_token'], $googleClientId, $cache, $httpClient);
        }

        if ($verifyResult === null) {
            return $this->json(['message' => 'Failed to verify Google token'], Response::HTTP_UNAUTHORIZED);
        }

        ['googleId' => $googleId, 'email' => $email, 'name' => $name] = $verifyResult;

        $userRepo = $entityManager->getRepository(User::class);

        // Look up by googleId first, then by email
        $user = $userRepo->findOneBy(['googleId' => $googleId]);

        if (!$user) {
            $user = $userRepo->findOneBy(['email' => $email]);

            if ($user) {
                // Link Google account to existing email user
                $user->setGoogleId($googleId);
                $entityManager->flush();
            } else {
                // Sanitize Google name against User entity constraints
                $safeName = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $name);
                $safeName = substr(trim($safeName), 0, 30);
                if (strlen($safeName) < 3) {
                    $safeName = 'user_' . substr(md5($googleId), 0, 8);
                }

                $user = new User();
                $user->setUsername($safeName);
                $user->setEmail($email);
                $user->setGoogleId($googleId);
                $user->setRoles(['ROLE_USER']);
                $user->setLp(0);
                $user->setRank(User::DEFAULT_RANK);
                $user->setDivision(User::DEFAULT_DIVISION);
                $user->setCreationDate(new \DateTimeImmutable());

                $entityManager->persist($user);
                $entityManager->flush();
            }
        }

        $tokens = $authTokenService->createTokenPair($user);

        return $this->json([
            ...$tokens,
            'user' => $authTokenService->buildUserResponse($user),
        ], Response::HTTP_OK);
    }

    /**
     * Verify a Google ID token and extract user info.
     * Returns null on any verification failure.
     *
     * @return array{googleId: string, email: string, name: string}|null
     */
    private function verifyIdToken(
        string $idToken,
        string $googleClientId,
        CacheInterface $cache,
        HttpClientInterface $httpClient,
    ): ?array {
        try {
            $jwks = $cache->get(self::JWKS_CACHE_KEY, function (ItemInterface $item) use ($httpClient): array {
                $response = $httpClient->request('GET', self::GOOGLE_JWKS_URL, ['timeout' => 10]);

                // Use Google's Cache-Control max-age for TTL
                $cacheControl = $response->getHeaders()['cache-control'][0] ?? '';
                $ttl = self::JWKS_CACHE_TTL_FALLBACK;
                if (preg_match('/max-age=(\d+)/', $cacheControl, $matches)) {
                    $ttl = (int) $matches[1];
                }
                $item->expiresAfter($ttl);

                return $response->toArray();
            });

            $keys = JWK::parseKeySet($jwks);
            $payload = JWT::decode($idToken, $keys);

            if (!in_array($payload->iss, self::GOOGLE_ISSUERS, true)) {
                return null;
            }

            if ($payload->aud !== $googleClientId) {
                return null;
            }

            $googleId = $payload->sub ?? null;
            if (!$googleId) {
                return null;
            }

            $email = $payload->email ?? null;
            if (!$email) {
                return null;
            }

            $name = $payload->name ?? ($payload->given_name ?? 'User');

            return ['googleId' => $googleId, 'email' => $email, 'name' => $name];
        } catch (\Throwable) {
            return null;
        }
    }
}
