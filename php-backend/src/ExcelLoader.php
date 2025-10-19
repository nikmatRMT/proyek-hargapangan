<?php
namespace App;

use PhpOffice\PhpSpreadsheet\IOFactory;

class ExcelLoader
{
    public array $scanInfo = [];

    /**
     * Return absolute paths to Excel files to load.
     */
    public function listExcelFiles(): array
    {
        $files = [];
        $env = getenv('EXCEL_FILES');
        $baseData = realpath(__DIR__ . '/../../server/data');
        if ($env && trim($env) !== '') {
            $parts = preg_split('/[\n,]/', $env);
            foreach ($parts as $p) {
                $p = trim($p);
                if (!$p) continue;
                $path = $p;
                if (!preg_match('~^([a-zA-Z]:\\\\|/|\\\\)~', $p)) {
                    // relative -> resolve from server/data
                    $path = $baseData ? ($baseData . DIRECTORY_SEPARATOR . $p) : $p;
                }
                if (is_file($path)) $files[] = $path;
            }
        }
        if (!$files) {
            // default fallback to 4 files in server/data (2024)
            $candidates = [
                'pasar-bauntung-2024.xlsx',
                'pasar-jati-2024.xlsx',
                'pasar-ulin-raya-2024.xlsx',
                'pasar-pagi-loktabat-utara-2024.xlsx',
            ];
            foreach ($candidates as $fn) {
                $p = $baseData ? ($baseData . DIRECTORY_SEPARATOR . $fn) : $fn;
                if (is_file($p)) $files[] = $p;
            }
        }
        return $files;
    }

    /**
     * Load all Excel files and return canonical rows.
     */
    public function loadAll(): array
    {
        $this->scanInfo = [];
        $files = $this->listExcelFiles();
        $rows = [];
        $summary = [];
        foreach ($files as $file) {
            $market = Utils::marketNameFromFilename($file);
            $resA = $this->parseStructured($file, $market);
            $use = $resA['rows'] ? $resA : $this->parseSimple($file, $market);
            $rows = array_merge($rows, $use['rows']);
            $this->scanInfo = array_merge($this->scanInfo, $use['scans']);
            $summary[basename($file)] = count($use['rows']);
        }
        // sort by date asc and re-id handled by DataStore
        return $rows;
    }

    private function sheetToArray(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet): array
    {
        return $sheet->toArray(null, true, true, false);
    }

