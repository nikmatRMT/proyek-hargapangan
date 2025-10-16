'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ExcelJS from 'exceljs'
import { FileSpreadsheet } from 'lucide-react'

// Data structure based on the provided document
interface MarketPriceData {
  week: string
  day: number
  beras: number
  minyakGorengKemasan: number
  minyakGorengCurah: number
  tepungTeriguKemasan: number
  tepungTeriguCurah: number
  gulaPasir: number
  telurAyam: number
  dagingSapi: number
  dagingAyam: number
  kedelai: number
  bawangMerah: number
  bawangPutih: number
  cabeMerahBesar: number
  cabeRawit: number
  ikanHaruan: number
  ikanTongkol: number
  ikanMas: number
  ikanPatin: number
  ikanPapuyu: number
  ikanBandeng: number
  ikanKembung: number
}

const marketPriceData: MarketPriceData[] = [
  { week: 'I', day: 1, beras: 16400, minyakGorengKemasan: 20000, minyakGorengCurah: 16500, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17500, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 34300, kedelai: 10200, bawangMerah: 66700, bawangPutih: 40000, cabeMerahBesar: 60000, cabeRawit: 65000, ikanHaruan: 55000, ikanTongkol: 42000, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 65300, ikanBandeng: 26000, ikanKembung: 50000 },
  { week: '', day: 2, beras: 16400, minyakGorengKemasan: 20000, minyakGorengCurah: 16500, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17700, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35000, kedelai: 10200, bawangMerah: 65000, bawangPutih: 36000, cabeMerahBesar: 55000, cabeRawit: 70000, ikanHaruan: 55000, ikanTongkol: 42000, ikanMas: 37300, ikanPatin: 43000, ikanPapuyu: 68300, ikanBandeng: 28000, ikanKembung: 48000 },
  { week: 'II', day: 3, beras: 16400, minyakGorengKemasan: 20000, minyakGorengCurah: 10500, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17600, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10200, bawangMerah: 65000, bawangPutih: 36000, cabeMerahBesar: 52300, cabeRawit: 65000, ikanHaruan: 63700, ikanTongkol: 45000, ikanMas: 36700, ikanPatin: 42300, ikanPapuyu: 70000, ikanBandeng: 26700, ikanKembung: 44700 },
  { week: '', day: 4, beras: 16400, minyakGorengKemasan: 20000, minyakGorengCurah: 16500, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17500, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10200, bawangMerah: 66700, bawangPutih: 35300, cabeMerahBesar: 50000, cabeRawit: 65000, ikanHaruan: 65000, ikanTongkol: 42300, ikanMas: 37300, ikanPatin: 42300, ikanPapuyu: 68300, ikanBandeng: 27500, ikanKembung: 42300 },
  { week: '', day: 5, beras: 16300, minyakGorengKemasan: 20000, minyakGorengCurah: 16700, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17600, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 34700, kedelai: 10200, bawangMerah: 65000, bawangPutih: 35300, cabeMerahBesar: 51700, cabeRawit: 62000, ikanHaruan: 65000, ikanTongkol: 40000, ikanMas: 38000, ikanPatin: 40300, ikanPapuyu: 67500, ikanBandeng: 26700, ikanKembung: 43000 },
  { week: '', day: 6, beras: 16200, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17600, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 34500, kedelai: 10200, bawangMerah: 60000, bawangPutih: 37000, cabeMerahBesar: 57300, cabeRawit: 65000, ikanHaruan: 68300, ikanTongkol: 37700, ikanMas: 38000, ikanPatin: 42000, ikanPapuyu: 65000, ikanBandeng: 28000, ikanKembung: 50000 },
  { week: '', day: 7, beras: 16250, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17500, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36700, kedelai: 10200, bawangMerah: 63700, bawangPutih: 37000, cabeMerahBesar: 63000, cabeRawit: 67500, ikanHaruan: 60000, ikanTongkol: 38000, ikanMas: 37300, ikanPatin: 43000, ikanPapuyu: 65000, ikanBandeng: 30000, ikanKembung: 47300 },
  { week: '', day: 8, beras: 16250, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17600, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10200, bawangMerah: 60000, bawangPutih: 35000, cabeMerahBesar: 60000, cabeRawit: 70000, ikanHaruan: 65000, ikanTongkol: 40000, ikanMas: 37300, ikanPatin: 40000, ikanPapuyu: 60000, ikanBandeng: 28000, ikanKembung: 48500 },
  { week: '', day: 9, beras: 16270, minyakGorengKemasan: 20000, minyakGorengCurah: 16700, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17500, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10200, bawangMerah: 60000, bawangPutih: 35000, cabeMerahBesar: 61500, cabeRawit: 70000, ikanHaruan: 57300, ikanTongkol: 43300, ikanMas: 38500, ikanPatin: 42000, ikanPapuyu: 65000, ikanBandeng: 28000, ikanKembung: 45700 },
  { week: 'III', day: 10, beras: 16300, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17500, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35300, kedelai: 10200, bawangMerah: 65000, bawangPutih: 35000, cabeMerahBesar: 60000, cabeRawit: 68300, ikanHaruan: 54300, ikanTongkol: 45000, ikanMas: 38000, ikanPatin: 43000, ikanPapuyu: 70000, ikanBandeng: 27300, ikanKembung: 47700 },
  { week: '', day: 11, beras: 16300, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17500, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 34300, kedelai: 10200, bawangMerah: 65000, bawangPutih: 35000, cabeMerahBesar: 57000, cabeRawit: 65000, ikanHaruan: 60000, ikanTongkol: 42000, ikanMas: 40000, ikanPatin: 42300, ikanPapuyu: 68300, ikanBandeng: 29000, ikanKembung: 50000 },
  { week: '', day: 12, beras: 16300, minyakGorengKemasan: 20300, minyakGorengCurah: 16700, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35000, kedelai: 10200, bawangMerah: 65000, bawangPutih: 37000, cabeMerahBesar: 60000, cabeRawit: 65000, ikanHaruan: 62700, ikanTongkol: 40000, ikanMas: 38300, ikanPatin: 42300, ikanPapuyu: 65000, ikanBandeng: 29000, ikanKembung: 47300 },
  { week: '', day: 13, beras: 26200, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17100, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10100, bawangMerah: 65000, bawangPutih: 35700, cabeMerahBesar: 60000, cabeRawit: 63500, ikanHaruan: 55000, ikanTongkol: 42000, ikanMas: 38500, ikanPatin: 43000, ikanPapuyu: 60000, ikanBandeng: 30000, ikanKembung: 50000 },
  { week: '', day: 14, beras: 16200, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36300, kedelai: 10100, bawangMerah: 60000, bawangPutih: 35000, cabeMerahBesar: 60000, cabeRawit: 70000, ikanHaruan: 60000, ikanTongkol: 43000, ikanMas: 37700, ikanPatin: 40000, ikanPapuyu: 68000, ikanBandeng: 26700, ikanKembung: 48000 },
  { week: '', day: 15, beras: 16200, minyakGorengKemasan: 20000, minyakGorengCurah: 16700, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17000, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36000, kedelai: 10100, bawangMerah: 60000, bawangPutih: 36000, cabeMerahBesar: 60000, cabeRawit: 72000, ikanHaruan: 58000, ikanTongkol: 42300, ikanMas: 38000, ikanPatin: 41300, ikanPapuyu: 65000, ikanBandeng: 27000, ikanKembung: 50000 },
  { week: '', day: 16, beras: 16400, minyakGorengKemasan: 20000, minyakGorengCurah: 16700, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17200, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 37300, kedelai: 10100, bawangMerah: 65000, bawangPutih: 35000, cabeMerahBesar: 55000, cabeRawit: 55000, ikanHaruan: 53000, ikanTongkol: 39000, ikanMas: 38000, ikanPatin: 43000, ikanPapuyu: 65000, ikanBandeng: 28000, ikanKembung: 48300 },
  { week: 'IV', day: 17, beras: 16400, minyakGorengKemasan: 19700, minyakGorengCurah: 16800, tepungTeriguKemasan: 13900, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36000, kedelai: 10200, bawangMerah: 57500, bawangPutih: 35300, cabeMerahBesar: 57000, cabeRawit: 55000, ikanHaruan: 58300, ikanTongkol: 45000, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 65000, ikanBandeng: 27000, ikanKembung: 47300 },
  { week: '', day: 18, beras: 16400, minyakGorengKemasan: 19700, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17500, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10200, bawangMerah: 60000, bawangPutih: 36000, cabeMerahBesar: 57000, cabeRawit: 55000, ikanHaruan: 60000, ikanTongkol: 43000, ikanMas: 37000, ikanPatin: 42300, ikanPapuyu: 67300, ikanBandeng: 29000, ikanKembung: 50000 },
  { week: '', day: 19, beras: 16400, minyakGorengKemasan: 19800, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17500, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10200, bawangMerah: 60000, bawangPutih: 36000, cabeMerahBesar: 56000, cabeRawit: 54000, ikanHaruan: 60000, ikanTongkol: 45000, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 68000, ikanBandeng: 28000, ikanKembung: 47300 },
  { week: '', day: 20, beras: 16400, minyakGorengKemasan: 19800, minyakGorengCurah: 16900, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 34700, kedelai: 10200, bawangMerah: 53300, bawangPutih: 35500, cabeMerahBesar: 52000, cabeRawit: 55000, ikanHaruan: 55300, ikanTongkol: 43700, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 58700, ikanBandeng: 28000, ikanKembung: 48000 },
  { week: '', day: 21, beras: 10400, minyakGorengKemasan: 19500, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10100, bawangMerah: 52000, bawangPutih: 34700, cabeMerahBesar: 52000, cabeRawit: 53000, ikanHaruan: 53700, ikanTongkol: 42000, ikanMas: 37000, ikanPatin: 42300, ikanPapuyu: 65000, ikanBandeng: 29000, ikanKembung: 50000 },
  { week: '', day: 22, beras: 16400, minyakGorengKemasan: 19800, minyakGorengCurah: 16800, tepungTeriguKemasan: 13009, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36300, kedelai: 10050, bawangMerah: 50000, bawangPutih: 34300, cabeMerahBesar: 57000, cabeRawit: 52000, ikanHaruan: 50000, ikanTongkol: 41700, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 60000, ikanBandeng: 30000, ikanKembung: 48300 },
  { week: '', day: 23, beras: 16400, minyakGorengKemasan: 19800, minyakGorengCurah: 16900, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10200, bawangMerah: 50000, bawangPutih: 36000, cabeMerahBesar: 56700, cabeRawit: 55000, ikanHaruan: 53700, ikanTongkol: 43000, ikanMas: 38000, ikanPatin: 43000, ikanPapuyu: 63700, ikanBandeng: 25700, ikanKembung: 45300 },
  { week: 'V', day: 24, beras: 16400, minyakGorengKemasan: 19800, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10100, bawangMerah: 47700, bawangPutih: 35300, cabeMerahBesar: 56700, cabeRawit: 57000, ikanHaruan: 55000, ikanTongkol: 40000, ikanMas: 38000, ikanPatin: 40700, ikanPapuyu: 68000, ikanBandeng: 26300, ikanKembung: 45000 },
  { week: '', day: 25, beras: 16300, minyakGorengKemasan: 19800, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17250, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36700, kedelai: 10100, bawangMerah: 46700, bawangPutih: 36300, cabeMerahBesar: 56700, cabeRawit: 55000, ikanHaruan: 56300, ikanTongkol: 37300, ikanMas: 38000, ikanPatin: 42400, ikanPapuyu: 60000, ikanBandeng: 27300, ikanKembung: 48300 },
  { week: '', day: 26, beras: 16300, minyakGorengKemasan: 19800, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17250, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36700, kedelai: 10100, bawangMerah: 46600, bawangPutih: 36300, cabeMerahBesar: 57000, cabeRawit: 55000, ikanHaruan: 58300, ikanTongkol: 39000, ikanMas: 38000, ikanPatin: 42000, ikanPapuyu: 67000, ikanBandeng: 28000, ikanKembung: 50000 },
  { week: '', day: 27, beras: 16500, minyakGorengKemasan: 19800, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36700, kedelai: 10100, bawangMerah: 46300, bawangPutih: 36300, cabeMerahBesar: 58300, cabeRawit: 55000, ikanHaruan: 60000, ikanTongkol: 40000, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 66300, ikanBandeng: 29000, ikanKembung: 47000 },
  { week: '', day: 28, beras: 16500, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17250, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10100, bawangMerah: 46300, bawangPutih: 36300, cabeMerahBesar: 60000, cabeRawit: 55000, ikanHaruan: 57300, ikanTongkol: 42300, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 63700, ikanBandeng: 28000, ikanKembung: 46700 },
  { week: '', day: 29, beras: 16500, minyakGorengKemasan: 19800, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17250, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 35700, kedelai: 10100, bawangMerah: 45300, bawangPutih: 35300, cabeMerahBesar: 56700, cabeRawit: 50000, ikanHaruan: 54700, ikanTongkol: 39300, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 63300, ikanBandeng: 28000, ikanKembung: 50000 },
  { week: '', day: 30, beras: 16500, minyakGorengKemasan: 20000, minyakGorengCurah: 16800, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 37000, kedelai: 10100, bawangMerah: 43000, bawangPutih: 35300, cabeMerahBesar: 58300, cabeRawit: 53300, ikanHaruan: 56700, ikanTongkol: 45000, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 60000, ikanBandeng: 27300, ikanKembung: 47300 },
  { week: 'VI', day: 31, beras: 16500, minyakGorengKemasan: 20000, minyakGorengCurah: 17000, tepungTeriguKemasan: 13000, tepungTeriguCurah: 9000, gulaPasir: 17300, telurAyam: 29000, dagingSapi: 160000, dagingAyam: 36700, kedelai: 10100, bawangMerah: 43700, bawangPutih: 35300, cabeMerahBesar: 56700, cabeRawit: 52000, ikanHaruan: 50000, ikanTongkol: 40000, ikanMas: 38000, ikanPatin: 42300, ikanPapuyu: 63300, ikanBandeng: 28000, ikanKembung: 50000 }
]

