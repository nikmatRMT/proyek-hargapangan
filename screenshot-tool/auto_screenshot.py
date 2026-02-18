# Auto Screenshot Script for HARPA BANUA Web Admin
# Menggunakan Playwright + PDF/Excel Screenshot
# Support untuk Admin dan Petugas

import os
import time
import glob
from playwright.sync_api import sync_playwright

# ============== KONFIGURASI ==============
BASE_URL = "http://localhost:5173"
OUTPUT_DIR = "./screenshots"
DOWNLOAD_DIR = "./downloads"

# Kredensial Admin
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin123!"

# Kredensial Petugas
PETUGAS_USERNAME = "petugas1"
PETUGAS_PASSWORD = "admin123"

# Route untuk Admin
ADMIN_ROUTES = [
    {"path": "/login", "name": "01_admin_login", "need_login": False},
    {"path": "/", "name": "02_admin_dashboard_ringkasan", "need_login": True},
    {"path": "/", "name": "03_admin_dashboard_data_tabel", "need_login": True, "click": "Data Tabel"},
    
    # Kelola Pasar (+ Modal Tambah)
    {"path": "/markets", "name": "04_admin_kelola_pasar", "need_login": True},
    {"path": "/markets", "name": "04b_admin_kelola_pasar_modal", "need_login": True, "click": "Tambah Pasar", "wait_for": "Tambah Pasar Baru"},

    # Kelola Petugas (+ Modal Tambah)
    {"path": "/users", "name": "05_admin_kelola_petugas", "need_login": True},
    {"path": "/users", "name": "05b_admin_kelola_petugas_modal", "need_login": True, "click": "Tambah Petugas", "wait_for": "Tambah Pengguna"},

    # Output Manager
    {"path": "/output-manager", "name": "06_admin_output_manager", "need_login": True},
    {"path": "/input-data", "name": "07_admin_input_data", "need_login": True},

    # Kelola Komoditas (+ Modal Tambah)
    {"path": "/commodities", "name": "12_admin_kelola_komoditas", "need_login": True},
    {"path": "/commodities", "name": "12b_admin_kelola_komoditas_modal", "need_login": True, "click": "Tambah", "wait_for": "Tambah Komoditas Baru"},
]

# Route untuk Petugas
PETUGAS_ROUTES = [
    {"path": "/input-data", "name": "08_petugas_input_data", "need_login": True},
    {"path": "/profile", "name": "09_petugas_profil", "need_login": True},
]


def screenshot_pdf(pdf_path, output_path):
    """Convert PDF halaman pertama ke gambar"""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        page = doc[0]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        pix.save(output_path)
        doc.close()
        print(f"   ✅ PDF Screenshot: {output_path}")
        return True
    except Exception as e:
        print(f"   ❌ PDF Error: {e}")
        return False


def screenshot_excel(excel_path, output_path):
    """Convert Excel ke gambar"""
    try:
        import pandas as pd
        import matplotlib.pyplot as plt
        import matplotlib
        matplotlib.use('Agg')
        
        df = pd.read_excel(excel_path, nrows=20)
        
        fig, ax = plt.subplots(figsize=(14, 8))
        ax.axis('off')
        
        table = ax.table(
            cellText=df.values,
            colLabels=df.columns,
            cellLoc='center',
            loc='center'
        )
        table.auto_set_font_size(False)
        table.set_fontsize(8)
        table.scale(1.2, 1.5)
        
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight', pad_inches=0.1)
        plt.close()
        
        print(f"   ✅ Excel Screenshot: {output_path}")
        return True
    except Exception as e:
        print(f"   ❌ Excel Error: {e}")
        return False


def login(page, username, password):
    """Login ke aplikasi"""
    print(f"🔐 Login sebagai: {username}")
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    
    page.fill("input[type='text']", username)
    page.fill("input[type='password']", password)
    page.click("button[type='submit']")
    
    page.wait_for_timeout(3000)
    print("✅ Login berhasil!")


def logout(page):
    """Logout dari aplikasi"""
    print("🚪 Logout...")
    # Clear localStorage
    page.evaluate("localStorage.clear()")
    page.goto(f"{BASE_URL}/login")
    page.wait_for_timeout(2000)
    print("✅ Logout berhasil!")


