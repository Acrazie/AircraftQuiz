<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Functional tests for GET /api/questions.
 * Requires a running database with fixtures loaded:
 *   php bin/console doctrine:fixtures:load --env=test --no-interaction
 */
class QuestionControllerTest extends WebTestCase
{
    public function testGetQuestionsReturns200WithCorrectShape(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/questions');

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('Content-Type', 'application/json');

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertIsArray($data);
        $this->assertNotEmpty($data);

        $question = $data[0];
        $this->assertArrayHasKey('id', $question);
        $this->assertArrayHasKey('text', $question);
        $this->assertArrayHasKey('correctAnswerId', $question);
        $this->assertArrayHasKey('answers', $question);
        $this->assertIsArray($question['answers']);
        $this->assertNotEmpty($question['answers']);

        foreach ($question['answers'] as $answer) {
            $this->assertArrayHasKey('id', $answer);
            $this->assertArrayHasKey('text', $answer);
            // isCorrect must NOT be exposed to the client
            $this->assertArrayNotHasKey('isCorrect', $answer);
        }
    }

    public function testGetQuestionsDefaultCountIsFive(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/questions');

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertCount(5, $data);
    }

    public function testGetQuestionsRespectsCountParam(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/questions?count=3');

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertCount(3, $data);
    }

    public function testGetQuestionsCorrectAnswerIsIncludedInAnswers(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/questions?count=1');

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $question = $data[0];

        $answerIds = array_column($question['answers'], 'id');
        $this->assertContains(
            $question['correctAnswerId'],
            $answerIds,
            'correctAnswerId must match one of the answer IDs'
        );
    }

    public function testGetVersusQuestionsReturns200WithImageUrlB(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/questions?type=versus&count=5');

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertNotEmpty($data);

        foreach ($data as $question) {
            $this->assertArrayHasKey('imageUrlB', $question);
            $this->assertNotNull($question['imageUrlB'], 'imageUrlB must not be null for versus questions');
            $this->assertCount(2, $question['answers'], 'Versus questions must have exactly 2 answers');
        }
    }

    public function testUnknownTypeDefaultsToFull(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/questions?type=invalid&count=1');

        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        // Should return full-type questions (not empty)
        $this->assertNotEmpty($data);
    }
}
