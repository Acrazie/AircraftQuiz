<?php

namespace App\DataFixtures;

use App\Entity\Answer;
use App\Entity\Question;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class QuestionFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $cdnUrl = $_ENV['CDN_URL'] ?? 'http://localhost:8080';

        foreach (self::getQuestionsData($cdnUrl) as [$text, $imageUrl, $imageUrlB, $type, $answersData]) {
            $question = new Question();
            $question->setText($text);
            $question->setImageUrl($imageUrl);
            $question->setType($type);

            if ($imageUrlB !== null) {
                $question->setImageUrlB($imageUrlB);
            }

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

    public static function getQuestionsData(string $cdnUrl): array
    {
        return [
            // --- Full questions ---
            [
                'Which aircraft is this?',
                "{$cdnUrl}/a-10-thunderbolt-ii/01.jpg",
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
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
                null,
                'full',
                [
                    ['Su-57 Felon', true],
                    ['Su-35 Flanker-E', false],
                    ['J-20 Mighty Dragon', false],
                    ['F-22 Raptor', false],
                ],
            ],
            // --- Zoomed questions ---
            [
                'Which aircraft does this detail belong to?',
                "{$cdnUrl}/a-10-thunderbolt-ii/02.jpg",
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
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
                null,
                'zoomed',
                [
                    ['Su-57 Felon', true],
                    ['Su-35 Flanker-E', false],
                    ['J-20 Mighty Dragon', false],
                    ['F-22 Raptor', false],
                ],
            ],
            // --- Versus questions ---
            [
                'Which one is the F-22 Raptor?',
                "{$cdnUrl}/f-22-raptor/01.jpg",
                "{$cdnUrl}/f-35-lightning-ii/01.jpg",
                'versus',
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the Su-27 Flanker?',
                "{$cdnUrl}/mig-29-fulcrum/01.jpg",
                "{$cdnUrl}/su-27-flanker/01.jpg",
                'versus',
                [['Left', false], ['Right', true]],
            ],
            [
                'Which one is the F-16 Fighting Falcon?',
                "{$cdnUrl}/f-16-fighting-falcon/01.jpg",
                "{$cdnUrl}/fa-18-hornet/01.jpg",
                'versus',
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the Eurofighter Typhoon?',
                "{$cdnUrl}/dassault-rafale/01.jpg",
                "{$cdnUrl}/eurofighter-typhoon/01.jpg",
                'versus',
                [['Left', false], ['Right', true]],
            ],
            [
                'Which one is the A-10 Thunderbolt II?',
                "{$cdnUrl}/a-10-thunderbolt-ii/01.jpg",
                "{$cdnUrl}/mirage-2000/01.jpg",
                'versus',
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the SR-71 Blackbird?',
                "{$cdnUrl}/sr-71-blackbird/01.jpg",
                "{$cdnUrl}/mig-21-fishbed/01.jpg",
                'versus',
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the Su-57 Felon?',
                "{$cdnUrl}/su-57-felon/01.jpg",
                "{$cdnUrl}/j-20-mighty-dragon/01.jpg",
                'versus',
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the F-15 Eagle?',
                "{$cdnUrl}/fa-18-hornet/01.jpg",
                "{$cdnUrl}/f-15-eagle/01.jpg",
                'versus',
                [['Left', false], ['Right', true]],
            ],
            [
                'Which one is the JAS-39 Gripen?',
                "{$cdnUrl}/jas-39-gripen/01.jpg",
                "{$cdnUrl}/dassault-rafale/01.jpg",
                'versus',
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the Harrier?',
                "{$cdnUrl}/harrier/01.jpg",
                "{$cdnUrl}/a-10-thunderbolt-ii/01.jpg",
                'versus',
                [['Left', true], ['Right', false]],
            ],
            [
                'Which one is the MiG-29 Fulcrum?',
                "{$cdnUrl}/su-35-flanker-e/01.jpg",
                "{$cdnUrl}/mig-29-fulcrum/01.jpg",
                'versus',
                [['Left', false], ['Right', true]],
            ],
            [
                'Which one is the Panavia Tornado?',
                "{$cdnUrl}/panavia-tornado/01.jpg",
                "{$cdnUrl}/eurofighter-typhoon/01.jpg",
                'versus',
                [['Left', true], ['Right', false]],
            ],
        ];
    }
}