def take_screenshots(page, routes, output_dir, is_logged_in=False, username="", password=""):
    """Ambil screenshot untuk daftar route"""
    for route in routes:
        # Screenshot login page (sebelum login)
        if not route["need_login"]:
            url = f"{BASE_URL}{route['path']}"
            filepath = os.path.join(output_dir, f"{route['name']}.png")
            
            print(f"� Screenshot: {route['path']} -> {route['name']}")
            page.goto(url)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=filepath, full_page=False)
            print(f"   ✅ Tersimpan: {filepath}")
            continue
        
        # Login jika belum
        if not is_logged_in:
            login(page, username, password)
            is_logged_in = True
        
        # Screenshot halaman
        url = f"{BASE_URL}{route['path']}"
        filepath = os.path.join(output_dir, f"{route['name']}.png")
        
        print(f"📸 Screenshot: {route['path']} -> {route['name']}")
        page.goto(url)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000) # Wait longer for animations
        
        # Jika ada aksi klik sebelum screenshot (misal buka modal)
        if "click" in route:
            try:
                print(f"   🖱️ Mengklik tombol: {route['click']}")
                page.click(f"text={route['click']}")
                page.wait_for_timeout(1000) # Tunggu animasi modal
                
                # [NEW] Tunggu elemen spesifik muncul (untuk memastikan modal terbuka)
                if "wait_for" in route:
                    print(f"   ⏳ Menunggu elemen: '{route['wait_for']}'...")
                    try:
                        page.wait_for_selector(f"text={route['wait_for']}", timeout=5000)
                        page.wait_for_timeout(1000) # Wait extra for animation settle
                    except:
                        print(f"   ⚠️ Elemen '{route['wait_for']}' tidak muncul (timeout)")

            except Exception as e:
                print(f"   ⚠️ Gagal klik '{route['click']}': {e}")
        
        # Jika ini adalah screenshot MODAL (ada wait_for), jangan pakai full_page
        # karena elemen fixed position sering bermasalah di full_page screenshot
        use_full_page = True
        if "wait_for" in route:
            use_full_page = False
        
        page.screenshot(path=filepath, full_page=use_full_page)
        print(f"   ✅ Tersimpan: {filepath}")
    
    return is_logged_in


