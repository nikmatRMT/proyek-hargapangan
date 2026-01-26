import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

(async () => {
  const downloadPath = path.resolve(process.cwd(), 'tmp-export');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });

    const url = 'http://localhost:5174/backup';
    console.log('Opening', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for export button to appear; selector guesses
    const exportSelector = 'button:has-text("Semua Pasar")';
    try {
      await page.waitForSelector(exportSelector, { timeout: 10000 });
    } catch (e) {
      // try alternate: button with title or text
      const btn = await page.$x("//button[contains(., 'Semua Pasar') or contains(., 'Backup Semua Pasar')]");
      if (btn.length) {
        await btn[0].click();
      } else {
        throw new Error('Export button not found with expected selectors');
      }
    }

    // Click via selector if found
    const button = await page.$(exportSelector);
    if (button) await button.click();

    // wait for download file to appear
    console.log('Waiting for download...');
    const timeout = 30000;
    const start = Date.now();
    let found = null;
    while (Date.now() - start < timeout) {
      const files = fs.readdirSync(downloadPath).filter(f => f.endsWith('.xlsx'));
      if (files.length) { found = files[0]; break; }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!found) throw new Error('No .xlsx downloaded');
    const fullPath = path.join(downloadPath, found);
    console.log('Downloaded:', fullPath);
  } finally {
    await browser.close();
  }
})();
