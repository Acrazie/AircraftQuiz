<?php

namespace App\Command;

use App\DataFixtures\QuestionFixtures;
use App\Entity\Answer;
use App\Entity\Question;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:seed-questions',
    description: 'Seed aircraft questions (idempotent — skips if already present)',
)]
class SeedQuestionsCommand extends Command
{
    public function __construct(private EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $count = $this->em->getRepository(Question::class)->count([]);
        if ($count > 0) {
            $io->success("Already seeded ({$count} questions present), skipping.");
            return Command::SUCCESS;
        }

        $cdnUrl = $_ENV['CDN_URL'] ?? 'http://localhost:8080';
        $questionsData = QuestionFixtures::getQuestionsData($cdnUrl);

        foreach ($questionsData as [$text, $imageUrl, $imageUrlB, $type, $answersData]) {
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
                $this->em->persist($answer);
            }

            $this->em->persist($question);
        }

        $this->em->flush();

        $io->success(sprintf('Seeded %d questions successfully.', count($questionsData)));

        return Command::SUCCESS;
    }
}
