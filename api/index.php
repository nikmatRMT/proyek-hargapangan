<?php
declare(strict_types=1);

use App\DataStore;
use App\ExcelLoader;
use App\Utils;

require __DIR__ . '/../vendor/autoload.php';

Utils::cors();

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$route = parse_url($requestUri, PHP_URL_PATH) ?? '/';
$route = $route === '' ? '/' : $route;
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

static $BOOTED = false;
static $EXCEL_SCANS = [];
if (!$BOOTED) {
    $loader = new ExcelLoader();
    $rows = $loader->loadAll();
    $ds = DataStore::get();
    $ds->load($rows);
    $EXCEL_SCANS = $loader->scanInfo;
    $BOOTED = true;
}

function q(string $key, $default = null) {
    return $_GET[$key] ?? $default;
}

if ($route === '/' && $method === 'GET') {
    Utils::json(['status' => 'ok', 'rows' => count(DataStore::get()->reports)]);
    exit;
}

if ($route === '/api/health' && $method === 'GET') {
    Utils::json(['status' => 'ok', 'rows' => count(DataStore::get()->reports)]);
    exit;
}

if ($route === '/api/markets' && $method === 'GET') {
    $ds = DataStore::get();
    $rows = [];
    foreach ($ds->markets as $id => $name) {
        $rows[] = ['id' => $id, 'name' => $name];
    }
    Utils::json(['data' => $rows]);
    exit;
}

if ($route === '/api/commodities' && $method === 'GET') {
    $ds = DataStore::get();
    $rows = [];
    foreach ($ds->commodities as $id => $name) {
        $rows[] = ['id' => $id, 'name' => $name];
    }
    Utils::json(['data' => $rows]);
    exit;
}

if ($route === '/api/prices' && $method === 'GET') {
    $ds = DataStore::get();
    $rows = $ds->reports;
    $from = q('from');
    $to = q('to');
    $year = q('year');
    $month = q('month');
    $marketId = q('marketId');
    $marketParam = q('market');
    $sort = strtolower((string)q('sort', 'desc'));
    $page = (int)q('page', 1);
    $pageSize = (int)q('pageSize', 2000);

    if ($year && $month) {
        $y = sprintf('%04d', (int)$year);
        $m = sprintf('%02d', (int)$month);
        $last = (int)date('t', strtotime("$y-$m-01"));
        $from = "$y-$m-01";
        $to = "$y-$m-" . sprintf('%02d', $last);
    }

    if ($from) {
        $rows = array_values(array_filter($rows, fn($r) => ($r['date'] ?? '') >= $from));
    }

    if ($to) {
        $rows = array_values(array_filter($rows, fn($r) => ($r['date'] ?? '') <= $to));
    }

    $targetMarketId = null;
    if ($marketId) {
        $targetMarketId = (int)$marketId;
    }

    if ($marketParam && strtolower((string)$marketParam) !== 'all') {
        if (ctype_digit((string)$marketParam)) {
            $targetMarketId = (int)$marketParam;
        }
    }

    if ($targetMarketId) {
        $rows = array_values(array_filter($rows, fn($r) => (int)($r['market_id'] ?? 0) === $targetMarketId));
    }

    usort($rows, fn($a, $b) => strcmp($a['date'] ?? '', $b['date'] ?? ''));

    if ($sort !== 'asc') {
        $rows = array_reverse($rows);
    }

    $total = count($rows);

    if ($pageSize > 0) {
        $offset = max(0, ($page - 1) * $pageSize);
        $rows = array_slice($rows, $offset, $pageSize);
    }

    Utils::json(['rows' => $rows, 'total' => $total]);
    exit;
}

if ($route === '/api/prices' && $method === 'PATCH') {
    $body = Utils::readJsonBody();
    $id = isset($body['id']) ? (int)$body['id'] : null;

    if ($id) {
        $price = isset($body['price']) ? (int)$body['price'] : null;

        if (!$price || $price <= 0) {
            Utils::json(['message' => 'Harga tidak valid'], 400);
            exit;
        }

        $unit = $body['unit'] ?? null;
        $notes = $body['notes'] ?? null;
        $row = DataStore::get()->updatePriceById($id, $price, $unit, $notes);

        if (!$row) {
            Utils::json(['message' => 'Not found'], 404);
            exit;
        }

        Utils::json($row);
        exit;
    }

    $date = $body['date'] ?? null;
    $marketId = isset($body['market_id']) ? (int)$body['market_id'] : null;
    $commodityId = isset($body['commodity_id']) ? (int)$body['commodity_id'] : null;
    $price = isset($body['price']) ? (int)$body['price'] : null;

    if (!$date || !$marketId || !$commodityId || !$price) {
        Utils::json(['message' => 'Argumen tidak lengkap'], 400);
        exit;
    }

    $row = DataStore::get()->upsertPriceByKey($date, $marketId, $commodityId, $price, $body['unit'] ?? null, $body['notes'] ?? null);
    Utils::json($row);
    exit;
}

if ($route === '/api/prices/upsert' && $method === 'POST') {
    $body = Utils::readJsonBody();
    $date = $body['date'] ?? null;
    $marketId = isset($body['market_id']) ? (int)$body['market_id'] : null;
    $commodityId = isset($body['commodity_id']) ? (int)$body['commodity_id'] : null;
    $price = isset($body['price']) ? (int)$body['price'] : null;

    if (!$date || !$marketId || !$commodityId || !$price) {
        Utils::json(['message' => 'Argumen tidak lengkap'], 400);
        exit;
    }

    $row = DataStore::get()->upsertPriceByKey($date, $marketId, $commodityId, $price, $body['unit'] ?? null, $body['notes'] ?? null);
    Utils::json($row);
    exit;
}

Utils::json(['message' => 'Not Found', 'route' => $route], 404);
