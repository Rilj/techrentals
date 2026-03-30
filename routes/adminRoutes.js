const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Loan = require('../models/Loan');
const User = require('../models/User');
const upload = require('../middleware/upload');
const XLSX = require('xlsx');
const { Parser } = require('json2csv');

const { isSuperAdmin, isAdmin } = require('../middleware/authMiddleware');

/* =========================
   HELPER FUNCTIONS
========================= */
const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatStatus = (status) => {
    const statusMap = {
        'pending': 'Menunggu Persetujuan',
        'borrowed': 'Sedang Dipinjam',
        'return_requested': 'Pengembalian Diajukan',
        'returned': 'Sudah Dikembalikan',
        'rejected': 'Ditolak'
    };
    return statusMap[status] || status;
};

const getLoanData = async (filters = {}) => {
    const { Op } = require('sequelize');
    const whereClause = {};
    
    if (filters.status) whereClause.status = filters.status;
    if (filters.startDate && filters.endDate) {
        whereClause.createdAt = {
            [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)]
        };
    }

    const loans = await Loan.findAll({
        where: whereClause,
        include: [
            { model: User, attributes: ['name', 'email', 'role'] },
            { model: Item, attributes: ['nama_barang', 'kode_unit'] }
        ],
        order: [['createdAt', 'DESC']]
    });

    return loans.map(loan => ({
        'ID': loan.id,
        'Nama Peminjam': loan.User?.name || 'N/A',
        'Email': loan.User?.email || 'N/A',
        'Role': loan.User?.role || 'N/A',
        'Nama Barang': loan.Item?.nama_barang || 'N/A',
        'Kode Unit': loan.Item?.kode_unit || 'N/A',
        'Tanggal Pinjam': formatDate(loan.startDate),
        'Tanggal Kembali': formatDate(loan.endDate),
        'Status': formatStatus(loan.status),
        'Biaya Sewa': loan.totalPrice || 0,
        'Denda': loan.fine || 0,
        'Total': (loan.totalPrice || 0) + (loan.fine || 0),
        'Tanggal Dibuat': formatDate(loan.createdAt)
    }));
};

/* =========================
   TAMBAH BARANG (SUPERADMIN)
========================= */
router.post('/add', isSuperAdmin, upload.single('image'), async (req, res) => {
    try {
        const { nama_barang, jumlah } = req.body;
        const total = parseInt(jumlah);

        if (isNaN(total) || total <= 0) {
            return res.send("Jumlah tidak valid");
        }

        for (let i = 1; i <= total; i++) {
            await Item.create({
                nama_barang,
                kode_unit: `${nama_barang.substring(0, 3).toUpperCase()}-${Date.now()}-${i}`,
                status: 'tersedia',
                image: req.file ? req.file.filename : null
            });
        }

        res.redirect('/superadmin');
    } catch (err) {
        console.error("ERROR TAMBAH BARANG:", err);
        res.send(err.message);
    }
});

/* =========================
   EXPORT DATA PEMINJAMAN
========================= */

// Export Excel
router.get('/export/excel', isSuperAdmin, async (req, res) => {
    try {
        const data = await getLoanData(req.query);
        
        if (data.length === 0) {
            return res.status(404).send('Tidak ada data untuk diekspor');
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        
        // Atur lebar kolom
        worksheet['!cols'] = [
            { wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 10 },
            { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
            { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Peminjaman');
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `peminjaman_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Export Excel Error:', error);
        res.status(500).send('Gagal mengekspor data');
    }
});

// Export CSV
router.get('/export/csv', isSuperAdmin, async (req, res) => {
    try {
        const data = await getLoanData(req.query);
        
        if (data.length === 0) {
            return res.status(404).send('Tidak ada data untuk diekspor');
        }

        const fields = Object.keys(data[0]);
        const parser = new Parser({ fields, withBOM: true });
        const csv = parser.parse(data);
        
        const filename = `peminjaman_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) {
        console.error('Export CSV Error:', error);
        res.status(500).send('Gagal mengekspor data');
    }
});

/* =========================
   COMPLETE RETURN
========================= */
router.post('/complete-return/:id', async (req, res) => {
    const loan = await Loan.findByPk(req.params.id, {
        include: [Item]
    });

    if (!loan) return res.send("Loan tidak ditemukan");

    const fine = parseInt(req.body.fine) || 0;

    loan.fine = fine;
    loan.totalPrice += fine;
    loan.status = 'returned';
    loan.endDate = new Date();

    await loan.save();

    loan.Item.status = 'tersedia';
    await loan.Item.save();

    res.redirect('/admin/dashboard');
});

module.exports = router;