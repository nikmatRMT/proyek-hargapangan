<?php
require_once __DIR__ . '/../../vendor/autoload.php';
use App\MongoBridge;
use App\DataApiMongo;

header('Content-Type: application/json');

$ok = MongoBridge::isAvailable();
$res = ['available' => $ok, 'method' => (extension_loaded('mongodb') ? 'native' : 'dataapi')];
try {
    if ($ok) {
        // try to fetch small samples
        $markets = MongoBridge::getMarketsList();
        $comms = MongoBridge::getCommoditiesList();
        $prices = [];
        // try a direct low-level fetch via DataApiMongo if available
        if (class_exists(DataApiMongo::class)) {
            $dataApi = new DataApiMongo();
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

echo json_encode($res, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

