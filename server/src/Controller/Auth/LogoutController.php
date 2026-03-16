<?php

namespace App\Controller\Auth;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Gesdinet\JWTRefreshTokenBundle\Entity\RefreshToken;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class LogoutController extends AbstractController
{
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    #[Route('/api/logout', name: 'app_logout', methods: ['POST'])]
    public function logout(
        Request $request,
        RefreshTokenManagerInterface $refreshTokenManager,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (isset($data['refresh_token']) && is_string($data['refresh_token'])) {
            // Delete specific refresh token
            $refreshToken = $refreshTokenManager->get($data['refresh_token']);
            if ($refreshToken !== null) {
                $refreshTokenManager->delete($refreshToken);
            }
        } else {
            // Delete all refresh tokens for the authenticated user
            /** @var User $user */
            $user = $this->getUser();
            $entityManager->createQueryBuilder()
                ->delete(RefreshToken::class, 'rt')
                ->where('rt.username = :username')
                ->setParameter('username', $user->getUserIdentifier())
                ->getQuery()
                ->execute();
        }

        return $this->json(['message' => 'Logged out successfully'], Response::HTTP_OK);
    }
}
