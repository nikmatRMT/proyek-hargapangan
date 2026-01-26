export default function exportPreview(opts: {
  title?: string;
  monthLabel?: string;
  headers: string[];
  units?: string[];
  rows: Array<Record<string, any>>;
}) {
  const { title = 'Preview Export', monthLabel, headers, units = [], rows } = opts;

  // Build HTML table
  const cols = ['week', 'day', ...headers];
  const unitMap: Record<string, string> = {};
  headers.forEach((h, i) => (unitMap[h] = units[i] || '(Rp/Kg)'));

  const htmlRows = rows
    .map((r) => {
      const cells = cols.map((c) => {
        if (c === 'week') return `<td style="padding:6px;border:1px solid #ddd">${r.week ?? ''}</td>`;
        if (c === 'day') return `<td style="padding:6px;border:1px solid #ddd;text-align:right">${r.day ?? ''}</td>`;
        const val = r[c];
        return `<td style="padding:6px;border:1px solid #ddd;text-align:right">${typeof val === 'number' ? new Intl.NumberFormat('id-ID').format(val) : (val ?? '')}</td>`;
      });
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('\n');

  const headerCells = cols
    .map((c) => {
      if (c === 'week') return `<th style="padding:8px;border:1px solid #ccc">Minggu</th>`;
      if (c === 'day') return `<th style="padding:8px;border:1px solid #ccc">Tanggal</th>`;
      return `<th style="padding:8px;border:1px solid #ccc">${c} <div style="font-size:10px;color:#666">${unitMap[c] ?? ''}</div></th>`;
    })
    .join('');

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>body{font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:16px;} table{border-collapse:collapse;width:100%;} th{background:#f7fafc;text-align:left}</style>
  </head>
  <body>
    <h2>${escapeHtml(title)}</h2>
    ${monthLabel ? `<p style="color:#666;margin-top:0">${escapeHtml(monthLabel)}</p>` : ''}
    <div style="overflow:auto;max-height:70vh;border:1px solid #eee;padding:8px;background:#fff">
      <table>
        <thead>${headerCells}</thead>
        <tbody>${htmlRows}</tbody>
      </table>
    </div>
    <p style="margin-top:12px;color:#666;font-size:12px">Preview hanya untuk dilihat. Gunakan tombol Export di aplikasi untuk mengunduh file .xlsx.</p>
  </body>
  </html>
`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Gagal membuka tab preview. Periksa pop-up blocker.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return String(s || '').replace(/[&"'<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

export function exportPreviewMulti(opts: {
  title?: string;
  yearLabel?: string;
  markets: Array<{ name: string; tables: Array<{ monthLabel: string; headers: string[]; units?: string[]; rows: Array<Record<string, any>> }> }>;
}) {
  const { title = 'Preview Export', yearLabel, markets } = opts;

  const marketHtml = markets
    .map((m) => {
      const tablesHtml = m.tables
        .map((t) => {
          const cols = ['week', 'day', ...(t.headers || [])];
          const unitMap: Record<string, string> = {};
          (t.headers || []).forEach((h, i) => (unitMap[h] = (t.units || [])[i] || '(Rp/Kg)'));
          const headerCells = cols
            .map((c) => {
              if (c === 'week') return `<th style="padding:6px;border:1px solid #ccc">Minggu</th>`;
              if (c === 'day') return `<th style="padding:6px;border:1px solid #ccc">Tanggal</th>`;
              return `<th style="padding:6px;border:1px solid #ccc">${escapeHtml(c)}<div style="font-size:10px;color:#666">${escapeHtml(unitMap[c] || '')}</div></th>`;
            })
            .join('');
          const rowsHtml = (t.rows || [])
            .map((r) => {
              const cells = cols.map((c) => {
                if (c === 'week') return `<td style="padding:6px;border:1px solid #ddd">${r.week ?? ''}</td>`;
                if (c === 'day') return `<td style="padding:6px;border:1px solid #ddd;text-align:right">${r.day ?? ''}</td>`;
                const val = r[c];
                return `<td style="padding:6px;border:1px solid #ddd;text-align:right">${typeof val === 'number' ? new Intl.NumberFormat('id-ID').format(val) : (val ?? '')}</td>`;
              });
              return `<tr>${cells.join('')}</tr>`;
            })
            .join('\n');

          return `
            <h4 style="margin:8px 0">${escapeHtml(t.monthLabel)}</h4>
            <div style="overflow:auto;border:1px solid #eee;padding:6px;background:#fff;margin-bottom:12px">
              <table style="border-collapse:collapse;width:100%"><thead>${headerCells}</thead><tbody>${rowsHtml}</tbody></table>
            </div>
          `;
        })
        .join('\n');

      return `<section style="margin-bottom:28px"><h3 style="margin:6px 0 8px">${escapeHtml(m.name)}</h3>${tablesHtml}</section>`;
    })
    .join('\n');

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>body{font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:16px;} table{border-collapse:collapse;width:100%;} th{background:#f7fafc;text-align:left} section{border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:12px}</style>
  </head>
  <body>
    <h2>${escapeHtml(title)}</h2>
    ${yearLabel ? `<p style="color:#666;margin-top:0">${escapeHtml(yearLabel)}</p>` : ''}
    ${marketHtml}
    <p style="margin-top:12px;color:#666;font-size:12px">Preview hanya untuk dilihat. Gunakan tombol Export di aplikasi untuk mengunduh file .xlsx.</p>
  </body>
  </html>
`;

  const w = window.open('', '_blank');
  if (!w) { alert('Gagal membuka tab preview. Periksa pop-up blocker.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