def capture_output_manager_suite(page, download_dir, output_dir):
    """
    Eksekusi lengkap semua fitur export di Output Manager:
    1. Laporan Umum
    2. Laporan Spesifik (per Komoditas)
    3. Laporan Rata-rata
    4. Daftar Master (Pasar, Komoditas, Petugas)
    5. Riwayat Survey
    6. Backup
    """
    print("\n🏁 Memulai Suite Output Manager Lengkap...")
    
    page.goto(f"{BASE_URL}/output-manager")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    # --- HYBRID APPROACH: API Direct for Backend Reports, UI for Client-Side Lists ---
    
    def direct_api_download(name, api_endpoint, params, output_name):
        print(f"\n   🌍 [{name}] Direct API Download...")
        try:
            # Construct Query String
            query = "&".join([f"{k}={v}" for k, v in params.items()])
            url = f"{BASE_URL}{api_endpoint}?{query}"
            print(f"      🔗 URL: ...{api_endpoint}?{query[:50]}...")

            with page.expect_download(timeout=120000) as download_info:
                # Trigger download via navigation (simulates clicking a link)
                # Using evaluate to avoid navigating away from the app context if possible, 
                # but window.location is easiest. 
                # Better: Create a hidden link and click it to respect auth cookies
                page.evaluate(f"""
                    const a = document.createElement('a');
                    a.href = '{url}';
                    a.download = 'download';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                """)
            
            download = download_info.value
            save_path = os.path.join(download_dir, f"{output_name}_{int(time.time())}.pdf")
            download.save_as(save_path)
            print(f"      ✅ Downloaded: {os.path.basename(save_path)}")
            
            ss_path = os.path.join(output_dir, f"{output_name}.png")
            screenshot_pdf(save_path, ss_path)
            time.sleep(2)
            
        except Exception as e:
            print(f"      ❌ Gagal API Download {name}: {e}")

    # --- 1. Export Server-Side Reports (Direct API) ---
    market_id = "1" # Pasar Bauntung (Checking ID from UI or assuming 1)
    # Note: markets usually have ID, likely 1. If not effective, usage of 'Semua Pasar' logic might be needed.
    # But usually ID 1 is safe for testing if 'Pasar Bauntung' exists.
    
    # Laporan Umum
    direct_api_download("Laporan Umum", "/api/export-pdf", 
                        {"from": "2024-07-01", "to": "2024-07-31", "market": "1", "komoditas": "Semua Komoditas"}, 
                        "10_laporan_umum")

    # Laporan Spesifik (Beras)
    direct_api_download("Laporan Spesifik", "/api/export-pdf-komoditas", 
                        {"from": "2024-07-01", "to": "2024-07-31", "market": "1", "komoditas": "Beras"}, 
                        "11_laporan_spesifik")
    
    # Riwayat Petugas (Asumsi user ID 1 or 'all')
    direct_api_download("Riwayat Petugas", "/api/survey-history/export/pdf", 
                         {"from": "2024-07-01", "to": "2024-07-31"}, 
                         "16_riwayat_petugas")

    # Backup Full (DISABLED - MANUAL ONLY)
    # direct_api_download("Backup Full", "/api/export-pdf", 
    #                     {"from": "2024-07-01", "to": "2024-07-31", "market": "Semua Pasar", "komoditas": "Semua Komoditas"}, 
    #                     "17_backup_full")

    print("\n   ⚠️ Backup Full dilewati (Mode Manual).")

    # --- 2. Client-Side Exports (Butuh UI Interaction) ---
    # List Exports (Pasar, Komoditas, Petugas, Excel Rata-rata)
    
    def click_export_ui(section_name, button_text, output_name):
        print(f"\n   🖱️ [{section_name}] UI Click Export...")
        try:
             # Selector strategy
             selector = f"button:has-text('{button_text}')"
             if output_name == "13_daftar_pasar":
                 selector = "div:has(h3:has-text('Daftar Pasar')) >> button:has-text('PDF')"
             elif output_name == "14_daftar_komoditas":
                 selector = "div:has(h3:has-text('Daftar Komoditas')) >> button:has-text('PDF')"
             elif output_name == "15_daftar_petugas":
                 selector = "div:has(h3:has-text('Daftar Petugas')) >> button:has-text('PDF')"
             
             # Scroll to element to ensure visibility
             try:
                page.locator(selector).first.scroll_into_view_if_needed()
             except: pass

             with page.expect_download(timeout=30000) as download_info:
                 page.locator(selector).first.click(force=True)
                 
             download = download_info.value
             # Determine ext
             suggested = download.suggested_filename
             ext = ".pdf" if "pdf" in suggested.lower() else ".xlsx"
             
             save_path = os.path.join(download_dir, f"{output_name}_{int(time.time())}{ext}")
             download.save_as(save_path)
             print(f"      ✅ Downloaded: {suggested}")
             
             if ext == ".pdf":
                 screenshot_pdf(save_path, os.path.join(output_dir, f"{output_name}.png"))
             
             time.sleep(2)
        except Exception as e:
            print(f"      ❌ Gagal UI Export {section_name}: {e}")

    # Eksekusi UI Exports (Daftar Master - Client Side)
    # Pindah dulu ke page Output Manager untuk memastikan context (jika perlu refresh/nav)
    # page.goto(f"{BASE_URL}/output-manager") 
    # page.wait_for_load_state("networkidle")
    
    click_export_ui("Daftar Pasar", "PDF", "13_daftar_pasar")
    click_export_ui("Daftar Komoditas", "PDF", "14_daftar_komoditas")
    click_export_ui("Daftar Petugas", "PDF", "15_daftar_petugas")
    
    # Laporan Rata-rata (Excel) - Skip Screenshot, just download verification
    # Excel might be empty due to date reset, but we try anyway.
    # click_export_ui("Laporan Rata-rata", "Excel (Semua)", "12a_rata_rata_semua")
    
    print("\n✅ Suite Output Manager Selesai.")


def main():
    """Fungsi utama"""
    print("=" * 50)
    print("🚀 HARPA BANUA Auto Screenshot")
    print("   Admin + Petugas Mode")
    print("=" * 50)
    
    # Buat folder
    for folder in [OUTPUT_DIR, DOWNLOAD_DIR]:
        if not os.path.exists(folder):
            os.makedirs(folder)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            accept_downloads=True
        )
        page = context.new_page()
        
        # ========== ADMIN SCREENSHOTS ==========
        print("\n" + "=" * 50)
        print("👤 SCREENSHOT SEBAGAI ADMIN")
        print("=" * 50)
        
        take_screenshots(
            page, ADMIN_ROUTES, OUTPUT_DIR,
            is_logged_in=False,
            username=ADMIN_USERNAME,
            password=ADMIN_PASSWORD
        )
        
        # Export Output Manager Lengkap (PDF/Excel)
        capture_output_manager_suite(page, DOWNLOAD_DIR, OUTPUT_DIR)
        
        # Logout
        logout(page)
        
        # ========== PETUGAS SCREENSHOTS ==========
        print("\n" + "=" * 50)
        print("👷 SCREENSHOT SEBAGAI PETUGAS")
        print("=" * 50)
        
        take_screenshots(
            page, PETUGAS_ROUTES, OUTPUT_DIR,
            is_logged_in=False,
            username=PETUGAS_USERNAME,
            password=PETUGAS_PASSWORD
        )
        
        browser.close()
    
    print("\n" + "=" * 50)
    print(f"✅ Selesai! Screenshot tersimpan di: {OUTPUT_DIR}")
    print("=" * 50)


if __name__ == "__main__":
    main()
