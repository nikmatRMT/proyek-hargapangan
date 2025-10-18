<?php
declare(strict_types=1);

use App\DataStore;
use App\ExcelLoader;
use App\Utils;
use App\MongoBridge;

require __DIR__ . '/../../vendor/autoload.php';

Utils::cors();

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$route = parse_url($requestUri, PHP_URL_PATH) ?? '/';
$route = $route === '' ? '/' : $route;
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// --- Booting ---
static $MONGO_AVAILABLE = false;
static $BOOTED = false;
static $EXCEL_SCANS = [];
if (!$BOOTED) {
    $MONGO_AVAILABLE = MongoBridge::isAvailable();
    if (!$MONGO_AVAILABLE) {
        $loader = new ExcelLoader();
        $rows = $loader->loadAll();
        $ds = DataStore::get();
        $ds->load($rows);
        $EXCEL_SCANS = $loader->scanInfo;
    }
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
    if ($MONGO_AVAILABLE) {
        Utils::json(['data' => MongoBridge::getMarketsList()]);
        exit;
    }
    $ds = DataStore::get();
    $rows = [];
    foreach ($ds->markets as $id => $name) {
        $rows[] = ['id' => $id, 'name' => $name];
    }
    Utils::json(['data' => $rows]);
    exit;
}

if ($route === '/api/commodities' && $method === 'GET') {
    if ($MONGO_AVAILABLE) {
        Utils::json(['data' => MongoBridge::getCommoditiesList()]);
        exit;
    }
    $ds = DataStore::get();
    $rows = [];
    foreach ($ds->commodities as $id => $name) {
        $rows[] = ['id' => $id, 'name' => $name];
    }
    Utils::json(['data' => $rows]);
    exit;
}

if ($route === '/api/check-dataapi' && $method === 'GET') {
    $ok = MongoBridge::isAvailable();
    $res = ['available' => $ok, 'method' => (extension_loaded('mongodb') ? 'native' : 'dataapi')];
    try {
        if ($ok) {
            $markets = MongoBridge::getMarketsList();
            $comms = MongoBridge::getCommoditiesList();
            $prices = [];
            if (class_exists(App\DataApiMongo::class)) {
                $dataApi = new App\DataApiMongo();
                $prices = $dataApi->find('laporan_harga', [], [], 5, ['tanggal_lapor' => -1]);
            }
            $res['samples'] = [
                'markets' => array_slice($markets, 0, 5),
                'commodities' => array_slice($comms, 0, 5),
                'prices_raw' => $prices,
            ];
        }
    } catch (Throwable $e) {
        $res['error'] = $e->getMessage();
    }
    Utils::json($res);
    exit;
}

// Temporary debug: show market/commodity maps and raw price documents
if ($route === '/api/prices-debug' && $method === 'GET') {
    $ok = MongoBridge::isAvailable();
    $out = ['available' => $ok];
    try {
        // maps
        $out['marketMap'] = MongoBridge::getMarketsList();
        $out['commodityMap'] = MongoBridge::getCommoditiesList();

        if ($ok) {
            // get raw price docs via DataApi when available, else native
            if (extension_loaded('mongodb')) {
                $db = MongoBridge::db();
                $docs = [];
                foreach ($db->selectCollection('laporan_harga')->find([], ['limit' => 5, 'sort' => ['tanggal_lapor' => -1]]) as $d) {
                    $docs[] = $d;
                }
                $out['prices_raw'] = $docs;
            } else {
                if (class_exists(App\DataApiMongo::class)) {
                    $api = new App\DataApiMongo();
                    $out['prices_raw'] = $api->find('laporan_harga', [], [], 5, ['tanggal_lapor' => -1]);
                }
            }
        }
    } catch (Throwable $e) {
        $out['error'] = $e->getMessage();
    }
    Utils::json($out);
    exit;
}

if ($route === '/api/prices' && $method === 'GET') {
    if ($MONGO_AVAILABLE) {
        $result = MongoBridge::listPrices($_GET);
        Utils::json($result);
        exit;
    }
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
    if ($MONGO_AVAILABLE) {
        try {
            $row = MongoBridge::upsertPrice($body);
            Utils::json($row);
        } catch (InvalidArgumentException $e) {
            Utils::json(['message' => $e->getMessage()], 400);
        }
        exit;
    }

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
    if ($MONGO_AVAILABLE) {
        try {
            $row = MongoBridge::upsertPrice($body);
            Utils::json($row);
        } catch (InvalidArgumentException $e) {
            Utils::json(['message' => $e->getMessage()], 400);
        }
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

Utils::json(['message' => 'Not Found', 'route' => $route], 404);
