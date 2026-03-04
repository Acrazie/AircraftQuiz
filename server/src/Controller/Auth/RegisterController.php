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

final class RegisterController extends AbstractController
{
    #[Route('/api/register', name: 'app_register', methods: ['POST'])]
    public function register(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        JWTTokenManagerInterface $JWTManager,
        RefreshTokenGeneratorInterface $refreshTokenGenerator,
        RefreshTokenManagerInterface $refreshTokenManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
            return $this->json([
                'message' => 'Username, email or password are required'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if user already exists
        $existingUser = $entityManager->getRepository(User::class)
            ->findOneBy(['email' => $data['email']]);

        if ($existingUser) {
            return $this->json([
                'message' => 'Email address already used'
            ], Response::HTTP_CONFLICT);
        }

        $user = new User();
        $user->setUsername($data['username']);
        $user->setEmail($data['email']);
        $user->setRoles(['ROLE_USER']);

        // Hash the password
        $hashedPassword = $passwordHasher->hashPassword(
            $user,
            $data['password']
        );
        $user->setPassword($hashedPassword);

        // Set default values for required fields
        $user->setLp(0);
        $user->setRank('unranked');
        $user->setDivision(4);
        $user->setCreationDate(new \DateTimeImmutable());

        // Persist and save
        $entityManager->persist($user);
        $entityManager->flush();

        // Generate tokens for auto-login
        $token = $JWTManager->createFromPayload($user, [
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'rank' => $user->getRank(),
            'lp' => $user->getLp(),
        ]);

        $refreshToken = $refreshTokenGenerator->createForUserWithTtl($user, 2592000);
        $refreshTokenManager->save($refreshToken);

        return $this->json([
            'token'         => $token,
            'refresh_token' => $refreshToken->getRefreshToken(),
            'user'          => [
                'id'       => $user->getId()->toRfc4122(),
                'username' => $user->getUsername(),
                'email'    => $user->getEmail(),
                'roles'    => $user->getRoles(),
                'lp'       => $user->getLp(),
                'rank'     => $user->getRank(),
                'division' => $user->getDivision(),
            ],
        ], Response::HTTP_CREATED);
    }
}
