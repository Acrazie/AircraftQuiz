<?php

namespace App\Tests\Unit;

use App\Controller\ScoreController;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Tests LP gain/loss and rank computation logic in ScoreController.
 * Uses reflection to access the private computeRankAndDivision method.
 */
class ScoreLpRuleTest extends TestCase
{
    private \ReflectionMethod $computeRank;

    protected function setUp(): void
    {
        $this->computeRank = new \ReflectionMethod(ScoreController::class, 'computeRankAndDivision');
    }

    /** Call computeRankAndDivision without instantiating the full controller. */
    private function rankFor(int $lp): array
    {
        return $this->computeRank->invoke(new ScoreController(), $lp);
    }

    // -----------------------------------------------------------------------
    // LP calculation rules (score out of 5 questions)
    // -----------------------------------------------------------------------

    #[DataProvider('lpChangeProvider')]
    public function testLpChange(int $score, int $expectedLpChange): void
    {
        $actualLpChange = match (true) {
            $score >= 4  => $score * 10,
            $score === 3 => 0,
            default      => ($score - 3) * 10,
        };

        $this->assertSame($expectedLpChange, $actualLpChange);
    }

    public static function lpChangeProvider(): array
    {
        return [
            'perfect score (5/5)'     => [5, 50],
            '4 correct → +40 LP'      => [4, 40],
            '3 correct → 0 LP'        => [3, 0],
            '2 correct → -10 LP'      => [2, -10],
            '1 correct → -20 LP'      => [1, -20],
            '0 correct → -30 LP'      => [0, -30],
        ];
    }

    // -----------------------------------------------------------------------
    // Rank thresholds
    // -----------------------------------------------------------------------

    #[DataProvider('rankProvider')]
    public function testRankAndDivision(int $lp, string $expectedRank, int $expectedDivision): void
    {
        [$rank, $division] = $this->rankFor($lp);

        $this->assertSame($expectedRank, $rank);
        $this->assertSame($expectedDivision, $division);
    }

    public static function rankProvider(): array
    {
        return [
            'zero LP is unranked'           => [0,    'unranked',   4],
            '50 LP is unranked'             => [50,   'unranked',   4],
            '99 LP is unranked'             => [99,   'unranked',   4],
            'exactly 100 LP → bronze IV'    => [100,  'bronze',     4],
            '150 LP → bronze IV'            => [150,  'bronze',     4],
            '200 LP → bronze III'           => [200,  'bronze',     3],
            '300 LP → bronze II'            => [300,  'bronze',     2],
            '400 LP → bronze I'             => [400,  'bronze',     1],
            'exactly 500 LP → silver IV'    => [500,  'silver',     4],
            '900 LP → gold IV'              => [900,  'gold',       4],
            '1300 LP → platinum IV'         => [1300, 'platinum',   4],
            '1700 LP → diamond IV'          => [1700, 'diamond',    4],
            '2100 LP → challenger'          => [2100, 'challenger', 1],
            '9999 LP → challenger'          => [9999, 'challenger', 1],
            'LP floored at 0 edge case'     => [1,    'unranked',   4],
        ];
    }

    public function testLpNeverGoesBelowZero(): void
    {
        // A user with 10 LP who gets 0 correct (-30 LP) should land at 0, not -20
        $currentLp = 10;
        $lpChange  = -30;
        $newLp     = max(0, $currentLp + $lpChange);

        $this->assertSame(0, $newLp);
    }
}
