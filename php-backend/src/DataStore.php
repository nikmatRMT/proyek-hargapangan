<?php
namespace App;

class DataStore
{
    private static ?DataStore $instance = null;

    public array $reports = []; // canonical rows
    public array $markets = []; // [id => name]
    public array $commodities = []; // [id => name]
    public array $marketNameToId = [];
    public array $commodityNameToId = [];

    private string $sseFile;

    private function __construct()
    {
        $storage = __DIR__ . '/../storage';
        if (!is_dir($storage)) @mkdir($storage, 0777, true);
        $this->sseFile = $storage . '/last_event.json';
    }

    public static function get(): DataStore
    {
        if (!self::$instance) self::$instance = new DataStore();
        return self::$instance;
    }

    public function load(array $rows): void
    {
        // Normalize and assign IDs sequentially by date asc like Node
        usort($rows, fn($a, $b) => strcmp($a['date'] ?? '', $b['date'] ?? ''));

        // markets & commodities mapping
        $this->marketNameToId = [];
        $this->commodityNameToId = [];
        $this->markets = [];
        $this->commodities = [];

        $id = 1;
        $out = [];
        foreach ($rows as $r) {
            $market = (string)($r['market_name'] ?? '');
            $commodity = (string)($r['commodity_name'] ?? '');
            if ($market !== '' && !isset($this->marketNameToId[$market])) {
                $mid = count($this->marketNameToId) + 1;
                $this->marketNameToId[$market] = $mid;
                $this->markets[$mid] = $market;
            }
            if ($commodity !== '' && !isset($this->commodityNameToId[$commodity])) {
                $cid = count($this->commodityNameToId) + 1;
                $this->commodityNameToId[$commodity] = $cid;
                $this->commodities[$cid] = $commodity;
            }
        }

        foreach ($rows as $r) {
            $marketId = $this->marketNameToId[$r['market_name'] ?? ''] ?? null;
            $commodityId = $this->commodityNameToId[$r['commodity_name'] ?? ''] ?? null;
            $out[] = [
                'id' => $id++,
                'date' => (string)($r['date'] ?? ''),
                'market_id' => $marketId,
                'market_name' => (string)($r['market_name'] ?? ''),
                'commodity_id' => $commodityId,
                'commodity_name' => (string)($r['commodity_name'] ?? ''),
                'unit' => (string)($r['unit'] ?? 'kg'),
                'price' => (int)($r['price'] ?? 0),
                'user_name' => (string)($r['user_name'] ?? 'import'),
                'gps_lat' => $r['gps_lat'] ?? null,
                'gps_lng' => $r['gps_lng'] ?? null,
                'photo_url' => $r['photo_url'] ?? null,
                'notes' => $r['notes'] ?? null,
            ];
        }
        $this->reports = $out;
    }

    public function replaceMonthForMarket(int $marketId, int $year, int $month, array $newRows): array
    {
        $ym = sprintf('%04d-%02d-', $year, $month);
        $kept = array_values(array_filter($this->reports, function ($r) use ($marketId, $ym) {
            return !($r['market_id'] === $marketId && str_starts_with((string)$r['date'], $ym));
        }));
        $merged = array_merge($kept, $newRows);
        $this->load($merged);
        return $newRows;
    }

    public function upsertPriceByKey(string $date, int $marketId, int $commodityId, int $price, ?string $unit = null, ?string $notes = null): array
    {
        $foundIdx = null;
        foreach ($this->reports as $i => $r) {
            if ($r['date'] === $date && $r['market_id'] === $marketId && $r['commodity_id'] === $commodityId) {
                $foundIdx = $i; break;
            }
        }
        if ($foundIdx !== null) {
            $this->reports[$foundIdx]['price'] = $price;
            if ($unit !== null) $this->reports[$foundIdx]['unit'] = $unit;
            if ($notes !== null) $this->reports[$foundIdx]['notes'] = $notes;
            $row = $this->reports[$foundIdx];
        } else {
            // build new row
            $marketName = $this->markets[$marketId] ?? '';
            $commodityName = $this->commodities[$commodityId] ?? '';
            $row = [
                'id' => (count($this->reports) ? max(array_column($this->reports, 'id')) : 0) + 1,
                'date' => $date,
                'market_id' => $marketId,
                'market_name' => $marketName,
                'commodity_id' => $commodityId,
                'commodity_name' => $commodityName,
                'unit' => $unit ?? 'kg',
                'price' => $price,
                'user_name' => 'web',
                'gps_lat' => null,
                'gps_lng' => null,
                'photo_url' => null,
                'notes' => $notes,
            ];
            $this->reports[] = $row;
        }
        $this->touchSse(['type' => 'prices', 'changed' => ['date' => $date, 'market_id' => $marketId, 'commodity_id' => $commodityId]]);
        return $row;
    }

    public function updatePriceById(int $id, int $price, ?string $unit = null, ?string $notes = null): ?array
    {
        foreach ($this->reports as $i => $r) {
            if ($r['id'] === $id) {
                $this->reports[$i]['price'] = $price;
                if ($unit !== null) $this->reports[$i]['unit'] = $unit;
                if ($notes !== null) $this->reports[$i]['notes'] = $notes;
                $this->touchSse(['type' => 'prices', 'changed' => ['id' => $id]]);
                return $this->reports[$i];
            }
        }
        return null;
    }

    public function touchSse(array $payload): void
    {
        $data = [
            'ts' => time(),
            'payload' => $payload,
        ];
        @file_put_contents($this->sseFile, json_encode($data));
    }

    public function readSse(): array
    {
        if (is_file($this->sseFile)) {
            $json = file_get_contents($this->sseFile);
            $data = json_decode($json, true);
            return is_array($data) ? $data : [];
        }
        return [];
    }
}

