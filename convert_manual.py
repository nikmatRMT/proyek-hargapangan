
import fitz  # PyMuPDF
import os

pdf_map = {
    "daftar-pasar.pdf": "13_daftar_pasar.png",
    "Daftar_Komoditas.pdf": "14_daftar_komoditas.png",
    "Daftar_Petugas_2026-01-29.pdf": "15_daftar_petugas.png"
}

source_dir = r"d:\proyek-hargapangan-main\screenshot-tool\downloads"
output_dir = r"d:\proyek-hargapangan-main\screenshots"

print("🚀 Memulai Konversi PDF Manual...")

for pdf_name, png_name in pdf_map.items():
    pdf_path = os.path.join(source_dir, pdf_name)
    png_path = os.path.join(output_dir, png_name)

    if os.path.exists(pdf_path):
        try:
            doc = fitz.open(pdf_path)
            page = doc.load_page(0)  # Halaman pertama
            pix = page.get_pixmap()
            pix.save(png_path)
            print(f"✅ Berhasil: {pdf_name} -> {png_name}")
            doc.close()
        except Exception as e:
            print(f"❌ Gagal konversi {pdf_name}: {e}")
    else:
        print(f"⚠️ File tidak ditemukan: {pdf_path}")

print("🏁 Selesai.")
