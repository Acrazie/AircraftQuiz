# Doctrine ORM — Patterns for this project

## Entity skeleton

```php
<?php

namespace App\Entity;

use App\Repository\ExampleRepository;
use DateTimeImmutable;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ExampleRepository::class)]
class Example
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    #[ORM\GeneratedValue(strategy: 'CUSTOM')]
    #[ORM\CustomIdGenerator(class: 'doctrine.uuid_generator')]
    private ?Uuid $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::SMALLINT)]
    private ?int $score = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private ?DateTimeImmutable $createdAt = null;

    public function getId(): ?Uuid { return $this->id; }

    public function getName(): ?string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }

    public function getScore(): ?int { return $this->score; }
    public function setScore(int $score): static { $this->score = $score; return $this; }

    public function getCreatedAt(): ?DateTimeImmutable { return $this->createdAt; }
    public function setCreatedAt(DateTimeImmutable $createdAt): static { $this->createdAt = $createdAt; return $this; }
}
```

## Column types cheat sheet

| PHP type           | Doctrine attribute                                  |
|--------------------|-----------------------------------------------------|
| `string`           | `#[ORM\Column(length: 255)]`                        |
| `string` (long)    | `#[ORM\Column(type: Types::TEXT)]`                  |
| `int`              | `#[ORM\Column(type: Types::INTEGER)]`               |
| `int` (small)      | `#[ORM\Column(type: Types::SMALLINT)]`              |
| `float`            | `#[ORM\Column(type: Types::FLOAT)]`                 |
| `bool`             | `#[ORM\Column]` (bool inferred)                     |
| `DateTimeImmutable`| `#[ORM\Column(type: Types::DATETIME_IMMUTABLE)]`    |
| `DateTimeImmutable`| `#[ORM\Column(type: Types::DATE_IMMUTABLE)]`        |
| `array`            | `#[ORM\Column(type: Types::JSON)]`                  |
| `Uuid`             | `#[ORM\Column(type: UuidType::NAME)]`               |

Always use `nullable: true` on the ORM attribute when the PHP type is `?Type`.

## Relations

### ManyToOne (owning side)
```php
#[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'quizResults')]
#[ORM\JoinColumn(nullable: false)]
private ?User $user = null;
```

### OneToMany (inverse side, on User entity)
```php
/** @var Collection<int, QuizResult> */
#[ORM\OneToMany(targetEntity: QuizResult::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
private Collection $quizResults;

public function __construct()
{
    $this->quizResults = new ArrayCollection();
}
```

### ManyToMany
```php
/** @var Collection<int, Tag> */
#[ORM\ManyToMany(targetEntity: Tag::class)]
private Collection $tags;
```

## Repository skeleton

```php
<?php

namespace App\Repository;

use App\Entity\Example;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Example> */
class ExampleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Example::class);
    }

    // /** @return Example[] */
    // public function findByField(string $value): array
    // {
    //     return $this->createQueryBuilder('e')
    //         ->andWhere('e.field = :val')
    //         ->setParameter('val', $value)
    //         ->orderBy('e.id', 'ASC')
    //         ->getQuery()
    //         ->getResult();
    // }
}
```

## Fixture with Faker

```php
use Faker\Factory;

public function load(ObjectManager $manager): void
{
    $faker = Factory::create();

    for ($i = 0; $i < 10; $i++) {
        $example = new Example();
        $example->setName($faker->words(3, true));
        $example->setDescription($faker->sentence());
        $example->setScore($faker->numberBetween(0, 100));
        $example->setCreatedAt(new DateTimeImmutable($faker->date()));
        $manager->persist($example);
    }

    $manager->flush();
}
```

## Useful Faker methods

| Data              | Faker call                            |
|-------------------|---------------------------------------|
| Word(s)           | `$faker->word`, `$faker->words(3, true)` |
| Sentence          | `$faker->sentence()`                  |
| Paragraph         | `$faker->paragraph()`                 |
| Email             | `$faker->email()`                     |
| Name              | `$faker->name()`                      |
| Integer range     | `$faker->numberBetween(0, 100)`       |
| Float             | `$faker->randomFloat(2, 0, 1000)`     |
| Boolean           | `$faker->boolean()`                   |
| Date string       | `$faker->date()` → use `new DateTimeImmutable($faker->date())` |
| Random element    | `$faker->randomElement(['a', 'b', 'c'])` |
| UUID string       | `$faker->uuid()`                      |

## Migration workflow

```bash
# 1. Generate from entity diff
php bin/console doctrine:migrations:diff

# 2. Review the file in server/migrations/
# 3. Apply
php bin/console doctrine:migrations:migrate --no-interaction

# 4. Validate
php bin/console doctrine:schema:validate

# 5. Reload fixtures (--append keeps existing rows)
php bin/console doctrine:fixtures:load --no-interaction --append
# Use without --append to wipe and reseed from scratch
php bin/console doctrine:fixtures:load --no-interaction
```

## Naming conventions

| Thing          | Convention                                              |
|----------------|---------------------------------------------------------|
| Entity         | `PascalCase` singular — `QuizResult`, `Aircraft`       |
| Table          | Doctrine default (snake_case plural) — override with `#[ORM\Table(name: 'quiz_result')]` only if needed |
| Repository     | `EntityNameRepository`                                  |
| Field          | `camelCase` private property, getter/setter pair        |
| Migration file | Auto-named by DoctrineMigrationsBundle — do not rename  |
