<?php

namespace App\DTO;

use Symfony\Component\Validator\Constraints as Assert;

final class RegisterRequest
{
    public function __construct(
        #[Assert\NotBlank(message: 'Username is required.')]
        #[Assert\Length(min: 3, max: 30)]
        #[Assert\Regex(
            pattern: '/^[a-zA-Z0-9_\- ]+$/',
            message: 'Username may only contain letters, digits, underscores, hyphens, and spaces.',
        )]
        public readonly string $username,

        #[Assert\NotBlank(message: 'Email is required.')]
        #[Assert\Email]
        public readonly string $email,

        #[Assert\NotBlank(message: 'Password is required.')]
        #[Assert\Length(min: 8, max: 72, minMessage: 'Password must be at least {{ limit }} characters.')]
        public readonly string $password,
    ) {}
}