    public function parseStructured(string $file, string $defaultMarket): array
    {
        $outRows = [];
        $scans = [];
        try {
            $spreadsheet = IOFactory::load($file);
        } catch (\Throwable $e) {
            return ['rows' => [], 'scans' => [[
                'file' => basename($file), 'sheet' => '-', 'note' => 'open failed: ' . $e->getMessage()
            ]]];
        }
        $year = (int)Utils::parseYearFromFilename($file, '2024');

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $data = $this->sheetToArray($sheet);
            if (!$data || !is_array($data)) continue;

            $titleIdx = -1;
            foreach ($data as $i => $row) {
                $txt = mb_strtolower(Utils::rowText($row));
                if (preg_match('/pasar|harga/u', $txt)) { $titleIdx = $i; break; }
            }
            if ($titleIdx < 0) continue;

            $monthIdx = -1;
            $limit = min(count($data) - 1, $titleIdx + 20);
            for ($i = $titleIdx + 1; $i <= $limit; $i++) {
                $txt = mb_strtolower(Utils::rowText($data[$i]));
                if (str_contains($txt, 'pertanggal')) { $monthIdx = $i; break; }
            }
            if ($monthIdx < 0) {
                $scans[] = ['file' => basename($file), 'sheet' => $sheet->getTitle(), 'note' => 'month row not found'];
                continue;
            }

            $monthTxt = mb_strtolower(Utils::rowText($data[$monthIdx]));
            $month = null;
            if (preg_match('/(januari|februari|february|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/u', $monthTxt, $m)) {
                $month = Utils::$MONTH_MAP[$m[1]] ?? null;
            }
            if (!$month) {
                $scans[] = ['file' => basename($file), 'sheet' => $sheet->getTitle(), 'note' => 'month not detected'];
                continue;
            }

            $headerRow = $data[$monthIdx] ?? [];
            $unitRow = $data[$monthIdx + 1] ?? [];
            $commodityHeaders = array_values(array_map(fn($v) => trim((string)$v), array_slice($headerRow, 3)));
            $unitHeaders = array_values(array_map(fn($v) => trim((string)$v), array_slice($unitRow, 3)));

            for ($r = $monthIdx + 2; $r < count($data); $r++) {
                $row = $data[$r] ?? [];
                $day = Utils::toInt($row[2] ?? null);
                if (!$day || $day < 1 || $day > 31) break;
                $date = Utils::isoDate($year, $month, $day);

                for ($c = 0; $c < count($commodityHeaders); $c++) {
                    $commodity = $commodityHeaders[$c] ?? '';
                    if (!$commodity) continue;
                    $price = Utils::toInt($row[3 + $c] ?? null);
                    if (!$price) continue;
                    $unitText = mb_strtolower((string)($unitHeaders[$c] ?? ''));
                    $unit = str_contains($unitText, 'liter') ? 'liter' : (str_contains($unitText, 'kg') ? 'kg' : 'kg');
                    $outRows[] = [
                        'id' => 0,
                        'date' => $date,
                        'market_name' => $defaultMarket,
                        'commodity_name' => $commodity,
                        'unit' => $unit,
                        'price' => $price,
                        'user_name' => 'import',
                        'gps_lat' => null,
                        'gps_lng' => null,
                        'photo_url' => null,
                        'notes' => null,
                    ];
                }
            }
            $scans[] = [
                'file' => basename($file),
                'sheet' => $sheet->getTitle(),
                'parsed' => count($outRows),
                'mode' => 'structured',
                'month' => $month,
            ];
        }
        return ['rows' => $outRows, 'scans' => $scans];
    }

    public function parseSimple(string $file, string $defaultMarket): array
    {
        $outRows = [];
        $scans = [];
        try {
            $spreadsheet = IOFactory::load($file);
        } catch (\Throwable $e) {
            return ['rows' => [], 'scans' => [[
                'file' => basename($file), 'sheet' => '-', 'note' => 'open failed: ' . $e->getMessage()
            ]]];
        }
        $year = (int)Utils::parseYearFromFilename($file, '2024');

        foreach ($spreadsheet->getAllSheets() as $sheet) {
            $data = $this->sheetToArray($sheet);
            if (!$data || !is_array($data)) continue;

            $headerIdx = -1;
            $limit = min(count($data), 20);
            for ($i = 0; $i < $limit; $i++) {
                $txt = mb_strtolower(Utils::rowText($data[$i] ?? []));
                if (preg_match('/beras|gula|telur|cabe|cabai|minyak|ikan/u', $txt)) { $headerIdx = $i; break; }
            }
            if ($headerIdx < 0) continue;

            $headerRow = $data[$headerIdx] ?? [];
            $unitRow = $data[$headerIdx + 1] ?? [];
            $commodityHeaders = array_values(array_map(fn($v) => trim((string)$v), array_slice($headerRow, 3)));
            $unitHeaders = array_values(array_map(fn($v) => trim((string)$v), array_slice($unitRow, 3)));

            // guess month
            $month = 1;
            $check = min(count($data), 10);
            for ($i = 0; $i < $check; $i++) {
                $txt = mb_strtolower(Utils::rowText($data[$i] ?? []));
                if (preg_match('/(januari|februari|february|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/u', $txt, $m)) {
                    $month = Utils::$MONTH_MAP[$m[1]] ?? 1; break;
                }
            }

            for ($r = $headerIdx + 2; $r < count($data); $r++) {
                $row = $data[$r] ?? [];
                $day = Utils::toInt($row[2] ?? null);
                if (!$day || $day < 1 || $day > 31) break;
                $date = Utils::isoDate($year, $month, $day);
                for ($c = 0; $c < count($commodityHeaders); $c++) {
                    $commodity = $commodityHeaders[$c] ?? '';
                    if (!$commodity) continue;
                    $price = Utils::toInt($row[3 + $c] ?? null);
                    if (!$price) continue;
                    $unitText = mb_strtolower((string)($unitHeaders[$c] ?? ''));
                    $unit = str_contains($unitText, 'liter') ? 'liter' : (str_contains($unitText, 'kg') ? 'kg' : 'kg');
                    $outRows[] = [
                        'id' => 0,
                        'date' => $date,
                        'market_name' => $defaultMarket,
                        'commodity_name' => $commodity,
                        'unit' => $unit,
                        'price' => $price,
                        'user_name' => 'import',
                        'gps_lat' => null,
                        'gps_lng' => null,
                        'photo_url' => null,
                        'notes' => null,
                    ];
                }
            }
            $scans[] = [
                'file' => basename($file),
                'sheet' => $sheet->getTitle(),
                'parsed' => count($outRows),
                'mode' => 'simple',
                'month' => $month,
            ];
        }
        return ['rows' => $outRows, 'scans' => $scans];
    }
}
