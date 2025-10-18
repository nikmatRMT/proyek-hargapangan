<?php
namespace App;

class DataApiMongo
{
    private string $base;
    private string $apiKey;
    private string $db;
    private string $dataSource;

    public function __construct()
    {
        $this->base = rtrim((string)getenv('MONGODB_DATA_API_URL') ?: '', '/');
        $this->apiKey = (string)getenv('MONGODB_DATA_API_KEY') ?: '';
        $this->db = (string)getenv('MONGODB_DB') ?: 'harga_pasar_mongo';
        $this->dataSource = (string)getenv('MONGODB_DATA_SOURCE') ?: (getenv('MONGODB_DATA_SOURCE') ?: 'proyek-hargapangan');
    }

    private function request(string $action, array $body): array
    {
        if (!$this->base || !$this->apiKey) {
            throw new \RuntimeException('Data API not configured (MONGODB_DATA_API_URL / MONGODB_DATA_API_KEY)');
        }
        $url = $this->base . '/action/' . $action;
        $payload = array_merge([
            'dataSource' => $this->dataSource,
            'database' => $this->db,
        ], $body);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'api-key: ' . $this->apiKey,
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        $resp = curl_exec($ch);
        if ($resp === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException('CURL error: ' . $err);
        }
        curl_close($ch);
        $json = json_decode($resp, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('Invalid JSON from Data API: ' . $resp);
        }
        return $json;
    }

    private function normalizeDoc(array $doc): array
    {
        // Convert any {$oid: '...'} or nested forms into simple string ids
        array_walk_recursive($doc, function (&$v, $k) {
            if (is_array($v) && isset($v['$oid'])) {
                $v = (string)$v['$oid'];
            }
            if (is_array($v) && isset($v['$date'])) {
                // keep as-is; Data API date formats vary
                if (is_array($v['$date']) && isset($v['$date']['$numberLong'])) {
                    $v = (int)$v['$date']['$numberLong'];
                }
            }
        });
        return $doc;
    }

    public function find(string $collection, array $filter = [], array $projection = [], int $limit = 1000, array $sort = []): array
    {
        $body = ['collection' => $collection, 'filter' => $filter, 'projection' => ($projection ?: new \stdClass()), 'limit' => $limit, 'sort' => ($sort ?: new \stdClass())];
        $res = $this->request('find', $body);
        $docs = $res['documents'] ?? [];
        $out = [];
        foreach ($docs as $d) {
            if (is_array($d)) $out[] = $this->normalizeDoc($d);
        }
        return $out;
    }

    public function findOne(string $collection, array $filter = []): ?array
    {
        $body = ['collection' => $collection, 'filter' => $filter];
        $res = $this->request('findOne', $body);
        $d = $res['document'] ?? null;
        if (!$d) return null;
        return $this->normalizeDoc($d);
    }

    public function updateOne(string $collection, array $filter, array $update, bool $upsert = false): array
    {
        $body = ['collection' => $collection, 'filter' => $filter, 'update' => $update, 'upsert' => $upsert];
        return $this->request('updateOne', $body);
    }

    public function insertOne(string $collection, array $doc): array
    {
        $body = ['collection' => $collection, 'document' => $doc];
        return $this->request('insertOne', $body);
    }
}
