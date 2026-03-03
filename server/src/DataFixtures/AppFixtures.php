<?php

namespace App\DataFixtures;

use App\Entity\Answer;
use App\Entity\Question;
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
            ['Admin',     'admin@gmail.com',    ['ROLE_ADMIN'], 1200, 'challenger', 1],
            ['TopGun',    'topgun@mail.com',     ['ROLE_USER'],  980,  'diamond',    2],
            ['Maverick',  'maverick@mail.com',   ['ROLE_USER'],  850,  'platinum',   1],
            ['Iceman',    'iceman@mail.com',      ['ROLE_USER'],  760,  'platinum',   3],
            ['Viper',     'viper@mail.com',       ['ROLE_USER'],  640,  'gold',       1],
            ['Goose',     'goose@mail.com',       ['ROLE_USER'],  510,  'gold',       4],
            ['Hollywood', 'hollywood@mail.com',   ['ROLE_USER'],  380,  'silver',     2],
            ['Wolfman',   'wolfman@mail.com',     ['ROLE_USER'],  270,  'silver',     3],
            ['Slider',    'slider@mail.com',      ['ROLE_USER'],  150,  'bronze',     1],
            ['Merlin',    'merlin@mail.com',      ['ROLE_USER'],  0,    'unranked',   4],
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

        // --- Questions ---
        // imageUrl: null until CDN URLs are configured — update with real paths from the aircraft image server
        $questionsData = [
            [
                'Which aircraft is this?',
                null,
                [
                    ['F-16 Fighting Falcon', true],
                    ['F-22 Raptor', false],
                    ['F-35 Lightning II', false],
                    ['Eurofighter Typhoon', false],
                ],
            ],
            [
                'Identify this aircraft.',
                null,
                [
                    ['F/A-18 Hornet', true],
                    ['F-14 Tomcat', false],
                    ['F-15 Eagle', false],
                    ['Su-27 Flanker', false],
                ],
            ],
            [
                'Which aircraft is shown?',
                null,
                [
                    ['B-2 Spirit', true],
                    ['B-1 Lancer', false],
                    ['B-52 Stratofortress', false],
                    ['Tu-160 Blackjack', false],
                ],
            ],
            [
                'Identify this aircraft.',
                null,
                [
                    ['A-10 Thunderbolt II', true],
                    ['Su-25 Frogfoot', false],
                    ['Harrier GR7', false],
                    ['Alpha Jet', false],
                ],
            ],
            [
                'Which aircraft is this?',
                null,
                [
                    ['SR-71 Blackbird', true],
                    ['U-2 Dragon Lady', false],
                    ['MiG-25 Foxbat', false],
                    ['XB-70 Valkyrie', false],
                ],
            ],
            [
                'Identify this aircraft.',
                null,
                [
                    ['F-117 Nighthawk', true],
                    ['B-2 Spirit', false],
                    ['YF-23 Black Widow II', false],
                    ['Have Blue', false],
                ],
            ],
            [
                'Which aircraft is shown?',
                null,
                [
                    ['Dassault Rafale', true],
                    ['Eurofighter Typhoon', false],
                    ['Saab Gripen', false],
                    ['Mirage 2000', false],
                ],
            ],
            [
                'Identify this aircraft.',
                null,
                [
                    ['Sukhoi Su-57', true],
                    ['MiG-29 Fulcrum', false],
                    ['Su-35 Flanker-E', false],
                    ['Chengdu J-20', false],
                ],
            ],
            [
                'Which aircraft is this?',
                null,
                [
                    ['Lockheed C-130 Hercules', true],
                    ['Airbus A400M Atlas', false],
                    ['Boeing C-17 Globemaster III', false],
                    ['Antonov An-124 Condor', false],
                ],
            ],
            [
                'Identify this aircraft.',
                null,
                [
                    ['Northrop Grumman E-2 Hawkeye', true],
                    ['Boeing E-3 Sentry', false],
                    ['Grumman S-2 Tracker', false],
                    ['Saab 340 AEW', false],
                ],
            ],
        ];

        foreach ($questionsData as [$text, $imageUrl, $answersData]) {
            $question = new Question();
            $question->setText($text);
            $question->setImageUrl($imageUrl);

            foreach ($answersData as [$answerText, $isCorrect]) {
                $answer = new Answer();
                $answer->setText($answerText);
                $answer->setIsCorrect($isCorrect);
                $question->addAnswer($answer);
                $manager->persist($answer);
            }

            $manager->persist($question);
        }

        $manager->flush();
    }
}
