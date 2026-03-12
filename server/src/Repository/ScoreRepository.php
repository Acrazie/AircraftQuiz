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
     * Returns users ranked by rank tier → division → LP, with their quiz count.
     * Single aggregated native SQL query — no N+1.
     *
     * @return array<int, array{ position: int, username: string, rank: string, division: int, quizzes: int, lp: int, avatarUrl: string|null, avatarColor: string|null }>
     */
    public function findLeaderboard(int $limit = 50): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = "
            SELECT u.id, u.username, u.rank, u.division, u.lp,
                   u.avatar_url AS \"avatarUrl\", u.avatar_color AS \"avatarColor\",
                   COUNT(s.id) AS quizzes
            FROM \"user\" u
            LEFT JOIN score s ON s.user_id = u.id
            GROUP BY u.id, u.username, u.rank, u.division, u.lp, u.avatar_url, u.avatar_color
            ORDER BY
                CASE u.rank
                    WHEN 'challenger'   THEN 8
                    WHEN 'grandmaster'  THEN 7
                    WHEN 'master'       THEN 6
                    WHEN 'diamond'      THEN 5
                    WHEN 'platinum'     THEN 4
                    WHEN 'gold'         THEN 3
                    WHEN 'silver'       THEN 2
                    WHEN 'bronze'       THEN 1
                    ELSE 0
                END DESC,
                u.division ASC,
                u.lp DESC
            LIMIT :limit
        ";

        $rows = $conn->executeQuery($sql, ['limit' => $limit])->fetchAllAssociative();

        return array_map(
            static function (array $row, int $index): array {
                return [
                    'position'    => $index + 1,
                    'username'    => $row['username'],
                    'rank'        => $row['rank'],
                    'division'    => (int) $row['division'],
                    'quizzes'     => (int) $row['quizzes'],
                    'lp'          => (int) $row['lp'],
                    'avatarUrl'   => $row['avatarUrl'] ?? null,
                    'avatarColor' => $row['avatarColor'] ?? null,
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
