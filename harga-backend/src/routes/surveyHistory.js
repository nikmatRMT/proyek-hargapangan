import express from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { collections, getDb } from '../tools/db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

/**
 * Helper: Build aggregation pipeline
 * @param {Object} filter - query filter
 * @param {boolean} countOnly - if true, returns count of groups
 * @param {Object} sort - sort object
 * @param {number} skip
 * @param {number} limit
 */
function buildPipeline(filter, countOnly = false, sort = null, skip = 0, limit = 0) {
    const pipeline = [
        { $match: filter },
        {
            $group: {
                _id: {
                    market_id: '$market_id',
                    user_id: '$user_id',
                    tanggal_lapor: '$tanggal_lapor'
                },
                totalItems: { $sum: 1 },
                lastInputAt: { $max: '$created_at' },
                updatedAt: { $max: '$updated_at' }
            }
        }
    ];

    if (countOnly) {
        pipeline.push({ $count: 'total' });
        return pipeline;
    }

    // Lookup data related (Pasar & User)
    pipeline.push(
        {
            $lookup: {
                from: 'pasar',
                localField: '_id.market_id',
                foreignField: 'id',
                as: 'market'
            }
        },
        {
            $unwind: { path: '$market', preserveNullAndEmptyArrays: true }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id.user_id',
                foreignField: 'id',
                as: 'user'
            }
        },
        {
            $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
        },
        {
            $project: {
                _id: 0,
                key: {
                    $concat: [
                        { $toString: '$_id.market_id' }, '-',
                        { $toString: '$_id.user_id' }, '-',
                        '$_id.tanggal_lapor'
                    ]
                },
                market_id: '$_id.market_id',
                user_id: '$_id.user_id',
                tanggal_lapor: '$_id.tanggal_lapor',
                market_name: { $ifNull: ['$market.nama_pasar', 'Pasar Tidak Dikenal'] },
                user_name: { $ifNull: ['$user.nama_lengkap', 'User Tidak Dikenal'] },
                totalItems: 1,
                lastInputAt: 1,
                updatedAt: 1
            }
        }
    );

    if (sort) {
        pipeline.push({ $sort: sort });
    } else {
        // Default sort: tanggal_lapor desc, lastInputAt desc
        pipeline.push({ $sort: { tanggal_lapor: -1, lastInputAt: -1 } });
    }

    if (limit > 0) {
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });
    }

    return pipeline;
}

// ==========================================
// GET /api/survey-history
// ==========================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const { from, to, userId, page = 1, pageSize = 20, sort } = req.query;

        // Build Filter
        const filter = {};
        if (from || to) {
            filter.tanggal_lapor = {};
            if (from) filter.tanggal_lapor.$gte = from;
            if (to) filter.tanggal_lapor.$lte = to;
        }
        if (userId && userId !== 'all') {
            filter.user_id = Number(userId);
        }
        // Filter hanya yang punya user_id (data dari mobile/petugas)
        // Jika data dari admin web lama (user_id null), opsional mau ditampilkan atau tidak.
        // Asumsi: Kita tampilkan semua, tapi user_id null akan jadi "User Tidak Dikenal" atau "System"
        // filter.user_id = { $ne: null }; 

        const limit = Math.max(1, Number(pageSize));
        const skip = (Math.max(1, Number(page)) - 1) * limit;

        const { laporan_harga } = collections();

        // 1. Hitung Total Group (untuk pagination)
        // Agregasi count group cukup berat, tapi necessary
        const countPipeline = buildPipeline(filter, true);
        const countRes = await laporan_harga.aggregate(countPipeline).toArray();
        const total = countRes[0]?.total || 0;

        // 2. Ambil Data
        let sortObj = null;
        if (sort === 'date_asc') sortObj = { tanggal_lapor: 1 };
        else if (sort === 'date_desc') sortObj = { tanggal_lapor: -1 };

        // Data pipeline
        const pipeline = buildPipeline(filter, false, sortObj, skip, limit);
        const rows = await laporan_harga.aggregate(pipeline).toArray();

        res.json({
            ok: true,
            data: {
                rows,
                total,
                page: Number(page),
                pageSize: limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('[GET /api/survey-history] Error:', error);
        res.status(500).json({ ok: false, message: error.message });
    }
});

