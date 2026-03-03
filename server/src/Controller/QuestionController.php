<?php

namespace App\Controller;

use App\Entity\Answer;
use App\Entity\Question;
use App\Repository\QuestionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class QuestionController extends AbstractController
{
    #[Route('/api/questions', name: 'app_questions', methods: ['GET'])]
    public function index(QuestionRepository $questionRepository): JsonResponse
    {
        $questions = $questionRepository->findAllWithAnswers();

        $data = array_map(function (Question $question) {
            $answers = $question->getAnswers()->toArray();

            $correctAnswer = null;
            foreach ($answers as $answer) {
                if ($answer->isCorrect()) {
                    $correctAnswer = $answer;
                    break;
                }
            }

            return [
                'id' => $question->getId()->toRfc4122(),
                'text' => $question->getText(),
                'imageUrl' => $question->getImageUrl(),
                'correctAnswerId' => $correctAnswer?->getId()->toRfc4122(),
                'answers' => array_map(fn(Answer $a) => [
                    'id' => $a->getId()->toRfc4122(),
                    'text' => $a->getText(),
                ], $answers),
            ];
        }, $questions);

        return $this->json($data, Response::HTTP_OK);
    }
}
