<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class DocsController extends AbstractController
{
    #[Route("/api/docs", name: "api_docs")]
    public function index(): Response
    {
        return $this->render("docs/redocly.html.twig");
    }
}
