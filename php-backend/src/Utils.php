<?php
namespace App;

class Utils
{
    public static array $MONTH_MAP = [
        'januari' => 1,
        'februari' => 2,
        'february' => 2,
        'maret' => 3,
        'april' => 4,
        'mei' => 5,
        'juni' => 6,
        'juli' => 7,
        'agustus' => 8,
        'september' => 9,
        'oktober' => 10,
        'november' => 11,
        'desember' => 12,
    ];

    public static function rowText(array $row): string
    {
        $parts = array_map(function ($v) {
            $s = is_null($v) ? '' : trim((string)$v);
            return $s;
        }, $row);
        $txt = trim(preg_replace('/\s+/', ' ', implode(' ', $parts)) ?? '');
        return $txt;
    }

    public static function toInt($val): ?int
    {
        if ($val === null || $val === '') return null;
        $num = (int)preg_replace('/[^\d]/', '', (string)$val);
        return is_finite($num) ? $num : null;
    }

    public static function marketNameFromFilename(string $filePath): string
    {
        $base = pathinfo($filePath, PATHINFO_FILENAME);
        if (preg_match('/^pasar-([a-z\- ]+?)(?:-\d{4})?$/i', $base, $m)) {
            $part = trim(preg_replace('/\s+/', ' ', str_replace('-', ' ', $m[1])));
            $words = array_map(fn($w) => mb_strtoupper(mb_substr($w, 0, 1)) . mb_strtolower(mb_substr($w, 1)), explode(' ', $part));
            return 'Pasar ' . implode(' ', $words);
        }
        $part = trim(preg_replace('/\s+/', ' ', str_replace('-', ' ', $base)));
        $words = array_map(fn($w) => mb_strtoupper(mb_substr($w, 0, 1)) . mb_strtolower(mb_substr($w, 1)), explode(' ', $part));
        return implode(' ', $words);
    }

    public static function json(array $data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    public static function readJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if (!$raw) return [];
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    public static function cors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    public static function parseYearFromFilename(string $filePath, string $fallback = '2024'): string
    {
        if (preg_match('/(\d{4})/', basename($filePath), $m)) return $m[1];
        return $fallback;
    }

    public static function isoDate(int $year, int $month, int $day): string
    {
        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }

    public static function arrayGet(array $a, int $idx): mixed
    {
        return $a[$idx] ?? null;
    }
}

