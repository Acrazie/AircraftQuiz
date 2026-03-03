<?php

namespace App\Repository;

use App\Entity\Score;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Score>
 */
class ScoreRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Score::class);
    }

    /**
     * Returns users ranked by total LP, with their quiz count.
     * Single aggregated query — no N+1.
     *
     * @return array<int, array{ position: int, username: string, rank: string, division: int, quizzes: int, lp: int }>
     */
    public function findLeaderboard(int $limit = 50): array
    {
        $rows = $this->getEntityManager()->createQuery(
            'SELECT u.id, u.username, u.rank, u.division, u.lp, COUNT(s.id) AS quizzes
             FROM App\Entity\User u
             LEFT JOIN App\Entity\Score s WITH s.user = u
             GROUP BY u.id, u.username, u.rank, u.division, u.lp
             ORDER BY u.lp DESC'
        )
        ->setMaxResults($limit)
        ->getArrayResult();

        return array_map(
            static function (array $row, int $index): array {
                return [
                    'position' => $index + 1,
                    'username' => $row['username'],
                    'rank'     => $row['rank'],
                    'division' => $row['division'],
                    'quizzes'  => (int) $row['quizzes'],
                    'lp'       => $row['lp'],
                ];
            },
            $rows,
            array_keys($rows)
        );
    }
}
