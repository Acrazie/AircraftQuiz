<?php

namespace App\Tests\Unit;

use App\Controller\ScoreController;
use App\Entity\User;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Tests LP gain/loss and the hybrid division/master-zone LP logic in ScoreController.
 * Uses reflection to access the private applyLpChange method.
 */
class ScoreLpRuleTest extends TestCase
{
    private \ReflectionMethod $applyLpChange;

    protected function setUp(): void
    {
        $this->applyLpChange = new \ReflectionMethod(ScoreController::class, 'applyLpChange');
    }

    /**
     * Build a User with the given rank/division/lp, apply an LP change via reflection,
     * and return the mutated User.
     */
    private function applyLp(string $rank, int $division, int $lp, int $lpChange): User
    {
        $user = new User();
        $user->setRank($rank);
        $user->setDivision($division);
        $user->setLp($lp);

        $this->applyLpChange->invoke(new ScoreController(), $user, $lpChange);

        return $user;
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
    // Division zone: normal gain/loss within a division
    // -----------------------------------------------------------------------

    public function testNormalGainWithinDivision(): void
    {
        $user = $this->applyLp('gold', 2, 50, 20);

        $this->assertSame('gold', $user->getRank());
        $this->assertSame(2, $user->getDivision());
        $this->assertSame(70, $user->getLp());
    }

    public function testNormalLossWithinDivision(): void
    {
        $user = $this->applyLp('silver', 3, 40, -10);

        $this->assertSame('silver', $user->getRank());
        $this->assertSame(3, $user->getDivision());
        $this->assertSame(30, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Division zone: promotion
    // -----------------------------------------------------------------------

    public function testDivisionPromotion(): void
    {
        // bronze III (lp=80) + 30 → bronze II, lp resets to 0
        $user = $this->applyLp('bronze', 3, 80, 30);

        $this->assertSame('bronze', $user->getRank());
        $this->assertSame(2, $user->getDivision());
        $this->assertSame(0, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Division zone: demotion (overflow formula)
    // -----------------------------------------------------------------------

    public function testDivisionDemotion(): void
    {
        // gold I (lp=10) - 30 → platinum I, lp = 100 + (10 - 30) = 80
        $user = $this->applyLp('gold', 1, 10, -30);

        $this->assertSame('gold', $user->getRank());
        $this->assertSame(2, $user->getDivision());
        $this->assertSame(80, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Division zone: floor at unranked
    // -----------------------------------------------------------------------

    public function testFloorAtUnranked(): void
    {
        // unranked (lp=10) - 30 → still unranked, lp = 0 (not -20)
        $user = $this->applyLp('unranked', 4, 10, -30);

        $this->assertSame('unranked', $user->getRank());
        $this->assertSame(0, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Diamond I → master zone (LP carries over, no reset)
    // -----------------------------------------------------------------------

    public function testDiamondIToMaster(): void
    {
        // diamond I (lp=80) + 50 = 130 → master at 130 LP
        $user = $this->applyLp('diamond', 1, 80, 50);

        $this->assertSame('master', $user->getRank());
        $this->assertSame(1, $user->getDivision());
        $this->assertSame(130, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Master zone: gain/loss stays in same rank
    // -----------------------------------------------------------------------

    public function testMasterZoneGainStaysInMaster(): void
    {
        // master (lp=200) + 30 = 230 → still master
        $user = $this->applyLp('master', 1, 200, 30);

        $this->assertSame('master', $user->getRank());
        $this->assertSame(1, $user->getDivision());
        $this->assertSame(230, $user->getLp());
    }

    public function testMasterZoneLossStaysInMaster(): void
    {
        // master (lp=200) - 30 = 170 → still master
        $user = $this->applyLp('master', 1, 200, -30);

        $this->assertSame('master', $user->getRank());
        $this->assertSame(1, $user->getDivision());
        $this->assertSame(170, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Master zone: promotion to grandmaster (crossing 500)
    // -----------------------------------------------------------------------

    public function testMasterToGrandmaster(): void
    {
        // master (lp=480) + 50 = 530 → grandmaster
        $user = $this->applyLp('master', 1, 480, 50);

        $this->assertSame('grandmaster', $user->getRank());
        $this->assertSame(1, $user->getDivision());
        $this->assertSame(530, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Master zone: grandmaster → challenger (crossing 1000)
    // -----------------------------------------------------------------------

    public function testGrandmasterToChallenger(): void
    {
        // grandmaster (lp=960) + 50 = 1010 → challenger
        $user = $this->applyLp('grandmaster', 1, 960, 50);

        $this->assertSame('challenger', $user->getRank());
        $this->assertSame(1, $user->getDivision());
        $this->assertSame(1010, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Master zone: demotion back to diamond I
    // -----------------------------------------------------------------------

    public function testMasterDemotionToDiamondI(): void
    {
        // master (lp=110) - 30 = 80 → diamond I, lp=80
        $user = $this->applyLp('master', 1, 110, -30);

        $this->assertSame('diamond', $user->getRank());
        $this->assertSame(1, $user->getDivision());
        $this->assertSame(80, $user->getLp());
    }

    // -----------------------------------------------------------------------
    // Master zone: grandmaster demotion to master (crossing back below 500)
    // -----------------------------------------------------------------------

    public function testGrandmasterDemotionToMaster(): void
    {
        // grandmaster (lp=520) - 30 = 490 → master
        $user = $this->applyLp('grandmaster', 1, 520, -30);

        $this->assertSame('master', $user->getRank());
        $this->assertSame(1, $user->getDivision());
        $this->assertSame(490, $user->getLp());
    }
}
