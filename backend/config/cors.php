<?php

$frontendOrigins = array_values(array_filter(array_map(
    fn (string $origin): string => trim($origin),
    explode(
        ',',
        env('FRONTEND_URL', 'http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:8080'),
    ),
)));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => $frontendOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'Authorization', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
