<?php

namespace App\Repository;

use App\Entity\Score;
use App\Entity\User;
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
            'SELECT u.id, u.username, u.rank, u.division, u.lp, u.avatarUrl, u.avatarColor, COUNT(s.id) AS quizzes
             FROM App\Entity\User u
             LEFT JOIN App\Entity\Score s WITH s.user = u
             GROUP BY u.id, u.username, u.rank, u.division, u.lp, u.avatarUrl, u.avatarColor
             ORDER BY u.lp DESC'
        )
        ->setMaxResults($limit)
        ->getArrayResult();

        return array_map(
            static function (array $row, int $index): array {
                return [
                    'position'    => $index + 1,
                    'username'    => $row['username'],
                    'rank'        => $row['rank'],
                    'division'    => $row['division'],
                    'quizzes'     => (int) $row['quizzes'],
                    'lp'          => $row['lp'],
                    'avatarUrl'   => $row['avatarUrl'],
                    'avatarColor' => $row['avatarColor'],
                ];
            },
            $rows,
            array_keys($rows)
        );
    }

    /**
     * Returns the distinct quiz types the user has already completed today.
     *
     * @return string[]
     */
    public function findCompletedTypesToday(User $user): array
    {
        $today = new \DateTimeImmutable('today midnight');

        $rows = $this->createQueryBuilder('s')
            ->select('s.type')
            ->where('s.user = :user')
            ->andWhere('s.playedAt >= :today')
            ->andWhere('s.type IS NOT NULL')
            ->setParameter('user', $user)
            ->setParameter('today', $today)
            ->getQuery()
            ->getArrayResult();

        return array_values(array_unique(array_column($rows, 'type')));
    }

    /**
     * Returns a Score if the user has already completed the given type today, null otherwise.
     */
    public function findTodayByUserAndType(User $user, string $type): ?Score
    {
        $today = new \DateTimeImmutable('today midnight');

        return $this->createQueryBuilder('s')
            ->where('s.user = :user')
            ->andWhere('s.type = :type')
            ->andWhere('s.playedAt >= :today')
            ->setParameter('user', $user)
            ->setParameter('type', $type)
            ->setParameter('today', $today)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
