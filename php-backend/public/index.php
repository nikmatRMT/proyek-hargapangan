<?php
declare(strict_types=1);

use App\DataStore;
use App\ExcelLoader;
use App\MongoBridge;
use App\Utils;

// Composer autoload from repo root vendor/
require __DIR__ . '/../../vendor/autoload.php';

Utils::cors();

// Initialize data on first request (per-process). In production, consider a cache layer.
static $BOOTED = false; static $EXCEL_SCANS = [];
static $USING_MONGO = false;
if (!$BOOTED) {
    // Try Mongo first; fallback to Excel files
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

// Basic router
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Utility for reading query
function q(string $key, $default = null) {
    return $_GET[$key] ?? $default;
}

// ===== SSE (/sse/prices) =====
if ($uri === '/sse/prices') {
    // Long-poll SSE based on storage file updating
    @ini_set('zlib.output_compression', '0');
    @ini_set('output_buffering', 'off');
    @ini_set('implicit_flush', '1');
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache, no-transform');
    header('Connection: keep-alive');
    header('X-Accel-Buffering: no');
    $ds = DataStore::get();
    $lastTs = 0;
    echo "retry: 5000\n\n";
    @ob_flush(); @flush();
    ignore_user_abort(true);
    $start = time();
    while (!connection_aborted()) {
        $ev = $ds->readSse();
        $ts = (int)($ev['ts'] ?? 0);
        if ($ts > $lastTs) {
            $lastTs = $ts;
            $payload = json_encode($ev['payload'] ?? ['type' => 'prices', 'ts' => $ts]);
            echo "event: prices\n";
            echo "data: $payload\n\n";
            @ob_flush(); @flush();
        } else {
            // periodic ping to keep connection alive
            echo ": ping\n\n";
            @ob_flush(); @flush();
        }
        // avoid infinite loops too long in dev (5 minutes)
        if (time() - $start > 300) break;
        usleep(1000_000);
    }
    exit;
}

// ===== Basic health =====
if ($uri === '/' && $method === 'GET') {
    echo 'DKP3 PHP API OK';
    exit;
}
if ($uri === '/health' && $method === 'GET') {
    $ds = DataStore::get();
    Utils::json(['status' => 'ok', 'rows' => count($ds->reports)]);
    exit;
}

// ===== Debug =====
if ($uri === '/_debug/scan' && $method === 'GET') {
    Utils::json($USING_MONGO ? ['mode' => 'mongo'] : $EXCEL_SCANS);
    exit;
}
if ($uri === '/_debug/markets' && $method === 'GET') {
    if ($USING_MONGO) {
        Utils::json(['mode' => 'mongo']);
    } else {
        $ds = DataStore::get();
        $m = [];
        foreach ($ds->reports as $r) {
            $name = $r['market_name'] ?? '';
            $m[$name] = ($m[$name] ?? 0) + 1;
        }
        Utils::json($m);
    }
    exit;
}
if ($uri === '/_debug/first' && $method === 'GET') {
    $n = (int)q('limit', 20);
    $ds = DataStore::get();
    Utils::json(array_slice($ds->reports, 0, max(1, $n)));
    exit;
}

// ===== Legacy reports =====
if ($uri === '/reports' && $method === 'GET') {
    $ds = DataStore::get();
    $rows = $ds->reports;
    $from = q('from'); $to = q('to');
    $year = q('year'); $month = q('month');
    $marketSlugOrName = q('market');
    if ($year && $month) {
        $y = sprintf('%04d', (int)$year); $m = sprintf('%02d', (int)$month);
        $last = (int)date('t', strtotime("$y-$m-01"));
        $from = "$y-$m-01"; $to = "$y-$m-" . sprintf('%02d', $last);
    }
    if ($from) $rows = array_values(array_filter($rows, fn($r) => ($r['date'] ?? '') >= $from));
    if ($to)   $rows = array_values(array_filter($rows, fn($r) => ($r['date'] ?? '') <= $to));
    if ($marketSlugOrName) {
        $target = strtolower((string)$marketSlugOrName);
        $rows = array_values(array_filter($rows, fn($r) => strtolower($r['market_name'] ?? '') === $target || str_contains(strtolower($r['market_name'] ?? ''), $target)));
    }
    Utils::json($rows);
    exit;
}
if ($uri === '/reports/range' && $method === 'GET') {
    $ds = DataStore::get();
    $dates = array_values(array_filter(array_map(fn($r) => $r['date'] ?? null, $ds->reports)));
    sort($dates);
    Utils::json(['min' => $dates[0] ?? null, 'max' => ($dates ? $dates[count($dates)-1] : null)]);
    exit;
}
if ($uri === '/reports' && $method === 'POST') {
    $body = Utils::readJsonBody();
    $required = ['date','market_name','commodity_name','unit','price'];
    foreach ($required as $k) { if (!isset($body[$k])) { Utils::json(['error' => 'Invalid payload'], 400); exit; } }
    $ds = DataStore::get();
    $row = [
        'id' => (count($ds->reports) ? max(array_column($ds->reports, 'id')) : 0) + 1,
        'date' => (string)$body['date'],
        'market_name' => (string)$body['market_name'],
        'commodity_name' => (string)$body['commodity_name'],
        'unit' => (string)$body['unit'],
        'price' => (int)$body['price'],
        'user_name' => (string)($body['user_name'] ?? 'Anon'),
        'gps_lat' => $body['gps_lat'] ?? null,
        'gps_lng' => $body['gps_lng'] ?? null,
        'photo_url' => $body['photo_url'] ?? null,
        'notes' => $body['notes'] ?? ($body['keterangan'] ?? null),
    ];
    $ds->reports = array_merge([$row], $ds->reports); // unshift
    $ds->touchSse(['type' => 'prices', 'created' => ['id' => $row['id']]]);
    Utils::json($row, 201);
    exit;
}

// ===== API for web-admin =====
if ($uri === '/api/markets' && $method === 'GET') {
    if ($USING_MONGO) {
        $rows = MongoBridge::getMarketsList();
        Utils::json(['data' => $rows]);
    } else {
        $ds = DataStore::get();
        $rows = [];
        foreach ($ds->markets as $id => $name) { $rows[] = ['id' => $id, 'name' => $name]; }
        Utils::json(['data' => $rows]);
    }
    exit;
}
if ($uri === '/api/commodities' && $method === 'GET') {
    if ($USING_MONGO) {
        $rows = MongoBridge::getCommoditiesList();
        Utils::json(['data' => $rows]);
    } else {
        $ds = DataStore::get();
        $rows = [];
        foreach ($ds->commodities as $id => $name) { $rows[] = ['id' => $id, 'name' => $name]; }
        Utils::json(['data' => $rows]);
    }
    exit;
}
if ($uri === '/api/prices' && $method === 'GET') {
    if ($USING_MONGO) {
        $params = [
            'from' => q('from'), 'to' => q('to'),
            'year' => q('year'), 'month' => q('month'),
            'marketId' => q('marketId') ?? q('market'),
            'sort' => q('sort'), 'page' => q('page'), 'pageSize' => q('pageSize'),
        ];
        $res = MongoBridge::listPrices($params);
        Utils::json($res);
    } else {
        $ds = DataStore::get();
        $rows = $ds->reports;
        $from = q('from'); $to = q('to');
        $year = q('year'); $month = q('month');
        $marketId = q('marketId');
        $marketParam = q('market'); // may be 'all' or numeric
        $sort = strtolower((string)q('sort', 'desc'));
        $page = (int)q('page', 1);
        $pageSize = (int)q('pageSize', 2000);

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
        if ($targetMarketId) {
            $rows = array_values(array_filter($rows, fn($r) => (int)($r['market_id'] ?? 0) === $targetMarketId));
        }

        // sort by date
        usort($rows, fn($a, $b) => strcmp($a['date'] ?? '', $b['date'] ?? ''));
        if ($sort !== 'asc') $rows = array_reverse($rows);

        $total = count($rows);
        if ($pageSize > 0) {
            $offset = max(0, ($page - 1) * $pageSize);
            $rows = array_slice($rows, $offset, $pageSize);
        }

        Utils::json(['rows' => $rows, 'total' => $total]);
    }
    exit;
}
// PATCH /api/prices/:id  or /api/prices (id in body)
if (preg_match('~^/api/prices/(\d+)$~', $uri, $mm) && in_array($method, ['PATCH','PUT'])) {
    $id = (int)$mm[1];
    $body = Utils::readJsonBody();
    $price = isset($body['price']) ? (int)$body['price'] : null;
    if (!$price || $price <= 0) { Utils::json(['message' => 'Harga tidak valid'], 400); exit; }
    $unit = $body['unit'] ?? null; $notes = $body['notes'] ?? null;
    $row = DataStore::get()->updatePriceById($id, $price, $unit, $notes);
    if (!$row) { Utils::json(['message' => 'Not found'], 404); exit; }
    Utils::json($row);
    exit;
}
if ($uri === '/api/prices' && $method === 'PATCH') {
    $body = Utils::readJsonBody();
    if ($USING_MONGO) {
        // Always use upsert by key when using Mongo for safety
        try {
            $row = MongoBridge::upsertPrice($body);
            Utils::json($row);
        } catch (\Throwable $e) {
            Utils::json(['message' => $e->getMessage()], 400);
        }
    } else {
        $id = isset($body['id']) ? (int)$body['id'] : null;
        if ($id) {
            $price = isset($body['price']) ? (int)$body['price'] : null;
            if (!$price || $price <= 0) { Utils::json(['message' => 'Harga tidak valid'], 400); exit; }
            $unit = $body['unit'] ?? null; $notes = $body['notes'] ?? null;
            $row = DataStore::get()->updatePriceById($id, $price, $unit, $notes);
            if (!$row) { Utils::json(['message' => 'Not found'], 404); exit; }
            Utils::json($row);
        } else {
            // upsert by key
            $date = $body['date'] ?? null; $marketId = isset($body['market_id']) ? (int)$body['market_id'] : null; $commodityId = isset($body['commodity_id']) ? (int)$body['commodity_id'] : null; $price = isset($body['price']) ? (int)$body['price'] : null;
            if (!$date || !$marketId || !$commodityId || !$price) { Utils::json(['message' => 'Argumen tidak lengkap'], 400); exit; }
            $row = DataStore::get()->upsertPriceByKey($date, $marketId, $commodityId, $price, $body['unit'] ?? null, $body['notes'] ?? null);
            Utils::json($row);
        }
    }
    exit;
}
if ($uri === '/api/prices/upsert' && $method === 'POST') {
    $body = Utils::readJsonBody();
    if ($USING_MONGO) {
        try {
            $row = MongoBridge::upsertPrice($body);
            Utils::json($row);
        } catch (\Throwable $e) {
            Utils::json(['message' => $e->getMessage()], 400);
        }
    } else {
        $date = $body['date'] ?? null; $marketId = isset($body['market_id']) ? (int)$body['market_id'] : null; $commodityId = isset($body['commodity_id']) ? (int)$body['commodity_id'] : null; $price = isset($body['price']) ? (int)$body['price'] : null;
        if (!$date || !$marketId || !$commodityId || !$price) { Utils::json(['message' => 'Argumen tidak lengkap'], 400); exit; }
        $row = DataStore::get()->upsertPriceByKey($date, $marketId, $commodityId, $price, $body['unit'] ?? null, $body['notes'] ?? null);
        Utils::json($row);
    }
    exit;
}

// ===== Import Excel =====
if (preg_match('~^/api/import-excel(?:/upload)?$~', $uri) && $method === 'POST') {
    // Accept multipart: file, marketName, marketId, bulk, month, year, truncate
    if (empty($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        Utils::json(['message' => 'file wajib diunggah'], 400); exit;
    }
    $marketId = isset($_POST['marketId']) ? (int)$_POST['marketId'] : null;
    $marketName = $_POST['marketName'] ?? '';
    $bulk = !empty($_POST['bulk']);
    $truncate = !empty($_GET['truncate']) || !empty($_POST['truncate']);
    $month = $_POST['month'] ?? null; $year = $_POST['year'] ?? null;
    if (!$bulk && (!$month || !$year)) { Utils::json(['message' => 'month & year wajib untuk mode satu-bulan'], 400); exit; }
    if (!$marketId || !$marketName) { Utils::json(['message' => 'marketId & marketName wajib'], 400); exit; }

    $uploads = __DIR__ . '/../uploads'; if (!is_dir($uploads)) @mkdir($uploads, 0777, true);
    $name = time() . '-' . preg_replace('~[^a-zA-Z0-9_.-]~', '_', $_FILES['file']['name']);
    $target = $uploads . '/' . $name;
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
        Utils::json(['message' => 'Gagal menyimpan upload'], 500); exit;
    }

    $loader = new ExcelLoader();
    $rows = [];
    // Force parsing that file only by temporarily respecting EXCEL_FILES environment if needed
    try {
        // We load using the structured/simple parser directly to avoid changing env
        $ref = new \ReflectionClass(ExcelLoader::class);
        $m1 = $ref->getMethod('parseStructured'); $m1->setAccessible(true);
        $m2 = $ref->getMethod('parseSimple'); $m2->setAccessible(true);
        $marketNameFromFile = $marketName ?: Utils::marketNameFromFilename($target);
        $res = $m1->invoke($loader, $target, $marketNameFromFile);
        if (!($res['rows'] ?? [])) $res = $m2->invoke($loader, $target, $marketNameFromFile);
        $rows = $res['rows'] ?? [];
    } catch (\Throwable $e) {
        Utils::json(['message' => 'Gagal mem-parsing Excel: ' . $e->getMessage()], 500); exit;
    }

    // Normalize to DataStore shape with ids
    $ds = DataStore::get();
    // attach market_id & commodity_id using existing maps or new assignment
    $norm = [];
    foreach ($rows as $r) {
        $mId = $ds->marketNameToId[$marketName] ?? null;
        if (!$mId) {
            // add new market if unseen
            $mId = count($ds->markets) + 1;
            $ds->markets[$mId] = $marketName;
            $ds->marketNameToId[$marketName] = $mId;
        }
        // month/year filtering if single-bulan mode
        if (!$bulk && $month && $year) {
            $ym = sprintf('%04d-%02d-', (int)$year, (int)$month);
            if (!str_starts_with((string)($r['date'] ?? ''), $ym)) continue;
        }
        $cname = (string)($r['commodity_name'] ?? '');
        if ($cname !== '' && !isset($ds->commodityNameToId[$cname])) {
            $cid = count($ds->commodities) + 1;
            $ds->commodities[$cid] = $cname;
            $ds->commodityNameToId[$cname] = $cid;
        }
        $norm[] = [
            'id' => 0,
            'date' => (string)($r['date'] ?? ''),
            'market_id' => $mId,
            'market_name' => $marketName,
            'commodity_id' => $ds->commodityNameToId[$cname] ?? null,
            'commodity_name' => $cname,
            'unit' => (string)($r['unit'] ?? 'kg'),
            'price' => (int)($r['price'] ?? 0),
            'user_name' => 'import',
            'gps_lat' => null,
            'gps_lng' => null,
            'photo_url' => null,
            'notes' => null,
        ];
    }
    // If truncate: drop existing data for that market & month
    if ($truncate) {
        if ($bulk) {
            // truncate all months for this market
            $ds->reports = array_values(array_filter($ds->reports, fn($r) => (int)$r['market_id'] !== (int)$marketId));
        } else if ($month && $year) {
            $ym = sprintf('%04d-%02d-', (int)$year, (int)$month);
            $ds->reports = array_values(array_filter($ds->reports, fn($r) => !((int)$r['market_id'] === (int)$marketId && str_starts_with((string)$r['date'], $ym))));
        }
    }
    // Merge and reload to re-id
    $ds->load(array_merge($ds->reports, $norm));
    $ds->touchSse(['type' => 'prices', 'imported' => count($norm)]);

    Utils::json(['ok' => true, 'imported' => count($norm), 'skipped' => 0]);
    exit;
}

// ===== Default: 404 =====
Utils::json(['message' => 'Not Found'], 404);
