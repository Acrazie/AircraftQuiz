<?php

namespace App\Controller\Auth;

use App\DTO\RegisterRequest;
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
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class RegisterController extends AbstractController
{
    #[Route('/api/register', name: 'app_register', methods: ['POST'])]
    public function register(
        Request $request,
        ValidatorInterface $validator,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $entityManager,
        AuthTokenService $authTokenService,
        RateLimiterFactoryInterface $authRegisterLimiter,
    ): JsonResponse {
        $limiter = $authRegisterLimiter->create($request->getClientIp());
        if (!$limiter->consume()->isAccepted()) {
            return $this->json(['message' => 'Too many registration attempts. Please try again later.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return $this->json(['message' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        $dto = new RegisterRequest(
            username: trim($data['username'] ?? ''),
            email: strtolower(trim($data['email'] ?? '')),
            password: $data['password'] ?? '',
        );

        $violations = $validator->validate($dto);

        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[$violation->getPropertyPath()] = $violation->getMessage();
            }
            return $this->json(['message' => 'Validation failed', 'errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $userRepo = $entityManager->getRepository(User::class);

        if ($userRepo->findOneBy(['email' => $dto->email])) {
            return $this->json(['message' => 'Email address already used'], Response::HTTP_CONFLICT);
        }

        if ($userRepo->findOneBy(['username' => $dto->username])) {
            return $this->json(['message' => 'Username already taken'], Response::HTTP_CONFLICT);
        }

        $user = new User();
        $user->setUsername($dto->username);
        $user->setEmail($dto->email);
        $user->setRoles(['ROLE_USER']);
        $user->setPassword($passwordHasher->hashPassword($user, $dto->password));
        $user->setLp(0);
        $user->setRank(User::DEFAULT_RANK);
        $user->setDivision(User::DEFAULT_DIVISION);
        $user->setCreationDate(new \DateTimeImmutable());

        $entityManager->persist($user);
        $entityManager->flush();

        $tokens = $authTokenService->createTokenPair($user);

        return $this->json([
            ...$tokens,
            'user' => $authTokenService->buildUserResponse($user),
        ], Response::HTTP_CREATED);
    }
}
