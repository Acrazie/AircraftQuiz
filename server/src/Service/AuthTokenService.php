<?php

namespace App\Service;

use App\Entity\User;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;

final class AuthTokenService
{
    public const REFRESH_TOKEN_TTL = 2_592_000; // 30 days

    public function __construct(
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly RefreshTokenGeneratorInterface $refreshTokenGenerator,
        private readonly RefreshTokenManagerInterface $refreshTokenManager,
    ) {}

    /**
     * Create a JWT + refresh token pair for the given user.
     *
     * @return array{token: string, refresh_token: string}
     */
    public function createTokenPair(User $user): array
    {
        $token = $this->jwtManager->createFromPayload($user, [
            'id' => (string) $user->getId(),
            'displayName' => $user->getUsername(),
            'roles' => $user->getRoles(),
            'rank' => $user->getRank(),
            'lp' => $user->getLp(),
        ]);

        $refreshToken = $this->refreshTokenGenerator->createForUserWithTtl($user, self::REFRESH_TOKEN_TTL);
        $this->refreshTokenManager->save($refreshToken);

        return [
            'token' => $token,
            'refresh_token' => $refreshToken->getRefreshToken(),
        ];
    }

    /**
     * Build the standard user payload for API responses.
     */
    public function buildUserResponse(User $user): array
    {
        return [
            'id'          => $user->getId()->toRfc4122(),
            'username'    => $user->getUsername(),
            'email'       => $user->getEmail(),
            'roles'       => $user->getRoles(),
            'rank'        => $user->getRank(),
            'division'    => $user->getDivision(),
            'lp'          => $user->getLp(),
            'avatarColor' => $user->getAvatarColor(),
            'avatarUrl'   => $user->getAvatarUrl(),
        ];
    }
}