// ==========================================
// GET /api/survey-history/export/pdf
// ==========================================
router.get('/export/pdf', requireAuth, async (req, res) => {
    try {
        const { from, to, userId } = req.query;

        // Filter (sama dengan atas)
        const filter = {};
        if (from || to) {
            filter.tanggal_lapor = {};
            if (from) filter.tanggal_lapor.$gte = from;
            if (to) filter.tanggal_lapor.$lte = to;
        }
        if (userId && userId !== 'all') {
            filter.user_id = Number(userId);
        }

        const { laporan_harga } = collections();
        // Ambil SEMUA data (tanpa limit)
        const pipeline = buildPipeline(filter, false, { tanggal_lapor: -1, lastInputAt: -1 });
        const rows = await laporan_harga.aggregate(pipeline).toArray();

        // -- Generate PDF --
        const doc = new PDFDocument({ size: 'A4', margin: 30 });
        const filename = `Riwayat_Survey_${Date.now()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text('Laporan Riwayat Survey Petugas', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Periode: ${from || '-'} s/d ${to || '-'}`, { align: 'center' });
        doc.moveDown(1.5);

        // Table Header
        const startX = 30;
        let currentY = doc.y;
        const colWidths = [30, 80, 120, 120, 80, 100]; // No, Tgl, Petugas, Pasar, Jml Komd, Waktu
        const headers = ['No', 'Tanggal', 'Nama Petugas', 'Nama Pasar', 'Jml Item', 'Waktu Input'];

        // Fungsi gambar baris tabel
        const drawRow = (y, cols, isHeader = false) => {
            let x = startX;
            doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);

            cols.forEach((text, i) => {
                const w = colWidths[i];
                // Background header
                if (isHeader) {
                    doc.rect(x, y, w, 20).fillAndStroke('#eeeeee', '#aaaaaa');
                    doc.fillColor('black').text(text, x + 5, y + 6, { width: w - 10, align: 'left' });
                } else {
                    doc.rect(x, y, w, 20).stroke('#aaaaaa');
                    doc.text(text, x + 5, y + 6, { width: w - 10, align: 'left', lineBreak: false, ellipsis: true });
                }
                x += w;
            });
        };

        drawRow(currentY, headers, true);
        currentY += 20;

        // Rows
        rows.forEach((row, index) => {
            if (currentY > 750) { // Page break
                doc.addPage();
                currentY = 30;
                drawRow(currentY, headers, true);
                currentY += 20;
            }

            const dateStr = row.tanggal_lapor;
            const timeStr = row.lastInputAt ? new Date(row.lastInputAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

            drawRow(currentY, [
                String(index + 1),
                dateStr,
                row.user_name,
                row.market_name,
                String(row.totalItems),
                timeStr
            ]);
            currentY += 20;
        });

        // Summary Footer
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text(`Total Survey: ${rows.length}`, { align: 'right' });

        doc.end();

    } catch (error) {
        console.error('[GET /api/survey-history/export/pdf] Error:', error);
        if (!res.headersSent) res.status(500).json({ ok: false, message: error.message });
    }
});

// ==========================================
// GET /api/survey-history/export/excel
// ==========================================
router.get('/export/excel', requireAuth, async (req, res) => {
    try {
        const { from, to, userId } = req.query;

        const filter = {};
        if (from || to) {
            filter.tanggal_lapor = {};
            if (from) filter.tanggal_lapor.$gte = from;
            if (to) filter.tanggal_lapor.$lte = to;
        }
        if (userId && userId !== 'all') {
            filter.user_id = Number(userId);
        }

        const { laporan_harga } = collections();
        const pipeline = buildPipeline(filter, false, { tanggal_lapor: -1, lastInputAt: -1 });
        const rows = await laporan_harga.aggregate(pipeline).toArray();

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Riwayat Survey');

        sheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Tanggal Lapor', key: 'tanggal', width: 15 },
            { header: 'Nama Petugas', key: 'petugas', width: 30 },
            { header: 'Nama Pasar', key: 'pasar', width: 30 },
            { header: 'Jumlah Komoditas', key: 'total', width: 20 },
            { header: 'Waktu Input Terakhir', key: 'waktu', width: 25 },
        ];

        // Style Header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEEEEEE' }
        };

        rows.forEach((row, index) => {
            const timeStr = row.lastInputAt
                ? new Date(row.lastInputAt).toLocaleString('id-ID')
                : '-';

            const r = sheet.addRow({
                no: index + 1,
                tanggal: row.tanggal_lapor,
                petugas: row.user_name,
                pasar: row.market_name,
                total: row.totalItems,
                waktu: timeStr
            });

            // Styling per cell
            r.eachCell((cell, colNumber) => {
                // Border semua sisi
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // Alignment
                if (colNumber === 1 || colNumber === 5) { // No & Jml Item -> Center
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });
        });

        // Styling Header juga dikasih border
        sheet.getRow(1).eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="Riwayat_Survey_${Date.now()}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('[GET /api/survey-history/export/excel] Error:', error);
        if (!res.headersSent) res.status(500).json({ ok: false, message: error.message });
    }
});

