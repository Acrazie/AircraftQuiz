<?php

namespace App\Controller\Auth;

use App\Entity\User;
use App\Service\AuthTokenService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

final class LoginController extends AbstractController
{
    #[Route('/api/login', name: 'app_login', methods: ['POST'])]
    public function login(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        AuthTokenService $authTokenService,
        RateLimiterFactoryInterface $authLoginLimiter,
    ): JsonResponse {
        $limiter = $authLoginLimiter->create($request->getClientIp());
        if (!$limiter->consume()->isAccepted()) {
            return $this->json(['message' => 'Too many login attempts. Please try again later.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['email']) || !isset($data['password'])) {
            return $this->json(['message' => 'Email or password are required'], Response::HTTP_BAD_REQUEST);
        }

        $user = $entityManager->getRepository(User::class)
            ->findOneBy(['email' => strtolower(trim($data['email']))]);

        if (!$user || !$passwordHasher->isPasswordValid($user, $data['password'])) {
            return $this->json(['message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
        }

        $tokens = $authTokenService->createTokenPair($user);

        return $this->json([
            ...$tokens,
            'user' => $authTokenService->buildUserResponse($user),
        ], Response::HTTP_OK);
    }
}
