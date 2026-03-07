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
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

final class LoginController extends AbstractController
{
    #[Route('/api/login', name: 'app_login', methods: ['POST'])]
    public function register(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        JWTTokenManagerInterface $JWTManager,
        RefreshTokenGeneratorInterface $refreshTokenGenerator,
        RefreshTokenManagerInterface $refreshTokenManager
    ): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['email']) || !isset($data['password'])) {
            return $this->json([
                'message' => 'Email or password are required'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if user already exists
        $user = $entityManager->getRepository(User::class)
            ->findOneBy(['email' => $data['email']]);

        if (!$user) {
            return $this->json([
                'message' => 'Invalid credentials'
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!$passwordHasher->isPasswordValid($user, $data['password'])) {
            return $this->json([
                'message' => 'Invalid credentials'
            ], Response::HTTP_UNAUTHORIZED);
        }

        $token = $JWTManager->createFromPayload($user, [
            'id' => (string) $user->getId(),
            'displayName' => $user->getUsername(),
            'roles' => $user->getRoles(),
            'rank' => $user->getRank(),
            'lp' => $user->getLp(),
        ]);

        $refreshToken = $refreshTokenGenerator->createForUserWithTtl($user,
        2592000);
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
                'division' => $user->getDivision(),
                'lp' => $user->getLp(),
                'avatarColor' => $user->getAvatarColor(),
                'avatarUrl'   => $user->getAvatarUrl(),
            ]
        ], Response::HTTP_OK);
    }
}
