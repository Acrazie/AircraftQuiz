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
     * Division-zone rank progression: unranked → diamond I (master zone handled separately).
     * Each entry: [rank, division, minLp (0-99 within-division — not used here, kept for clarity)]
     * Ordered from lowest to highest tier.
     */
    private const RANK_PROGRESSION = [
        ['unranked', 4],
        ['bronze',   4],
        ['bronze',   3],
        ['bronze',   2],
        ['bronze',   1],
        ['silver',   4],
        ['silver',   3],
        ['silver',   2],
        ['silver',   1],
        ['gold',     4],
        ['gold',     3],
        ['gold',     2],
        ['gold',     1],
        ['platinum', 4],
        ['platinum', 3],
        ['platinum', 2],
        ['platinum', 1],
        ['diamond',  4],
        ['diamond',  3],
        ['diamond',  2],
        ['diamond',  1],
    ];

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

        $this->applyLpChange($user, $lpChange);

        $entityManager->persist($user);
        $entityManager->flush();

        return $this->json([
            'message'     => 'Score saved',
            'score'       => $score,
            'lpChange'    => $lpChange,
            'totalLp'     => $user->getLp(),
            'rank'        => $user->getRank(),
            'division'    => $user->getDivision(),
        ], Response::HTTP_CREATED);
    }

    /**
     * Apply an LP change to a user using the hybrid division/master-zone system.
     *
     * Division zone (unranked → diamond I): user.lp = 0–99 per division.
     *   - Promotion: lp resets to 0 (except diamond I → master, which carries over).
     *   - Demotion: lp = 100 + (lp + lpChange) — carries overflow into previous division.
     *   - Floor: at unranked, lp = max(0, lp + lpChange) — can't go below 0.
     *
     * Master zone (master / grandmaster / challenger): user.lp = 100+.
     *   - LP never resets; rank derived from LP range:
     *     100–499 → master | 500–999 → grandmaster | 1000+ → challenger
     *   - Drop below 100 → demote to diamond I with lp = max(0, newLp).
     */
    private function applyLpChange(User $user, int $lpChange): void
    {
        $masterZoneRanks = ['master', 'grandmaster', 'challenger'];

        if (in_array($user->getRank(), $masterZoneRanks, true)) {
            $newLp = $user->getLp() + $lpChange;

            if ($newLp < 100) {
                // Demote back to diamond I
                $user->setRank('diamond');
                $user->setDivision(1);
                $user->setLp(max(0, $newLp));
                return;
            }

            // Stay in master zone — derive rank from LP range
            $user->setLp($newLp);
            if ($newLp >= 1000) {
                $user->setRank('challenger');
            } elseif ($newLp >= 500) {
                $user->setRank('grandmaster');
            } else {
                $user->setRank('master');
            }
            $user->setDivision(1);
            return;
        }

        // Division zone
        $progression = self::RANK_PROGRESSION;
        $currentIndex = null;
        foreach ($progression as $i => [$rank, $division]) {
            if ($rank === $user->getRank() && $division === $user->getDivision()) {
                $currentIndex = $i;
                break;
            }
        }

        // Fallback: floor at first tier
        if ($currentIndex === null) {
            $currentIndex = 0;
        }

        $newLp = $user->getLp() + $lpChange;

        if ($newLp >= 100) {
            // Promotion
            if ($user->getRank() === 'diamond' && $user->getDivision() === 1) {
                // Enter master zone — LP carries over
                $user->setRank('master');
                $user->setDivision(1);
                $user->setLp($newLp);
            } else {
                // Advance one division, reset LP
                $nextIndex = min($currentIndex + 1, count($progression) - 1);
                [$nextRank, $nextDivision] = $progression[$nextIndex];
                $user->setRank($nextRank);
                $user->setDivision($nextDivision);
                $user->setLp(0);
            }
        } elseif ($newLp < 0) {
            // Demotion
            if ($currentIndex === 0) {
                // Floor at unranked — cannot demote further
                $user->setLp(0);
            } else {
                $prevIndex = $currentIndex - 1;
                [$prevRank, $prevDivision] = $progression[$prevIndex];
                $user->setRank($prevRank);
                $user->setDivision($prevDivision);
                $user->setLp(100 + $newLp);
            }
        } else {
            $user->setLp($newLp);
        }
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
