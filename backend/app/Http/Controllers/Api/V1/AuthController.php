<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'email' => ['required', 'email', 'max:180', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'role' => 'customer',
        ]);

        return response()->json([
            'data' => $this->sessionPayload($user),
        ], 201);
    }

    public function login(Request $request)
    {
        return $this->loginForRole($request, 'customer');
    }

    public function adminLogin(Request $request)
    {
        return $this->loginForRole($request, 'admin');
    }

    private function loginForRole(Request $request, string $role)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || $user->role !== $role || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => $role === 'admin'
                    ? 'The admin email or password is incorrect.'
                    : 'The customer email or password is incorrect.',
            ]);
        }

        return response()->json([
            'data' => $this->sessionPayload($user),
        ]);
    }

    public function me(Request $request)
    {
        $user = $this->userFromBearer($request);

        abort_unless($user, 401, 'Unauthenticated.');

        return response()->json([
            'data' => [
                'user' => $this->userPayload($user),
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $user = $this->userFromBearer($request);

        if ($user) {
            $user->update(['api_token_hash' => null]);
        }

        return response()->json(['data' => ['message' => 'Signed out.']]);
    }

    public static function userFromBearer(Request $request): ?User
    {
        $token = $request->bearerToken();

        if (! $token) {
            return null;
        }

        return User::query()
            ->where('api_token_hash', hash('sha256', $token))
            ->first();
    }

    private function sessionPayload(User $user): array
    {
        $plainToken = Str::random(64);
        $user->forceFill([
            'api_token_hash' => hash('sha256', $plainToken),
        ])->save();

        return [
            'token' => $plainToken,
            'user' => $this->userPayload($user),
        ];
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
        ];
    }
}
