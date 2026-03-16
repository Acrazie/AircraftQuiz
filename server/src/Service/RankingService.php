<?php

namespace App\Service;

use App\Entity\User;

final class RankingService
{
    public const LP_PER_DIVISION = 100;
    public const MASTER_THRESHOLD = 100;
    public const GRANDMASTER_THRESHOLD = 500;
    public const CHALLENGER_THRESHOLD = 1000;

    private const MASTER_ZONE_RANKS = ['master', 'grandmaster', 'challenger'];

    /**
     * Division-zone rank progression: unranked → diamond I (master zone handled separately).
     * Each entry: [rank, division]
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
     * Calculate LP change based on number of correct answers.
     *
     * 4–5 correct → +10 per correct | 3 correct → 0 | 0–2 correct → negative
     */
    public function calculateLpChange(int $correctAnswers): int
    {
        if ($correctAnswers >= 4) {
            return $correctAnswers * 10;
        }

        if ($correctAnswers === 3) {
            return 0;
        }

        // 0, 1, or 2 correct → lose LP
        return ($correctAnswers - 3) * 10;
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
    public function applyLpChange(User $user, int $lpChange): void
    {
        if (in_array($user->getRank(), self::MASTER_ZONE_RANKS, true)) {
            $this->applyMasterZoneLpChange($user, $lpChange);
            return;
        }

        $this->applyDivisionZoneLpChange($user, $lpChange);
    }

    private function applyMasterZoneLpChange(User $user, int $lpChange): void
    {
        $newLp = $user->getLp() + $lpChange;

        if ($newLp < self::MASTER_THRESHOLD) {
            // Demote back to diamond I
            $user->setRank('diamond');
            $user->setDivision(1);
            $user->setLp(max(0, $newLp));
            return;
        }

        // Stay in master zone — derive rank from LP range
        $user->setLp($newLp);
        if ($newLp >= self::CHALLENGER_THRESHOLD) {
            $user->setRank('challenger');
        } elseif ($newLp >= self::GRANDMASTER_THRESHOLD) {
            $user->setRank('grandmaster');
        } else {
            $user->setRank('master');
        }
        $user->setDivision(1);
    }

    private function applyDivisionZoneLpChange(User $user, int $lpChange): void
    {
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

        if ($newLp >= self::LP_PER_DIVISION) {
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
                $user->setLp(max(0, self::LP_PER_DIVISION + $newLp));
            }
        } else {
            $user->setLp($newLp);
        }
    }
}
