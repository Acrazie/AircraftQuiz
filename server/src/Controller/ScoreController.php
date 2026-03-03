<?php

namespace App\Controller;

use App\Entity\Score;
use App\Entity\User;
use App\Repository\ScoreRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ScoreController extends AbstractController
{
    /**
     * Submit a quiz score for the authenticated user.
     * Awards 10 LP per correct answer.
     */
    #[Route('/api/scores', name: 'app_scores_submit', methods: ['POST'])]
    public function submit(
        Request $request,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['score'], $data['totalQuestions'])) {
            return $this->json(
                ['message' => 'score and totalQuestions are required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $score = (int) $data['score'];
        $totalQuestions = (int) $data['totalQuestions'];

        if ($score < 0 || $totalQuestions <= 0 || $score > $totalQuestions) {
            return $this->json(
                ['message' => 'Invalid score values'],
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        /** @var User $user */
        $user = $this->getUser();

        $scoreEntry = new Score();
        $scoreEntry->setUser($user);
        $scoreEntry->setScore($score);
        $scoreEntry->setTotalQuestions($totalQuestions);
        $entityManager->persist($scoreEntry);

        $lpEarned = $score * 10;
        $user->setLp($user->getLp() + $lpEarned);
        $entityManager->persist($user);

        $entityManager->flush();

        return $this->json([
            'message'  => 'Score saved',
            'lp'       => $lpEarned,
            'totalLp'  => $user->getLp(),
        ], Response::HTTP_CREATED);
    }

    /**
     * Return the top 50 users ranked by LP.
     */
    #[Route('/api/leaderboard', name: 'app_leaderboard', methods: ['GET'])]
    public function leaderboard(ScoreRepository $scoreRepository): JsonResponse
    {
        return $this->json($scoreRepository->findLeaderboard());
    }
}
