<?php

namespace App\Entity;

use App\Repository\ScoreRepository;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\IdGenerator\UuidGenerator;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ScoreRepository::class)]
#[ORM\Index(columns: ['user_id', 'type', 'played_at'], name: 'idx_score_user_type_date')]
class Score
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: UuidGenerator::class)]
    private ?Uuid $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(type: 'smallint')]
    #[Assert\Range(min: 0, max: 50)]
    private int $score = 0;

    #[ORM\Column(type: 'smallint')]
    #[Assert\Range(min: 1, max: 50)]
    private int $totalQuestions = 1;

    #[ORM\Column]
    private DateTimeImmutable $playedAt;

    #[ORM\Column(length: 10, nullable: true)]
    #[Assert\Choice(choices: ['full', 'zoomed', 'versus'])]
    private ?string $type = null;

    public function __construct()
    {
        $this->playedAt = new DateTimeImmutable();
    }

    public function getId(): ?Uuid
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getScore(): int
    {
        return $this->score;
    }

    public function setScore(int $score): static
    {
        $this->score = $score;

        return $this;
    }

    public function getTotalQuestions(): int
    {
        return $this->totalQuestions;
    }

    public function setTotalQuestions(int $totalQuestions): static
    {
        $this->totalQuestions = $totalQuestions;

        return $this;
    }

    public function getPlayedAt(): DateTimeImmutable
    {
        return $this->playedAt;
    }

    public function setPlayedAt(DateTimeImmutable $playedAt): static
    {
        $this->playedAt = $playedAt;

        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }
}
