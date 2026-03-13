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
        $cdnUrl = $_ENV['CDN_URL'] ?? 'http://localhost:8080';

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

        // --- Questions ---
        // One question per aircraft folder in server/images/
        // imageUrl: served by CDN (bun run start) at http://localhost:8080
        $questionsData = [
            [
                'Which aircraft is this?',
                "{$cdnUrl}/a-10-thunderbolt-ii/01.jpg",
                [
                    ['A-10 Thunderbolt II', true],
                    ['Harrier', false],
                    ['Su-25 Frogfoot', false],
                    ['Panavia Tornado', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/dassault-rafale/01.jpg",
                [
                    ['Dassault Rafale', true],
                    ['Eurofighter Typhoon', false],
                    ['Mirage 2000', false],
                    ['JAS-39 Gripen', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/eurofighter-typhoon/01.jpg",
                [
                    ['Eurofighter Typhoon', true],
                    ['Dassault Rafale', false],
                    ['JAS-39 Gripen', false],
                    ['Mirage 2000', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/f-14-tomcat/01.jpg",
                [
                    ['F-14 Tomcat', true],
                    ['F/A-18 Hornet', false],
                    ['F-15 Eagle', false],
                    ['Su-27 Flanker', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/f-15-eagle/01.jpg",
                [
                    ['F-15 Eagle', true],
                    ['F-16 Fighting Falcon', false],
                    ['F-14 Tomcat', false],
                    ['Su-27 Flanker', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/f-16-fighting-falcon/01.jpg",
                [
                    ['F-16 Fighting Falcon', true],
                    ['F-15 Eagle', false],
                    ['F-35 Lightning II', false],
                    ['JAS-39 Gripen', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/f-22-raptor/01.jpg",
                [
                    ['F-22 Raptor', true],
                    ['F-35 Lightning II', false],
                    ['Su-57 Felon', false],
                    ['J-20 Mighty Dragon', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/f-35-lightning-ii/01.jpg",
                [
                    ['F-35 Lightning II', true],
                    ['F-22 Raptor', false],
                    ['F/A-18 Hornet', false],
                    ['Eurofighter Typhoon', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/f-4-phantom-ii/01.jpg",
                [
                    ['F-4 Phantom II', true],
                    ['F-86 Sabre', false],
                    ['MiG-21 Fishbed', false],
                    ['F-14 Tomcat', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/f-86-sabre/01.jpg",
                [
                    ['F-86 Sabre', true],
                    ['MiG-15', false],
                    ['F-4 Phantom II', false],
                    ['MiG-21 Fishbed', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/fa-18-hornet/01.jpg",
                [
                    ['F/A-18 Hornet', true],
                    ['F-14 Tomcat', false],
                    ['F-16 Fighting Falcon', false],
                    ['Dassault Rafale', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/hal-tejas/01.jpg",
                [
                    ['HAL Tejas', true],
                    ['JAS-39 Gripen', false],
                    ['Mirage 2000', false],
                    ['F-16 Fighting Falcon', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/harrier/01.jpg",
                [
                    ['Harrier', true],
                    ['A-10 Thunderbolt II', false],
                    ['F/A-18 Hornet', false],
                    ['Panavia Tornado', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/j-20-mighty-dragon/01.jpg",
                [
                    ['J-20 Mighty Dragon', true],
                    ['Su-57 Felon', false],
                    ['F-22 Raptor', false],
                    ['F-35 Lightning II', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/jas-39-gripen/01.jpg",
                [
                    ['JAS-39 Gripen', true],
                    ['Eurofighter Typhoon', false],
                    ['Dassault Rafale', false],
                    ['HAL Tejas', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/mig-15/01.jpg",
                [
                    ['MiG-15', true],
                    ['F-86 Sabre', false],
                    ['MiG-21 Fishbed', false],
                    ['F-4 Phantom II', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/mig-21-fishbed/01.jpg",
                [
                    ['MiG-21 Fishbed', true],
                    ['MiG-15', false],
                    ['MiG-29 Fulcrum', false],
                    ['F-4 Phantom II', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/mig-29-fulcrum/01.jpg",
                [
                    ['MiG-29 Fulcrum', true],
                    ['Su-27 Flanker', false],
                    ['Su-35 Flanker-E', false],
                    ['MiG-21 Fishbed', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/mirage-2000/01.jpg",
                [
                    ['Mirage 2000', true],
                    ['Dassault Rafale', false],
                    ['Eurofighter Typhoon', false],
                    ['HAL Tejas', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/panavia-tornado/01.jpg",
                [
                    ['Panavia Tornado', true],
                    ['Eurofighter Typhoon', false],
                    ['F-15 Eagle', false],
                    ['Harrier', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/saab-draken/01.jpg",
                [
                    ['Saab Draken', true],
                    ['JAS-39 Gripen', false],
                    ['Mirage 2000', false],
                    ['Dassault Rafale', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/sr-71-blackbird/01.jpg",
                [
                    ['SR-71 Blackbird', true],
                    ['MiG-25 Foxbat', false],
                    ['F-22 Raptor', false],
                    ['Su-57 Felon', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/su-27-flanker/01.jpg",
                [
                    ['Su-27 Flanker', true],
                    ['MiG-29 Fulcrum', false],
                    ['Su-35 Flanker-E', false],
                    ['F-15 Eagle', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/su-35-flanker-e/01.jpg",
                [
                    ['Su-35 Flanker-E', true],
                    ['Su-27 Flanker', false],
                    ['Su-57 Felon', false],
                    ['MiG-29 Fulcrum', false],
                ],
            ],
            [
                'Which aircraft is this?',
                "{$cdnUrl}/su-57-felon/01.jpg",
                [
                    ['Su-57 Felon', true],
                    ['Su-35 Flanker-E', false],
                    ['J-20 Mighty Dragon', false],
                    ['F-22 Raptor', false],
                ],
            ],
        ];

        $zoomedQuestionsData = [
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/a-10-thunderbolt-ii/02.jpg",
                [
                    ['A-10 Thunderbolt II', true],
                    ['Harrier', false],
                    ['Su-25 Frogfoot', false],
                    ['Panavia Tornado', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/dassault-rafale/02.jpg",
                [
                    ['Dassault Rafale', true],
                    ['Eurofighter Typhoon', false],
                    ['Mirage 2000', false],
                    ['JAS-39 Gripen', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/eurofighter-typhoon/02.jpg",
                [
                    ['Eurofighter Typhoon', true],
                    ['Dassault Rafale', false],
                    ['JAS-39 Gripen', false],
                    ['Mirage 2000', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/f-14-tomcat/02.jpg",
                [
                    ['F-14 Tomcat', true],
                    ['F/A-18 Hornet', false],
                    ['F-15 Eagle', false],
                    ['Su-27 Flanker', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/f-15-eagle/02.jpg",
                [
                    ['F-15 Eagle', true],
                    ['F-16 Fighting Falcon', false],
                    ['F-14 Tomcat', false],
                    ['Su-27 Flanker', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/f-16-fighting-falcon/02.jpg",
                [
                    ['F-16 Fighting Falcon', true],
                    ['F-15 Eagle', false],
                    ['F-35 Lightning II', false],
                    ['JAS-39 Gripen', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/f-22-raptor/02.jpg",
                [
                    ['F-22 Raptor', true],
                    ['F-35 Lightning II', false],
                    ['Su-57 Felon', false],
                    ['J-20 Mighty Dragon', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/f-35-lightning-ii/02.jpg",
                [
                    ['F-35 Lightning II', true],
                    ['F-22 Raptor', false],
                    ['F/A-18 Hornet', false],
                    ['Eurofighter Typhoon', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/f-4-phantom-ii/02.jpg",
                [
                    ['F-4 Phantom II', true],
                    ['F-86 Sabre', false],
                    ['MiG-21 Fishbed', false],
                    ['F-14 Tomcat', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/f-86-sabre/02.jpg",
                [
                    ['F-86 Sabre', true],
                    ['MiG-15', false],
                    ['F-4 Phantom II', false],
                    ['MiG-21 Fishbed', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/fa-18-hornet/02.jpg",
                [
                    ['F/A-18 Hornet', true],
                    ['F-14 Tomcat', false],
                    ['F-16 Fighting Falcon', false],
                    ['Dassault Rafale', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/hal-tejas/02.jpg",
                [
                    ['HAL Tejas', true],
                    ['JAS-39 Gripen', false],
                    ['Mirage 2000', false],
                    ['F-16 Fighting Falcon', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/harrier/02.jpg",
                [
                    ['Harrier', true],
                    ['A-10 Thunderbolt II', false],
                    ['F/A-18 Hornet', false],
                    ['Panavia Tornado', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/j-20-mighty-dragon/02.jpg",
                [
                    ['J-20 Mighty Dragon', true],
                    ['Su-57 Felon', false],
                    ['F-22 Raptor', false],
                    ['F-35 Lightning II', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/jas-39-gripen/02.jpg",
                [
                    ['JAS-39 Gripen', true],
                    ['Eurofighter Typhoon', false],
                    ['Dassault Rafale', false],
                    ['HAL Tejas', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/mig-15/02.jpg",
                [
                    ['MiG-15', true],
                    ['F-86 Sabre', false],
                    ['MiG-21 Fishbed', false],
                    ['F-4 Phantom II', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/mig-21-fishbed/02.jpg",
                [
                    ['MiG-21 Fishbed', true],
                    ['MiG-15', false],
                    ['MiG-29 Fulcrum', false],
                    ['F-4 Phantom II', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/mig-29-fulcrum/02.jpg",
                [
                    ['MiG-29 Fulcrum', true],
                    ['Su-27 Flanker', false],
                    ['Su-35 Flanker-E', false],
                    ['MiG-21 Fishbed', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/mirage-2000/02.jpg",
                [
                    ['Mirage 2000', true],
                    ['Dassault Rafale', false],
                    ['Eurofighter Typhoon', false],
                    ['HAL Tejas', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/panavia-tornado/02.jpg",
                [
                    ['Panavia Tornado', true],
                    ['Eurofighter Typhoon', false],
                    ['F-15 Eagle', false],
                    ['Harrier', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/saab-draken/02.jpg",
                [
                    ['Saab Draken', true],
                    ['JAS-39 Gripen', false],
                    ['Mirage 2000', false],
                    ['Dassault Rafale', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/sr-71-blackbird/02.jpg",
                [
                    ['SR-71 Blackbird', true],
                    ['MiG-25 Foxbat', false],
                    ['F-22 Raptor', false],
                    ['Su-57 Felon', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/su-27-flanker/02.jpg",
                [
                    ['Su-27 Flanker', true],
                    ['MiG-29 Fulcrum', false],
                    ['Su-35 Flanker-E', false],
                    ['F-15 Eagle', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/su-35-flanker-e/02.jpg",
                [
                    ['Su-35 Flanker-E', true],
                    ['Su-27 Flanker', false],
                    ['Su-57 Felon', false],
                    ['MiG-29 Fulcrum', false],
                ],
            ],
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/su-57-felon/02.jpg",
                [
                    ['Su-57 Felon', true],
                    ['Su-35 Flanker-E', false],
                    ['J-20 Mighty Dragon', false],
                    ['F-22 Raptor', false],
                ],
            ],
        ];

        foreach ($questionsData as [$text, $imageUrl, $answersData]) {
            $question = new Question();
            $question->setText($text);
            $question->setImageUrl($imageUrl);
            $question->setType('full');

            foreach ($answersData as [$answerText, $isCorrect]) {
                $answer = new Answer();
                $answer->setText($answerText);
                $answer->setIsCorrect($isCorrect);
                $question->addAnswer($answer);
                $manager->persist($answer);
            }

            $manager->persist($question);
        }

        foreach ($zoomedQuestionsData as [$text, $imageUrl, $answersData]) {
            $question = new Question();
            $question->setText($text);
            $question->setImageUrl($imageUrl);
            $question->setType('zoomed');

            foreach ($answersData as [$answerText, $isCorrect]) {
                $answer = new Answer();
                $answer->setText($answerText);
                $answer->setIsCorrect($isCorrect);
                $question->addAnswer($answer);
                $manager->persist($answer);
            }

            $manager->persist($question);
        }

        // --- Versus questions ---
        // Format: [ text, imageUrlA (left), imageUrlB (right), [ [answerText, isCorrect], ... ] ]
        // Exactly 2 answers per question: "Left" and "Right"
        $versusQuestionsData = [
            [
                'Which one is the F-22 Raptor?',
                "{$cdnUrl}/f-22-raptor/01.jpg",
                "{$cdnUrl}/f-35-lightning-ii/01.jpg",
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the Su-27 Flanker?',
                "{$cdnUrl}/mig-29-fulcrum/01.jpg",
                "{$cdnUrl}/su-27-flanker/01.jpg",
                [['Left', false], ['Right', true]],
            ],
            [
                'Which one is the F-16 Fighting Falcon?',
                "{$cdnUrl}/f-16-fighting-falcon/01.jpg",
                "{$cdnUrl}/fa-18-hornet/01.jpg",
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the Eurofighter Typhoon?',
                "{$cdnUrl}/dassault-rafale/01.jpg",
                "{$cdnUrl}/eurofighter-typhoon/01.jpg",
                [['Left', false], ['Right', true]],
            ],
            [
                'Which one is the A-10 Thunderbolt II?',
                "{$cdnUrl}/a-10-thunderbolt-ii/01.jpg",
                "{$cdnUrl}/mirage-2000/01.jpg",
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the SR-71 Blackbird?',
                "{$cdnUrl}/sr-71-blackbird/01.jpg",
                "{$cdnUrl}/mig-21-fishbed/01.jpg",
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the Su-57 Felon?',
                "{$cdnUrl}/su-57-felon/01.jpg",
                "{$cdnUrl}/j-20-mighty-dragon/01.jpg",
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the F-15 Eagle?',
                "{$cdnUrl}/fa-18-hornet/01.jpg",
                "{$cdnUrl}/f-15-eagle/01.jpg",
                [['Left', false], ['Right', true]],
            ],
            [
                'Which one is the JAS-39 Gripen?',
                "{$cdnUrl}/jas-39-gripen/01.jpg",
                "{$cdnUrl}/dassault-rafale/01.jpg",
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the Harrier?',
                "{$cdnUrl}/harrier/01.jpg",
                "{$cdnUrl}/a-10-thunderbolt-ii/01.jpg",
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the MiG-29 Fulcrum?',
                "{$cdnUrl}/su-35-flanker-e/01.jpg",
                "{$cdnUrl}/mig-29-fulcrum/01.jpg",
                [['Left', false], ['Right', true]],
            ],
            [
                'Which one is the Panavia Tornado?',
                "{$cdnUrl}/panavia-tornado/01.jpg",
                "{$cdnUrl}/eurofighter-typhoon/01.jpg",
                [['Left', true], ['Right', false]],
            ],
        ];

        foreach ($versusQuestionsData as [$text, $imageUrl, $imageUrlB, $answersData]) {
            $question = new Question();
            $question->setText($text);
            $question->setImageUrl($imageUrl);
            $question->setImageUrlB($imageUrlB);
            $question->setType('versus');

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
