<?php

namespace App\Repository;

use App\Entity\Question;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Question>
 */
class QuestionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Question::class);
    }

    /**
     * Returns all questions with their answers eager-loaded (avoids N+1).
     *
     * @return Question[]
     */
    public function findAllWithAnswers(): array
    {
        return $this->createQueryBuilder('q')
            ->addSelect('a')
            ->leftJoin('q.answers', 'a')
            ->getQuery()
            ->getResult();
    }
}