// ==========================================
// GET /api/survey-history/activity-summary/:userId
// Returns activity summary for a user (stats, calendar, recent)
// ==========================================
router.get('/activity-summary/:userId', requireAuth, async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        if (!userId) {
            return res.status(400).json({ ok: false, message: 'Invalid userId' });
        }

        const { months = 3 } = req.query; // Default 3 bulan terakhir
        const monthsBack = Math.min(12, Math.max(1, Number(months)));

        // Calculate date range
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth() - monthsBack + 1, 1);
        const startDateStr = startDate.toISOString().slice(0, 10);
        const todayStr = today.toISOString().slice(0, 10);

        // Get first day of current month for "this month" stats
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstOfMonthStr = firstOfMonth.toISOString().slice(0, 10);

        const { laporan_harga } = collections();

        // 1. Get all unique dates with input for this user in the range
        const datesPipeline = [
            {
                $match: {
                    user_id: userId,
                    tanggal_lapor: { $gte: startDateStr, $lte: todayStr }
                }
            },
            {
                $group: {
                    _id: '$tanggal_lapor',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ];

        const datesResult = await laporan_harga.aggregate(datesPipeline).toArray();
        const inputDatesMap = new Map(datesResult.map(d => [d._id, d.count]));

        // 2. Build calendar data (all dates in range)
        const calendarData = [];
        const cursor = new Date(startDate);
        while (cursor <= today) {
            const dateStr = cursor.toISOString().slice(0, 10);
            const count = inputDatesMap.get(dateStr) || 0;
            const dayOfWeek = cursor.getDay(); // 0=Sun, 6=Sat

            // Skip weekends from "missed" calculation
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const status = count > 0 ? 'input' : (isWeekend ? 'weekend' : 'missed');

            calendarData.push({
                date: dateStr,
                count,
                status
            });
            cursor.setDate(cursor.getDate() + 1);
        }

        // 3. Calculate statistics
        const thisMonthDates = calendarData.filter(d => d.date >= firstOfMonthStr);
        const workdaysThisMonth = thisMonthDates.filter(d => d.status !== 'weekend');
        const daysWithInputThisMonth = workdaysThisMonth.filter(d => d.status === 'input').length;
        const missedDaysThisMonth = workdaysThisMonth.filter(d => d.status === 'missed').length;

        // Calculate longest streak (consecutive input days, excluding weekends)
        let longestStreak = 0;
        let currentStreak = 0;
        for (const day of calendarData) {
            if (day.status === 'input') {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else if (day.status === 'missed') {
                currentStreak = 0;
            }
            // weekend doesn't break streak
        }

        // Total days with input (all time in range)
        const totalDaysWithInput = calendarData.filter(d => d.status === 'input').length;
        const totalWorkdays = calendarData.filter(d => d.status !== 'weekend').length;
        const consistencyScore = totalWorkdays > 0 ? Math.round((totalDaysWithInput / totalWorkdays) * 100) : 0;

        // 4. Get recent activity (last 10 entries)
        const recentPipeline = [
            {
                $match: {
                    user_id: userId,
                    tanggal_lapor: { $gte: startDateStr, $lte: todayStr }
                }
            },
            {
                $group: {
                    _id: {
                        tanggal_lapor: '$tanggal_lapor',
                        market_id: '$market_id'
                    },
                    itemCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'pasar',
                    localField: '_id.market_id',
                    foreignField: 'id',
                    as: 'market'
                }
            },
            { $unwind: { path: '$market', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    date: '$_id.tanggal_lapor',
                    marketId: '$_id.market_id',
                    marketName: { $ifNull: ['$market.nama_pasar', 'Pasar Tidak Dikenal'] },
                    itemCount: 1
                }
            },
            { $sort: { date: -1 } },
            { $limit: 10 }
        ];

        const recentActivity = await laporan_harga.aggregate(recentPipeline).toArray();

        res.json({
            ok: true,
            data: {
                summary: {
                    totalDaysThisMonth: workdaysThisMonth.length,
                    daysWithInput: daysWithInputThisMonth,
                    missedDays: missedDaysThisMonth,
                    longestStreak,
                    consistencyScore
                },
                calendar: calendarData,
                recentActivity
            }
        });

    } catch (error) {
        console.error('[GET /api/survey-history/activity-summary] Error:', error);
        res.status(500).json({ ok: false, message: error.message });
    }
});

export default router;
