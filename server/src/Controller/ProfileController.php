<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\StorageService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class ProfileController extends AbstractController
{
    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    #[Route('/api/profile', name: 'app_profile_update', methods: ['PATCH'])]
    public function update(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['avatarColor'])) {
            return $this->json(['message' => 'avatarColor is required'], Response::HTTP_BAD_REQUEST);
        }

        if (!in_array($data['avatarColor'], User::ALLOWED_AVATAR_COLORS, true)) {
            return $this->json(['message' => 'Invalid avatarColor value'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        /** @var User $user */
        $user = $this->getUser();
        $user->setAvatarColor($data['avatarColor']);
        $em->flush();

        return $this->json(['avatarColor' => $user->getAvatarColor()]);
    }

    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    #[Route('/api/profile/avatar', name: 'app_profile_avatar', methods: ['POST'])]
    public function uploadAvatar(
        Request $request,
        EntityManagerInterface $em,
        StorageService $storageService,
    ): JsonResponse {
        $file = $request->files->get('avatar');

        if (!$file) {
            return $this->json(['message' => 'No file uploaded'], Response::HTTP_BAD_REQUEST);
        }

        if ($file->getSize() > self::MAX_SIZE) {
            return $this->json(['message' => 'File too large (max 2 MB)'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, self::ALLOWED_MIME, true)) {
            return $this->json(['message' => 'Invalid file type'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $imageInfo = @getimagesize($file->getPathname());
        if ($imageInfo === false) {
            return $this->json(['message' => 'File is not a valid image'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!$storageService->isConfigured()) {
            return $this->json(
                ['message' => 'Avatar upload is not available (storage not configured)'],
                Response::HTTP_SERVICE_UNAVAILABLE
            );
        }

        /** @var User $user */
        $user = $this->getUser();

        try {
            $avatarUrl = $storageService->uploadAvatar($user, $file);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $user->setAvatarUrl($avatarUrl);
        $em->flush();

        return $this->json(['avatarUrl' => $avatarUrl]);
    }
}
