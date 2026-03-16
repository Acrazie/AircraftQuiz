<?php

namespace App\Controller;

use App\Entity\Answer;
use App\Entity\Score;
use App\Entity\User;
use App\Repository\ScoreRepository;
use App\Service\RankingService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class ScoreController extends AbstractController
{
    private const VALID_TYPES = ['full', 'zoomed', 'versus'];

    /**
     * Submit a quiz score for the authenticated user.
     * Daily limit: 1 quiz per type per day.
     */
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    #[Route('/api/scores', name: 'app_scores_submit', methods: ['POST'])]
    public function submit(
        Request $request,
        EntityManagerInterface $entityManager,
        ScoreRepository $scoreRepository,
        RankingService $rankingService,
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
        // Cap processed answers to totalQuestions to prevent score inflation
        $score = 0;
        $processed = 0;
        $uuidPattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
        foreach ($data['answers'] as $questionId => $selectedAnswerId) {
            if ($processed >= $totalQuestions) {
                break;
            }
            if (!is_string($selectedAnswerId) || !preg_match($uuidPattern, $selectedAnswerId)) {
                $processed++;
                continue;
            }
            $answer = $entityManager->find(Answer::class, $selectedAnswerId);
            if ($answer !== null && $answer->isCorrect()) {
                $score++;
            }
            $processed++;
        }

        $lpChange = $rankingService->calculateLpChange($score);

        // Wrap score persist + LP update in a transaction
        $entityManager->wrapInTransaction(function () use ($entityManager, $user, $score, $totalQuestions, $type, $lpChange, $rankingService): void {
            $scoreEntry = new Score();
            $scoreEntry->setUser($user);
            $scoreEntry->setScore($score);
            $scoreEntry->setTotalQuestions($totalQuestions);
            if ($type !== null) {
                $scoreEntry->setType($type);
            }
            $entityManager->persist($scoreEntry);

            $rankingService->applyLpChange($user, $lpChange);
            $entityManager->persist($user);
        });

        $scoreRepository->invalidateLeaderboardCache();

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
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
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
