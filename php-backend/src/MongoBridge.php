<?php
namespace App;

use MongoDB\Client as MongoClient;
use MongoDB\BSON\UTCDateTime;
use MongoDB\BSON\ObjectId;

class MongoBridge
{
    private static ?MongoClient $client = null;
    private static ?string $dbName = null;

    private static array $marketMap = [];      // [numId => ['_id'=>ObjectId,'nama'=>string]]
    private static array $marketLookup = [];   // [(string)ObjectId => numId]
    private static array $commodityMap = [];   // [numId => ['_id'=>ObjectId,'nama'=>string,'unit'=>string]]
    private static array $commodityLookup = [];// [(string)ObjectId => numId]

    public static function isAvailable(): bool
    {
        try {
            if (!extension_loaded('mongodb')) return false;
            $cli = self::client();
            // quick ping
            $cli->listDatabases();
            return true;
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

    private static function objectId(string $id): ObjectId
    {
        return ($id instanceof ObjectId) ? $id : new ObjectId($id);
    }

    // ===== Markets / Commodities mapping (numeric id for frontend) =====
    public static function loadMaps(): void
    {
        // sort by name for stable ordering
        $db = self::db();
        self::$marketMap = [];
        self::$marketLookup = [];
        self::$commodityMap = [];
        self::$commodityLookup = [];

        $i = 1;
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

    private static function numericMarketToOid(int $marketId): ?ObjectId
    {
        if (!self::$marketMap) self::loadMaps();
        $doc = self::$marketMap[$marketId] ?? null;
        return $doc ? ($doc['_id']) : null;
    }

    private static function numericCommodityToOid(int $commodityId): ?ObjectId
    {
        if (!self::$commodityMap) self::loadMaps();
        $doc = self::$commodityMap[$commodityId] ?? null;
        return $doc ? ($doc['_id']) : null;
    }

    // ===== Prices =====
    public static function listPrices(array $params): array
    {
        if (!self::$marketMap || !self::$commodityMap) self::loadMaps();
        $db = self::db();
        $coll = $db->selectCollection('laporan_harga');

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
                // penting: jangan kirim id numerik row agar frontend pakai upsert by key
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
        $db = self::db();
        $coll = $db->selectCollection('laporan_harga');

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
