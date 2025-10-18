<?php
namespace App;

use MongoDB\Client as MongoClient;
use MongoDB\BSON\UTCDateTime;
// BSON classes are referenced dynamically to allow fallback when the PHP mongodb extension is not installed.
use App\DataApiMongo;

class MongoBridge
{
    private static ?MongoClient $client = null;
    private static ?string $dbName = null;
    private static ?DataApiMongo $dataApi = null;
    private static ?bool $useDataApi = null;

    private static array $marketMap = [];      // [numId => ['_id'=>ObjectId,'nama'=>string]]
    private static array $marketLookup = [];   // [(string)ObjectId => numId]
    private static array $commodityMap = [];   // [numId => ['_id'=>ObjectId,'nama'=>string,'unit'=>string]]
    private static array $commodityLookup = [];// [(string)ObjectId => numId]

    public static function isAvailable(): bool
    {
        try {
            // Prefer native driver if available
            if (extension_loaded('mongodb')) {
                $cli = self::client();
                $cli->listDatabases();
                self::$useDataApi = false;
                return true;
            }
            // Fallback to Data API if configured
            $url = getenv('MONGODB_DATA_API_URL');
            $key = getenv('MONGODB_DATA_API_KEY');
            if ($url && $key) {
                if (!self::$dataApi) self::$dataApi = new DataApiMongo();
                // quick check: try a lightweight call
                try {
                    $res = self::$dataApi->findOne('pasar', []);
                    self::$useDataApi = true;
                    return true;
                } catch (\Throwable $e) {
                    return false;
                }
            }
            return false;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public static function client(): MongoClient
    {
        if (!self::$client) {
            $uri = getenv('MONGODB_URI') ?: 'mongodb://127.0.0.1:27017';
            self::$client = new MongoClient($uri, [
                'serverSelectionTimeoutMS' => 8000,
            ]);
            self::$dbName = getenv('MONGODB_DB') ?: 'harga_pasar_mongo';
        }
        return self::$client;
    }

    public static function db()
    {
        return self::client()->selectDatabase(self::$dbName ?: 'harga_pasar_mongo');
    }

    private static function objectId($id)
    {
        if ($id instanceof \MongoDB\BSON\ObjectId) return $id;
        return new \MongoDB\BSON\ObjectId((string)$id);
    }

    /**
     * Normalize various ID value shapes returned by Data API or native driver
     * - if value is array with ['$oid'] -> return the oid string
     * - if value is \MongoDB\BSON\ObjectId -> cast to string
     * - otherwise return string cast
     */
    private static function normalizeIdValue($v): string
    {
        if ($v instanceof \MongoDB\BSON\ObjectId) return (string)$v;
        if (is_array($v) && isset($v['$oid'])) return (string)$v['$oid'];
        if (is_array($v) && isset($v['_id'])) return (string)$v['_id'];
        return (string)$v;
    }

    private static function findOidInDoc(array $doc, array $candidates): string
    {
        foreach ($candidates as $k) {
            if (array_key_exists($k, $doc) && $doc[$k] !== null && $doc[$k] !== '') {
                return self::normalizeIdValue($doc[$k]);
            }
        }
        return '';
    }

    // ===== Markets / Commodities mapping (numeric id for frontend) =====
    public static function loadMaps(): void
    {
        // sort by name for stable ordering
        self::$marketMap = [];
        self::$marketLookup = [];
        self::$commodityMap = [];
        self::$commodityLookup = [];

        $i = 1;
        if (self::$useDataApi === null) self::isAvailable();
        if (self::$useDataApi) {
            if (!self::$dataApi) self::$dataApi = new DataApiMongo();
            // fetch more markets in case some price rows reference markets beyond first 100
            $markets = self::$dataApi->find('pasar', [], ['_id' => 1, 'nama_pasar' => 1], 1000, ['nama_pasar' => 1]);
            foreach ($markets as $d) {
                $oid = (string)($d['_id'] ?? '');
                $name = (string)($d['nama_pasar'] ?? '');
                self::$marketMap[$i] = ['_id' => $oid, 'nama' => $name];
                self::$marketLookup[$oid] = $i;
                $i++;
            }
            $j = 1;
            $comms = self::$dataApi->find('komoditas', [], ['_id' => 1, 'nama_komoditas' => 1, 'unit' => 1], 1000, ['nama_komoditas' => 1]);
            foreach ($comms as $d) {
                $oid = (string)($d['_id'] ?? '');
                $name = (string)($d['nama_komoditas'] ?? '');
                $unit = (string)($d['unit'] ?? 'kg');
                self::$commodityMap[$j] = ['_id' => $oid, 'nama' => $name, 'unit' => $unit];
                self::$commodityLookup[$oid] = $j;
                $j++;
            }
            return;
        }

        $db = self::db();
        foreach ($db->selectCollection('pasar')->find([], ['sort' => ['nama_pasar' => 1]]) as $d) {
            $oid = (string)$d['_id'];
            $name = (string)($d['nama_pasar'] ?? '');
            self::$marketMap[$i] = ['_id' => $d['_id'], 'nama' => $name];
            self::$marketLookup[$oid] = $i;
            $i++;
        }
        $j = 1;
        foreach ($db->selectCollection('komoditas')->find([], ['sort' => ['nama_komoditas' => 1]]) as $d) {
            $oid = (string)$d['_id'];
            $name = (string)($d['nama_komoditas'] ?? '');
            $unit = (string)($d['unit'] ?? 'kg');
            self::$commodityMap[$j] = ['_id' => $d['_id'], 'nama' => $name, 'unit' => $unit];
            self::$commodityLookup[$oid] = $j;
            $j++;
        }
    }

    public static function getMarketsList(): array
    {
        if (!self::$marketMap) self::loadMaps();
        $out = [];
        foreach (self::$marketMap as $num => $m) {
            $out[] = [
                'id' => $num,
                'name' => $m['nama'],
                'nama' => $m['nama'],
                'nama_pasar' => $m['nama'],
            ];
        }
        return $out;
    }

    public static function getCommoditiesList(): array
    {
        if (!self::$commodityMap) self::loadMaps();
        $out = [];
        foreach (self::$commodityMap as $num => $c) {
            $out[] = [
                'id' => $num,
                'name' => $c['nama'],
                'nama' => $c['nama'],
                'nama_komoditas' => $c['nama'],
                'unit' => $c['unit'],
            ];
        }
        return $out;
    }

    private static function findMarketNumericByName(string $name): ?int
    {
        if (!$name) return null;
        if (!self::$marketMap) self::loadMaps();
        $norm = strtolower(trim($name));
        foreach (self::$marketMap as $num => $m) {
            if (strtolower(trim((string)$m['nama'])) === $norm) return $num;
        }
        return null;
    }

    private static function findCommodityNumericByName(string $name): ?int
    {
        if (!$name) return null;
        if (!self::$commodityMap) self::loadMaps();
        $norm = strtolower(trim($name));
        foreach (self::$commodityMap as $num => $c) {
            if (strtolower(trim((string)$c['nama'])) === $norm) return $num;
        }
        return null;
    }

    private static function numericMarketToOid(int $marketId)
    {
        if (!self::$marketMap) self::loadMaps();
        $doc = self::$marketMap[$marketId] ?? null;
        return $doc ? ($doc['_id']) : null;
    }

    private static function numericCommodityToOid(int $commodityId)
    {
        if (!self::$commodityMap) self::loadMaps();
        $doc = self::$commodityMap[$commodityId] ?? null;
        return $doc ? ($doc['_id']) : null;
    }

    // ===== Prices =====
    public static function listPrices(array $params): array
    {
        if (!self::$marketMap || !self::$commodityMap) self::loadMaps();
        if (self::$useDataApi === null) self::isAvailable();
        $from = $params['from'] ?? null;
        $to = $params['to'] ?? null;
        if (!empty($params['year']) && !empty($params['month'])) {
            $y = sprintf('%04d', (int)$params['year']);
            $m = sprintf('%02d', (int)$params['month']);
            $last = (int)date('t', strtotime("$y-$m-01"));
            $from = "$y-$m-01"; $to = "$y-$m-" . sprintf('%02d', $last);
        }
        $marketId = $params['marketId'] ?? ($params['market'] ?? null);
        $sort = strtolower((string)($params['sort'] ?? 'desc'));
        $page = (int)($params['page'] ?? 1);
        $pageSize = (int)($params['pageSize'] ?? 2000);

        // Data API path
        if (self::$useDataApi) {
            if (!self::$dataApi) self::$dataApi = new DataApiMongo();
            $filter = [];
            if ($from || $to) {
                $dt = [];
                if ($from) $dt['$gte'] = ['$date' => date('Y-m-d\T00:00:00\Z', strtotime($from))];
                if ($to) $dt['$lte'] = ['$date' => date('Y-m-d\T23:59:59\Z', strtotime($to))];
                $filter['tanggal_lapor'] = $dt;
            }
            if ($marketId && strtolower((string)$marketId) !== 'all') {
                $oid = self::numericMarketToOid((int)$marketId);
                if ($oid) $filter['market_id'] = ['$oid' => (string)$oid];
            }
            $limit = $pageSize;
            $docs = self::$dataApi->find('laporan_harga', $filter, [], $limit, ['tanggal_lapor' => ($sort === 'asc' ? 1 : -1)]);
            $rows = [];
            $marketByOid = [];
            foreach (self::$marketMap as $num => $m) $marketByOid[(string)$m['_id']] = ['id' => $num, 'name' => $m['nama']];
            $commByOid = [];
            foreach (self::$commodityMap as $num => $c) $commByOid[(string)$c['_id']] = ['id' => $num, 'name' => $c['nama'], 'unit' => $c['unit']];
            foreach ($docs as $doc) {
                // try multiple candidate keys for market/commodity id because Data API shapes vary
                $mid = self::findOidInDoc(is_array($doc) ? $doc : [], ['market_id', 'market']);
                $cid = self::findOidInDoc(is_array($doc) ? $doc : [], ['komoditas_id', 'komoditas', 'commodity_id', 'commodity']);
                $m = $marketByOid[$mid] ?? ['id' => null, 'name' => ''];
                $c = $commByOid[$cid] ?? ['id' => null, 'name' => '', 'unit' => 'kg'];
                $date = '';
                if (!empty($doc['tanggal_lapor'])) {
                    // DataApi returned date strings possibly; try to normalize to Y-m-d
                    $dt = $doc['tanggal_lapor'];
                    if (is_string($dt)) {
                        $date = substr($dt, 0, 10);
                    } elseif (is_array($dt) && isset($dt['$date'])) {
                        $date = substr($dt['$date'], 0, 10);
                    }
                }
                $rows[] = [
                    'date' => $date,
                    'market_id' => $m['id'],
                    'market_name' => $m['name'],
                    'commodity_id' => $c['id'],
                    'commodity_name' => $c['name'],
                    'unit' => $c['unit'] ?? 'kg',
                    'price' => (int)($doc['harga'] ?? 0),
                    'notes' => $doc['keterangan'] ?? null,
                ];
            }
            $total = count($rows);
            return ['rows' => $rows, 'total' => $total];
        }

        // Native driver path
        $db = self::db();
        $coll = $db->selectCollection('laporan_harga');

        $filter = [];
        if ($from || $to) {
            $dt = [];
            if ($from) $dt['$gte'] = new UTCDateTime(strtotime($from . ' 00:00:00') * 1000);
            if ($to)   $dt['$lte'] = new UTCDateTime(strtotime($to   . ' 23:59:59') * 1000);
            $filter['tanggal_lapor'] = $dt;
        }
        if ($marketId && strtolower((string)$marketId) !== 'all') {
            $oid = self::numericMarketToOid((int)$marketId);
            if ($oid) $filter['market_id'] = $oid;
        }

        $total = $coll->countDocuments($filter);
        $cursor = $coll->find(
            $filter,
            [
                'sort' => ['tanggal_lapor' => ($sort === 'asc' ? 1 : -1)],
                'skip' => max(0, ($page - 1) * $pageSize),
                'limit' => $pageSize,
            ]
        );

        // build lookup maps for names & unit
        $marketByOid = [];
        foreach (self::$marketMap as $num => $m) $marketByOid[(string)$m['_id']] = ['id' => $num, 'name' => $m['nama']];
        $commByOid = [];
        foreach (self::$commodityMap as $num => $c) $commByOid[(string)$c['_id']] = ['id' => $num, 'name' => $c['nama'], 'unit' => $c['unit']];

        $rows = [];
        foreach ($cursor as $doc) {
            $mid = (string)($doc['market_id'] ?? '');
            $cid = (string)($doc['komoditas_id'] ?? '');
            $m = $marketByOid[$mid] ?? ['id' => null, 'name' => ''];
            $c = $commByOid[$cid] ?? ['id' => null, 'name' => '', 'unit' => 'kg'];
            $date = '';
            if (isset($doc['tanggal_lapor']) && $doc['tanggal_lapor'] instanceof UTCDateTime) {
                $date = $doc['tanggal_lapor']->toDateTime()->format('Y-m-d');
            }
            $rows[] = [
                'date' => $date,
                'market_id' => $m['id'],
                'market_name' => $m['name'],
                'commodity_id' => $c['id'],
                'commodity_name' => $c['name'],
                'unit' => $c['unit'] ?? 'kg',
                'price' => (int)($doc['harga'] ?? 0),
                'notes' => $doc['keterangan'] ?? null,
            ];
        }
        return ['rows' => $rows, 'total' => $total];
    }

    public static function upsertPrice(array $body): array
    {
        if (!self::$marketMap || !self::$commodityMap) self::loadMaps();
        if (self::$useDataApi === null) self::isAvailable();
        $date = (string)($body['date'] ?? '');
        $marketNum = isset($body['market_id']) ? (int)$body['market_id'] : null;
        $commNum = isset($body['commodity_id']) ? (int)$body['commodity_id'] : null;
        $price = isset($body['price']) ? (int)$body['price'] : null;
        if (!$date || !$marketNum || !$commNum || !$price) {
            throw new \InvalidArgumentException('Argumen tidak lengkap untuk upsert');
        }

        $mid = self::numericMarketToOid($marketNum);
        $cid = self::numericCommodityToOid($commNum);
        if (!$mid || !$cid) throw new \InvalidArgumentException('market_id / commodity_id tidak valid');

        if (self::$useDataApi) {
            if (!self::$dataApi) self::$dataApi = new DataApiMongo();
            // Build filter and update using extended JSON for ObjectId and date
            $whenIso = date('Y-m-d\T00:00:00\Z', strtotime($date));
            $filter = [
                'market_id' => ['$oid' => (string)$mid],
                'komoditas_id' => ['$oid' => (string)$cid],
                'tanggal_lapor' => ['$date' => $whenIso],
            ];
            $nowIso = date('c');
            $update = [
                '$setOnInsert' => [
                    'market_id' => ['$oid' => (string)$mid],
                    'komoditas_id' => ['$oid' => (string)$cid],
                    'tanggal_lapor' => ['$date' => $whenIso],
                    'created_at' => ['$date' => $nowIso],
                ],
                '$set' => [
                    'harga' => $price,
                    'keterangan' => $body['notes'] ?? null,
                    'updated_at' => ['$date' => $nowIso],
                ],
            ];
            self::$dataApi->updateOne('laporan_harga', $filter, $update, true);
            $m = self::$marketMap[$marketNum];
            $c = self::$commodityMap[$commNum];
            return [
                'date' => $date,
                'market_id' => $marketNum,
                'market_name' => $m['nama'],
                'commodity_id' => $commNum,
                'commodity_name' => $c['nama'],
                'unit' => $c['unit'] ?? 'kg',
                'price' => $price,
                'notes' => $body['notes'] ?? null,
            ];
        }

        $db = self::db();
        $coll = $db->selectCollection('laporan_harga');
        $when = new UTCDateTime(strtotime($date . ' 00:00:00') * 1000);
        $now = new UTCDateTime((int)(microtime(true) * 1000));

        $update = [
            '$setOnInsert' => [
                'market_id' => $mid,
                'komoditas_id' => $cid,
                'tanggal_lapor' => $when,
                'created_at' => $now,
            ],
            '$set' => [
                'harga' => $price,
                'keterangan' => $body['notes'] ?? null,
                'updated_at' => $now,
            ],
        ];
        $coll->updateOne(
            ['market_id' => $mid, 'komoditas_id' => $cid, 'tanggal_lapor' => $when],
            $update,
            ['upsert' => true]
        );

        // Build normalized row for response
        $m = self::$marketMap[$marketNum];
        $c = self::$commodityMap[$commNum];
        return [
            'date' => $date,
            'market_id' => $marketNum,
            'market_name' => $m['nama'],
            'commodity_id' => $commNum,
            'commodity_name' => $c['nama'],
            'unit' => $c['unit'] ?? 'kg',
            'price' => $price,
            'notes' => $body['notes'] ?? null,
        ];
    }
}