// Calculate averages - using only rows with week labels
const calculateAverages = () => {
  const averages: Record<string, number> = {}
  // Filter data to only include rows with week labels
  const filteredData = marketPriceData.filter(item => item.week !== '')
  const keys = Object.keys(filteredData[0]).filter(key => key !== 'week' && key !== 'day') as (keyof MarketPriceData)[]
  
  keys.forEach(key => {
    const sum = filteredData.reduce((acc, item) => acc + item[key], 0)
    averages[key] = Math.round(sum / filteredData.length)
  })
  
  return averages
}

const exportToExcel = async () => {
  // Create workbook
  const workbook = new ExcelJS.Workbook()
  
  // Create worksheet
  const worksheet = workbook.addWorksheet('Sheet1')
  
  // Set column widths to 8.38 for all columns
  for (let i = 1; i <= 21; i++) {
    worksheet.getColumn(i).width = 8.38
  }
  
  // Add title row (Baris 1) - Merge A1:W1
  worksheet.addRow([])
  const titleRow = worksheet.getRow(1)
  titleRow.height = 25
  titleRow.getCell(1).value = 'Harga Pasar Bahan Pangan Tingkat Produsen di Pasar Bauntung Kota Banjarbaru Tahun 2024'
  titleRow.getCell(1).font = { 
    bold: true, 
    size: 14, 
    name: 'Arial' 
  }
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.mergeCells(1, 1, 1, 21) // A1:W1
  
  // Add empty row with asterisks (Baris 2)
  worksheet.addRow(Array(21).fill('*'))
  
  // Add header row (Baris 3) - remove column C, shift A and B to the right
  const headerData = [
    'Juli Pertanggal', '*', 'Beras', 'Minyak Goreng Kemasan', 'Minyak Goreng Curah', 
    'Tepung Terigu Kemasan', 'Tepung Terigu Curah', 'Gula Pasir', 'Telur Ayam', 'Daging Sapi', 
    'Daging Ayam', 'Kedelai', 'Bawang Merah', 'Bawang Putih', 'Cabe Merah Besar', 'Cabe Rawit', 
    'Ikan Haruan/ Gabus', 'Ikan Tongkol/Tuna', 'Ikan Mas/Nila', 'Ikan Patin', 'Ikan Papuyu/Betok', 
    'Ikan Bandeng', 'Ikan Kembung/Pindang'
  ]
  const headerRow = worksheet.addRow(headerData)
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { 
      bold: true, 
      name: 'Arial' 
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })
  
  // Add units row (Baris 4) - remove column C, shift A and B to the right
  const units = [
    '*', '(Rp/Kg)', '(Rp/Liter)', '(Rp/Liter)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)', '(Rp/Kg)'
  ]
  const unitsRow = worksheet.addRow(units)
  unitsRow.eachCell((cell, colNumber) => {
    cell.font = { 
      size: 10, 
      name: 'Arial' 
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })
  
  // Merge A3:B3 and A4:B4 with center alignment
  worksheet.mergeCells(3, 1, 3, 2) // A3:B3
  worksheet.mergeCells(4, 1, 4, 2) // A4:B4
  
  // Set merged cell values and alignment
  const headerRow = worksheet.getRow(3)
  headerRow.getCell(1).value = 'Juli Pertanggal'
  headerRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  
  const unitsRowMerged = worksheet.getRow(4)
  unitsRowMerged.getCell(1).value = '*'
  unitsRowMerged.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
  
  // Add data rows - Starting from Baris 5, remove column C, shift A and B to the right
  marketPriceData.forEach((item, index) => {
    const rowData = [
      item.week || '*',
      item.day,
      item.beras,
      item.minyakGorengKemasan,
      item.minyakGorengCurah,
      item.tepungTeriguKemasan,
      item.tepungTeriguCurah,
      item.gulaPasir,
      item.telurAyam,
      item.dagingSapi,
      item.dagingAyam,
      item.kedelai,
      item.bawangMerah,
      item.bawangPutih,
      item.cabeMerahBesar,
      item.cabeRawit,
      item.ikanHaruan,
      item.ikanTongkol,
      item.ikanMas,
      item.ikanPatin,
      item.ikanPapuyu,
      item.ikanBandeng,
      item.ikanKembung
    ]
    
    const dataRow = worksheet.addRow(rowData)
    dataRow.eachCell((cell, colNumber) => {
      cell.font = { 
        name: 'Arial' 
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      
      // Make week labels bold
      if (colNumber === 1 && cell.value && cell.value !== '') {
        cell.font = { 
          bold: true, 
          name: 'Arial' 
        }
      }
    })
  })
  
  // Add average row - remove column C, shift A and B to the right
  const averages = calculateAverages()
  const averageRow = worksheet.addRow([
    'Rata-Rata',
    '*',
    averages.beras,
    averages.minyakGorengKemasan,
    averages.minyakGorengCurah,
    averages.tepungTeriguKemasan,
    averages.tepungTeriguCurah,
    averages.gulaPasir,
    averages.telurAyam,
    averages.dagingSapi,
    averages.dagingAyam,
    averages.kedelai,
    averages.bawangMerah,
    averages.bawangPutih,
    averages.cabeMerahBesar,
    averages.cabeRawit,
    averages.ikanHaruan,
    averages.ikanTongkol,
    averages.ikanMas,
    averages.ikanPatin,
    averages.ikanPapuyu,
    averages.ikanBandeng,
    averages.ikanKembung
  ])
  
  averageRow.eachCell((cell, colNumber) => {
    cell.font = { 
      bold: true, 
      name: 'Arial' 
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'medium' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    }
  })
  
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer()
  
  // Create blob and download
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pasar-bauntung-2024.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function Home() {
  const averages = calculateAverages()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              Harga Pasar Bahan Pangan Tingkat Produsen
            </CardTitle>
            <CardDescription className="text-lg">
              di Pasar Bauntung Kota Banjarbaru Tahun 2024
            </CardDescription>
          </div>
          <Button onClick={() => exportToExcel()} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                  <TableHead className="w-[50px] border-r border-gray-300">Minggu</TableHead>
                  <TableHead className="w-[100px] border-r border-gray-300">Tanggal</TableHead>
                  <TableHead className="w-[50px] border-r border-gray-300"></TableHead>
                  <TableHead className="border-r border-gray-300">Beras</TableHead>
                  <TableHead className="border-r border-gray-300">Minyak Goreng Kemasan</TableHead>
                  <TableHead className="border-r border-gray-300">Minyak Goreng Curah</TableHead>
                  <TableHead className="border-r border-gray-300">Tepung Terigu Kemasan</TableHead>
                  <TableHead className="border-r border-gray-300">Tepung Terigu Curah</TableHead>
                  <TableHead className="border-r border-gray-300">Gula Pasir</TableHead>
                  <TableHead className="border-r border-gray-300">Telur Ayam</TableHead>
                  <TableHead className="border-r border-gray-300">Daging Sapi</TableHead>
                  <TableHead className="border-r border-gray-300">Daging Ayam</TableHead>
                  <TableHead className="border-r border-gray-300">Kedelai</TableHead>
                  <TableHead className="border-r border-gray-300">Bawang Merah</TableHead>
                  <TableHead className="border-r border-gray-300">Bawang Putih</TableHead>
                  <TableHead className="border-r border-gray-300">Cabe Merah Besar</TableHead>
                  <TableHead className="border-r border-gray-300">Cabe Rawit</TableHead>
                  <TableHead className="border-r border-gray-300">Ikan Haruan/ Gabus</TableHead>
                  <TableHead className="border-r border-gray-300">Ikan Tongkol/Tuna</TableHead>
                  <TableHead className="border-r border-gray-300">Ikan Mas/Nila</TableHead>
                  <TableHead className="border-r border-gray-300">Ikan Patin</TableHead>
                  <TableHead className="border-r border-gray-300">Ikan Papuyu/Betok</TableHead>
                  <TableHead className="border-r border-gray-300">Ikan Bandeng</TableHead>
                  <TableHead className="border-r border-gray-300">Ikan Kembung/Pindang</TableHead>
                </TableRow>
                <TableRow className="bg-gray-50 border-b border-gray-300">
                  <TableHead className="border-r border-gray-300"></TableHead>
                  <TableHead className="border-r border-gray-300">Juli 2024</TableHead>
                  <TableHead className="border-r border-gray-300"></TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Liter)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Liter)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                  <TableHead className="text-xs text-muted-foreground border-r border-gray-300">(Rp/Kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketPriceData.map((item, index) => (
                  <TableRow key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <TableCell className="font-medium border-r border-gray-200">{item.week}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.day}</TableCell>
                    <TableCell className="border-r border-gray-200"></TableCell>
                    <TableCell className="border-r border-gray-200">{item.beras.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.minyakGorengKemasan.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.minyakGorengCurah.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.tepungTeriguKemasan.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.tepungTeriguCurah.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.gulaPasir.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.telurAyam.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.dagingSapi.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.dagingAyam.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.kedelai.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.bawangMerah.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.bawangPutih.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.cabeMerahBesar.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.cabeRawit.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.ikanHaruan.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.ikanTongkol.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.ikanMas.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.ikanPatin.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.ikanPapuyu.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.ikanBandeng.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="border-r border-gray-200">{item.ikanKembung.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-gray-400 bg-blue-50">
                  <TableCell className="font-bold border-r border-gray-400">Rata-Rata</TableCell>
                  <TableCell className="border-r border-gray-400"></TableCell>
                  <TableCell className="border-r border-gray-400"></TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.beras.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.minyakGorengKemasan.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.minyakGorengCurah.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.tepungTeriguKemasan.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.tepungTeriguCurah.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.gulaPasir.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.telurAyam.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.dagingSapi.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.dagingAyam.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.kedelai.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.bawangMerah.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.bawangPutih.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.cabeMerahBesar.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.cabeRawit.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.ikanHaruan.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.ikanTongkol.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.ikanMas.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.ikanPatin.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.ikanPapuyu.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.ikanBandeng.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold border-r border-gray-400">{averages.ikanKembung.toLocaleString('id-ID')}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}