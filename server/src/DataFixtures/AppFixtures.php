<?php

namespace App\DataFixtures;

use App\Entity\Score;
use App\Entity\User;
use DateTimeImmutable;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    private UserPasswordHasherInterface $hasher;

    public function __construct(UserPasswordHasherInterface $hasher)
    {
        $this->hasher = $hasher;
    }

    public function load(ObjectManager $manager): void
    {
        // --- Users ---
        $usersData = [
            ['Admin',     'admin@gmail.com',    ['ROLE_ADMIN'], 1050, 'challenger',  1],
            ['TopGun',    'topgun@mail.com',     ['ROLE_USER'],  720,  'grandmaster', 1],
            ['Maverick',  'maverick@mail.com',   ['ROLE_USER'],  320,  'master',      1],
            ['Iceman',    'iceman@mail.com',      ['ROLE_USER'],  75,   'diamond',     1],
            ['Viper',     'viper@mail.com',       ['ROLE_USER'],  60,   'gold',        2],
            ['Goose',     'goose@mail.com',       ['ROLE_USER'],  30,   'silver',      3],
            ['Hollywood', 'hollywood@mail.com',   ['ROLE_USER'],  80,   'bronze',      1],
            ['Wolfman',   'wolfman@mail.com',     ['ROLE_USER'],  45,   'silver',      4],
            ['Slider',    'slider@mail.com',      ['ROLE_USER'],  20,   'bronze',      4],
            ['Merlin',    'merlin@mail.com',      ['ROLE_USER'],  0,    'unranked',    4],
        ];

        /** @var User[] $users */
        $users = [];
        foreach ($usersData as [$username, $email, $roles, $lp, $rank, $division]) {
            $user = new User();
            $user->setUsername($username);
            $user->setEmail($email);
            $user->setRoles($roles);
            $user->setPassword($this->hasher->hashPassword($user, 'password'));
            $user->setLp($lp);
            $user->setRank($rank);
            $user->setDivision($division);
            $user->setCreationDate(new DateTimeImmutable());
            $manager->persist($user);
            $users[] = $user;
        }

        // --- Scores (quiz history that matches LP totals) ---
        // Format: [ userIndex, score, totalQuestions, daysAgo ]
        $scoresData = [
            [0, 10, 10, 5],  [0, 8, 10, 10], [0, 10, 10, 15],   // Admin: 280 LP  (rest from initial lp)
            [1, 9, 10, 3],   [1, 8, 10, 8],  [1, 10, 10, 20],   // TopGun
            [2, 7, 10, 2],   [2, 9, 10, 12], [2, 8, 10, 25],    // Maverick
            [3, 8, 10, 4],   [3, 7, 10, 9],  [3, 9, 10, 18],    // Iceman
            [4, 6, 10, 1],   [4, 8, 10, 7],  [4, 8, 10, 22],    // Viper
            [5, 7, 10, 6],   [5, 6, 10, 11], [5, 8, 10, 30],    // Goose
            [6, 5, 10, 3],   [6, 7, 10, 14],                     // Hollywood
            [7, 4, 10, 5],   [7, 6, 10, 16],                     // Wolfman
            [8, 3, 10, 8],   [8, 5, 10, 20],                     // Slider
        ];

        foreach ($scoresData as [$userIndex, $score, $total, $daysAgo]) {
            $entry = new Score();
            $entry->setUser($users[$userIndex]);
            $entry->setScore($score);
            $entry->setTotalQuestions($total);
            $entry->setPlayedAt(new DateTimeImmutable("-{$daysAgo} days"));
            $manager->persist($entry);
        }

        $manager->flush();
    }
}
