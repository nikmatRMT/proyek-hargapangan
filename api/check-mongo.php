<?php
declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';

use App\MongoBridge;

header('Content-Type: application/json');

$out = ['mongodb_extension_loaded' => extension_loaded('mongodb')];
try {
    $available = MongoBridge::isAvailable();
    $out['mongo_bridge_is_available'] = $available;
    if ($available) {
        $client = (new ReflectionClass(MongoBridge::class))->getMethod('client');
        // just attempt to list databases
        $db = MongoBridge::db();
        $out['db_name'] = getenv('MONGODB_DB') ?: 'harga_pasar_mongo';
        $out['ok'] = true;
    }
} catch (Throwable $e) {
    $out['ok'] = false;
    $out['error'] = $e->getMessage();
}

echo json_encode($out);
