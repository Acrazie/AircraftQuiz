<?php

namespace App\Controller;

use App\Entity\User;
use Aws\S3\S3Client;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ProfileController extends AbstractController
{
    private const ALLOWED_COLORS = [
        'sky', 'navy', 'emerald', 'gold', 'orange', 'crimson',
        'purple', 'indigo', 'cyan', 'teal', 'rose', 'slate',
        'lime', 'amber', 'violet',
    ];

    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

    #[Route('/api/profile', name: 'app_profile_update', methods: ['PATCH'])]
    public function update(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['avatarColor'])) {
            return $this->json(['message' => 'avatarColor is required'], Response::HTTP_BAD_REQUEST);
        }

        if (!in_array($data['avatarColor'], self::ALLOWED_COLORS, true)) {
            return $this->json(['message' => 'Invalid avatarColor value'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        /** @var User $user */
        $user = $this->getUser();
        $user->setAvatarColor($data['avatarColor']);
        $em->flush();

        return $this->json(['avatarColor' => $user->getAvatarColor()]);
    }

    #[Route('/api/profile/avatar', name: 'app_profile_avatar', methods: ['POST'])]
    public function uploadAvatar(Request $request, EntityManagerInterface $em): JsonResponse
    {
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

        /** @var User $user */
        $user = $this->getUser();

        $s3 = new S3Client([
            'version'                 => 'latest',
            'region'                  => 'auto',
            'endpoint'                => $_ENV['R2_ENDPOINT'],
            'credentials'             => [
                'key'    => $_ENV['R2_ACCESS_KEY_ID'],
                'secret' => $_ENV['R2_SECRET_ACCESS_KEY'],
            ],
            'use_path_style_endpoint' => true,
        ]);

        // Delete old avatar from R2 if it exists
        $oldUrl = $user->getAvatarUrl();
        if ($oldUrl) {
            $oldKey = 'avatars/' . basename($oldUrl);
            $s3->deleteObject(['Bucket' => $_ENV['R2_BUCKET'], 'Key' => $oldKey]);
        }

        $ext = $file->guessExtension() ?? 'jpg';
        $filename = $user->getId()->toRfc4122() . '.' . $ext;

        $s3->putObject([
            'Bucket'      => $_ENV['R2_BUCKET'],
            'Key'         => 'avatars/' . $filename,
            'SourceFile'  => $file->getPathname(),
            'ContentType' => $mimeType,
        ]);

        $avatarUrl = $_ENV['R2_PUBLIC_URL'] . '/avatars/' . $filename;
        $user->setAvatarUrl($avatarUrl);
        $em->flush();

        return $this->json(['avatarUrl' => $avatarUrl]);
    }
}
