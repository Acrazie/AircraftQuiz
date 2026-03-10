<?php

namespace App\Controller;

use App\Entity\Answer;
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
    private const VALID_TYPES = ['full', 'zoomed', 'versus'];

    /**
     * Submit a quiz score for the authenticated user.
     * LP rules: 4–5 correct → +10 per correct | 1–3 correct → 0 | 0 correct → -30
     * Daily limit: 1 quiz per type per day.
     */
    #[Route('/api/scores', name: 'app_scores_submit', methods: ['POST'])]
    public function submit(
        Request $request,
        EntityManagerInterface $entityManager,
        ScoreRepository $scoreRepository,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['answers'], $data['totalQuestions']) || !is_array($data['answers'])) {
            return $this->json(
                ['message' => 'answers (object) and totalQuestions are required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $totalQuestions = (int) $data['totalQuestions'];

        if ($totalQuestions <= 0 || $totalQuestions > 50) {
            return $this->json(
                ['message' => 'Invalid totalQuestions'],
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $type = isset($data['type']) && in_array($data['type'], self::VALID_TYPES, true)
            ? $data['type']
            : null;

        /** @var User $user */
        $user = $this->getUser();

        // Enforce daily limit per quiz type
        if ($type !== null && $scoreRepository->findTodayByUserAndType($user, $type) !== null) {
            return $this->json(
                ['message' => 'You have already completed this quiz type today. Come back tomorrow!'],
                Response::HTTP_TOO_MANY_REQUESTS
            );
        }

        // Compute score server-side — never trust the client
        $score = 0;
        foreach ($data['answers'] as $questionId => $selectedAnswerId) {
            if (!is_string($selectedAnswerId)) {
                continue;
            }
            $answer = $entityManager->find(Answer::class, $selectedAnswerId);
            if ($answer !== null && $answer->isCorrect()) {
                $score++;
            }
        }

        $scoreEntry = new Score();
        $scoreEntry->setUser($user);
        $scoreEntry->setScore($score);
        $scoreEntry->setTotalQuestions($totalQuestions);
        if ($type !== null) {
            $scoreEntry->setType($type);
        }
        $entityManager->persist($scoreEntry);

        if ($score >= 4) {
            $lpChange = $score * 10;
        } elseif ($score === 3) {
            $lpChange = 0;
        } else {
            // 0, 1 or 2 correct → lose LP
            $lpChange = ($score - 3) * 10;
        }

        $newLp = max(0, $user->getLp() + $lpChange);
        $user->setLp($newLp);

        [$newRank, $newDivision] = $this->computeRankAndDivision($newLp);
        $user->setRank($newRank);
        $user->setDivision($newDivision);

        $entityManager->persist($user);
        $entityManager->flush();

        return $this->json([
            'message'     => 'Score saved',
            'score'       => $score,
            'lpChange'    => $lpChange,
            'totalLp'     => $newLp,
            'rank'        => $newRank,
            'division'    => $newDivision,
        ], Response::HTTP_CREATED);
    }

    /**
     * Compute rank and division from total cumulative LP.
     * Ranks: unranked → bronze → silver → gold → platinum → diamond → challenger
     * Each rank has 4 divisions (IV lowest, I highest), 100 LP per division, 400 LP per rank.
     *
     * @return array{0: string, 1: int}
     */
    private function computeRankAndDivision(int $lp): array
    {
        if ($lp >= 2100) {
            return ['challenger', 1];
        }

        $tiers = [
            [1700, 'diamond'],
            [1300, 'platinum'],
            [ 900, 'gold'],
            [ 500, 'silver'],
            [ 100, 'bronze'],
        ];

        foreach ($tiers as [$threshold, $rank]) {
            if ($lp >= $threshold) {
                $division = 4 - intdiv($lp - $threshold, 100);
                return [$rank, max(1, $division)];
            }
        }

        return ['unranked', 4];
    }

    /**
     * Return the top 50 users ranked by LP.
     */
    #[Route('/api/leaderboard', name: 'app_leaderboard', methods: ['GET'])]
    public function leaderboard(ScoreRepository $scoreRepository): JsonResponse
    {
        return $this->json($scoreRepository->findLeaderboard());
    }

    /**
     * Return which quiz types the authenticated user has already completed today.
     */
    #[Route('/api/quiz/daily-status', name: 'app_quiz_daily_status', methods: ['GET'])]
    public function dailyStatus(ScoreRepository $scoreRepository): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json([
            'completedTypes' => $scoreRepository->findCompletedTypesToday($user),
        ]);
    }
}
