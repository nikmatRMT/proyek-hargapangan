<?php
declare(strict_types=1);

// Vercel serverless PHP entrypoint.
// Rewrites forward /api/(.*) -> /api/index.php?route=$1

use App\DataStore;
use App\ExcelLoader;
use App\MongoBridge;
use App\Utils;

require __DIR__ . '/../vendor/autoload.php';

Utils::cors();

$route = isset($_GET['route']) ? '/' . ltrim((string)$_GET['route'], '/') : '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

static $BOOTED = false; static $EXCEL_SCANS = [];
static $USING_MONGO = false;
if (!$BOOTED) {
    if (MongoBridge::isAvailable()) {
        $USING_MONGO = true;
    } else {
        $loader = new ExcelLoader();
        $rows = $loader->loadAll();
        $ds = DataStore::get();
        $ds->load($rows);
        $EXCEL_SCANS = $loader->scanInfo;
    }
    $BOOTED = true;
}

function q(string $key, $default = null) { return $_GET[$key] ?? $default; }

if ($route === '/' && $method === 'GET') { echo 'DKP3 PHP API OK (vercel)'; exit; }
if ($route === '/health' && $method === 'GET') {
    if ($USING_MONGO) { Utils::json(['status' => 'ok', 'mode' => 'mongo']); }
    else { Utils::json(['status' => 'ok', 'rows' => count(DataStore::get()->reports)]); }
    exit;
}

if ($route === '/api/markets' && $method === 'GET') {
    if ($USING_MONGO) Utils::json(['data' => MongoBridge::getMarketsList()]);
    else {
        $rows = [];
        foreach (DataStore::get()->markets as $id => $name) $rows[] = ['id' => $id, 'name' => $name];
        Utils::json(['data' => $rows]);
    }
    exit;
}

if ($route === '/api/commodities' && $method === 'GET') {
    if ($USING_MONGO) Utils::json(['data' => MongoBridge::getCommoditiesList()]);
    else {
        $rows = [];
        foreach (DataStore::get()->commodities as $id => $name) $rows[] = ['id' => $id, 'name' => $name];
        Utils::json(['data' => $rows]);
    }
    exit;
}

if ($route === '/api/prices' && $method === 'GET') {
    if ($USING_MONGO) {
        $params = [
            'from' => q('from'), 'to' => q('to'),
            'year' => q('year'), 'month' => q('month'),
            'marketId' => q('marketId') ?? q('market'),
            'sort' => q('sort'), 'page' => q('page'), 'pageSize' => q('pageSize'),
        ];
        Utils::json(MongoBridge::listPrices($params));
    } else {
        $ds = DataStore::get();
        $rows = $ds->reports;
        $from = q('from'); $to = q('to');
        $year = q('year'); $month = q('month');
        $marketId = q('marketId'); $marketParam = q('market');
        $sort = strtolower((string)q('sort', 'desc'));
        $page = (int)q('page', 1); $pageSize = (int)q('pageSize', 2000);
        if ($year && $month) {
            $y = sprintf('%04d', (int)$year); $m = sprintf('%02d', (int)$month);
            $last = (int)date('t', strtotime("$y-$m-01"));
            $from = "$y-$m-01"; $to = "$y-$m-" . sprintf('%02d', $last);
        }
        if ($from) $rows = array_values(array_filter($rows, fn($r) => ($r['date'] ?? '') >= $from));
        if ($to)   $rows = array_values(array_filter($rows, fn($r) => ($r['date'] ?? '') <= $to));
        $targetMarketId = null;
        if ($marketId) $targetMarketId = (int)$marketId;
        if ($marketParam && strtolower((string)$marketParam) !== 'all') {
            if (ctype_digit((string)$marketParam)) $targetMarketId = (int)$marketParam;
        }
        if ($targetMarketId) $rows = array_values(array_filter($rows, fn($r) => (int)($r['market_id'] ?? 0) === $targetMarketId));
        usort($rows, fn($a, $b) => strcmp($a['date'] ?? '', $b['date'] ?? ''));
        if ($sort !== 'asc') $rows = array_reverse($rows);
        $total = count($rows);
        if ($pageSize > 0) $rows = array_slice($rows, max(0, ($page - 1) * $pageSize), $pageSize);
        Utils::json(['rows' => $rows, 'total' => $total]);
    }
    exit;
}

if ($route === '/api/prices' && $method === 'PATCH') {
    $body = Utils::readJsonBody();
    if ($USING_MONGO) {
        try { Utils::json(MongoBridge::upsertPrice($body)); }
        catch (\Throwable $e) { Utils::json(['message' => $e->getMessage()], 400); }
    } else {
        // in serverless mode, write will not persist; return echo result
        $date = $body['date'] ?? null; $marketId = isset($body['market_id']) ? (int)$body['market_id'] : null; $commodityId = isset($body['commodity_id']) ? (int)$body['commodity_id'] : null; $price = isset($body['price']) ? (int)$body['price'] : null;
        if (!$date || !$marketId || !$commodityId || !$price) { Utils::json(['message' => 'Argumen tidak lengkap'], 400); exit; }
        $row = ['date'=>$date,'market_id'=>$marketId,'commodity_id'=>$commodityId,'price'=>$price,'unit'=>$body['unit']??'kg','notes'=>$body['notes']??null];
        Utils::json($row);
    }
    exit;
}

if ($route === '/api/prices/upsert' && $method === 'POST') {
    $body = Utils::readJsonBody();
    if ($USING_MONGO) {
        try { Utils::json(MongoBridge::upsertPrice($body)); }
        catch (\Throwable $e) { Utils::json(['message' => $e->getMessage()], 400); }
    } else {
        $date = $body['date'] ?? null; $marketId = isset($body['market_id']) ? (int)$body['market_id'] : null; $commodityId = isset($body['commodity_id']) ? (int)$body['commodity_id'] : null; $price = isset($body['price']) ? (int)$body['price'] : null;
        if (!$date || !$marketId || !$commodityId || !$price) { Utils::json(['message' => 'Argumen tidak lengkap'], 400); exit; }
        $row = ['date'=>$date,'market_id'=>$marketId,'commodity_id'=>$commodityId,'price'=>$price,'unit'=>$body['unit']??'kg','notes'=>$body['notes']??null];
        Utils::json($row);
    }
    exit;
}

// Default 404
Utils::json(['message' => 'Not Found', 'route' => $route], 404);

