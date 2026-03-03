<?php

namespace App\Controller\Auth;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class GoogleAuthController extends AbstractController
{
    #[Route('/api/auth/google', name: 'app_auth_google', methods: ['POST'])]
    public function googleAuth(
        Request $request,
        HttpClientInterface $httpClient,
        EntityManagerInterface $entityManager,
        JWTTokenManagerInterface $JWTManager,
        RefreshTokenGeneratorInterface $refreshTokenGenerator,
        RefreshTokenManagerInterface $refreshTokenManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['access_token'])) {
            return $this->json(['message' => 'access_token is required'], Response::HTTP_BAD_REQUEST);
        }

        // Fetch user info from Google
        $googleResponse = $httpClient->request('GET', 'https://www.googleapis.com/userinfo/v2/me', [
            'headers' => ['Authorization' => 'Bearer ' . $data['access_token']],
        ]);

        if ($googleResponse->getStatusCode() !== 200) {
            return $this->json(['message' => 'Invalid Google access token'], Response::HTTP_UNAUTHORIZED);
        }

        $googleUser = $googleResponse->toArray();
        $googleId = $googleUser['id'];
        $email = $googleUser['email'] ?? null;
        $name = $googleUser['name'] ?? ($googleUser['given_name'] ?? 'User');

        if (!$email) {
            return $this->json(['message' => 'Google account has no email'], Response::HTTP_BAD_REQUEST);
        }

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
                // Create new user
                $user = new User();
                $user->setUsername($name);
                $user->setEmail($email);
                $user->setGoogleId($googleId);
                $user->setRoles(['ROLE_USER']);
                $user->setLp(0);
                $user->setRank('Unranked');
                $user->setDivision(4);
                $user->setCreationDate(new \DateTimeImmutable());

                $entityManager->persist($user);
                $entityManager->flush();
            }
        }

        $token = $JWTManager->createFromPayload($user, [
            'id' => (string) $user->getId(),
            'displayName' => $user->getUsername(),
            'roles' => $user->getRoles(),
            'rank' => $user->getRank(),
            'lp' => $user->getLp(),
        ]);

        $refreshToken = $refreshTokenGenerator->createForUserWithTtl($user, 2592000);
        $refreshTokenManager->save($refreshToken);

        return $this->json([
            'token' => $token,
            'refresh_token' => $refreshToken->getRefreshToken(),
            'user' => [
                'id' => $user->getId()->toRfc4122(),
                'username' => $user->getUsername(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
                'rank' => $user->getRank(),
                'lp' => $user->getLp(),
            ],
        ], Response::HTTP_OK);
    }
}
