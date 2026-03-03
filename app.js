const STORAGE_KEY = 'cotizapro_quotes';
const COUNTER_KEY = 'cotizapro_nextQuoteNumber';
const DEFAULT_ISSUER_EMAIL = 'luismiguelgarciadelasmorenas@gmail.com';

let items = [];
let editingId = null;
let currentQuoteNumber = null;

const fmt = (n) => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function generateId() {
  return 'Q-' + Date.now().toString(36).toUpperCase();
}

function nextQuoteNumber() {
  const n = parseInt(localStorage.getItem(COUNTER_KEY) || '1', 10);
  localStorage.setItem(COUNTER_KEY, String(n + 1));
  return String(n).padStart(4, '0');
}

function getActiveQuoteNumber() {
  if (currentQuoteNumber) return currentQuoteNumber;
  currentQuoteNumber = nextQuoteNumber();
  return currentQuoteNumber;
}

function getSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveToStorage(quotes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

function addItem() {
  const id = Date.now();
  items.push({ id, name: '', desc: '', price: 0, qty: 1 });
  renderItems();
}

function removeItem(id) {
  items = items.filter(i => i.id !== id);
  renderItems();
}

function renderItems() {
  const list = document.getElementById('itemsList');
  list.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.id = item.id;
    row.innerHTML = `
      <input type="text" placeholder="Nombre del servicio" value="${esc(item.name)}" data-field="name" />
      <input type="text" placeholder="Descripción breve" value="${esc(item.desc)}" data-field="desc" />
      <input type="number" placeholder="0.00" value="${item.price || ''}" min="0" step="0.01" data-field="price" />
      <input type="number" placeholder="1" value="${item.qty || ''}" min="1" step="1" data-field="qty" />
      <div class="item-total">${fmt(item.price * item.qty)}</div>
      <button class="btn-remove" data-remove="${item.id}" title="Eliminar">&#215;</button>
    `;
    list.appendChild(row);
  });
  updateTotals();
  updatePreview();
}

function esc(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

document.getElementById('itemsList').addEventListener('input', (e) => {
  const row = e.target.closest('.item-row');
  if (!row) return;
  const id = Number(row.dataset.id);
  const item = items.find(i => i.id === id);
  if (!item) return;
  const field = e.target.dataset.field;
  if (field === 'price' || field === 'qty') {
    item[field] = parseFloat(e.target.value) || 0;
  } else {
    item[field] = e.target.value;
  }
  const totalEl = row.querySelector('.item-total');
  totalEl.textContent = fmt(item.price * item.qty);
  updateTotals();
  updatePreview();
});

document.getElementById('itemsList').addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) removeItem(Number(removeBtn.dataset.remove));
});

function calcTotals() {
  const subtotal = items.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const taxEnabled = document.getElementById('taxEnabled').checked;
  const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
  const discountEnabled = document.getElementById('discountEnabled').checked;
  const discountVal = parseFloat(document.getElementById('discountValue').value) || 0;
  const discountMode = document.getElementById('discountMode').value;

  let discount = 0;
  if (discountEnabled) {
    discount = discountMode === 'percent' ? subtotal * (discountVal / 100) : discountVal;
    discount = Math.min(discount, subtotal);
  }

  const taxable = subtotal - discount;
  const tax = taxEnabled ? taxable * (taxRate / 100) : 0;
  const total = taxable + tax;

  return { subtotal, discount, tax, taxRate, taxEnabled, discountEnabled, total };
}

function updateTotals() {
  const { subtotal, discount, tax, taxRate, taxEnabled, discountEnabled, total } = calcTotals();

  document.getElementById('summarySubtotal').textContent = fmt(subtotal);
  document.getElementById('summaryDiscount').textContent = '-' + fmt(discount);
  document.getElementById('summaryTax').textContent = fmt(tax);
  document.getElementById('summaryTotal').textContent = fmt(total);
  document.getElementById('taxLabel').textContent = `IVA (${taxRate}%)`;

  document.getElementById('taxRow').style.display = taxEnabled ? 'flex' : 'none';
  document.getElementById('discountRow').style.display = discountEnabled && discount > 0 ? 'flex' : 'none';
}

function updatePreview() {
  const clientName = document.getElementById('clientName').value.trim();
  const clientEmail = document.getElementById('clientEmail').value.trim();
  const clientPhone = document.getElementById('clientPhone').value.trim();
  const issuerName = document.getElementById('issuerName').value.trim();
  const issuerEmail = document.getElementById('issuerEmail').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const { subtotal, discount, tax, taxRate, taxEnabled, discountEnabled, total } = calcTotals();

  const container = document.getElementById('previewContent');

  if (!clientName && !issuerName && items.length === 0) {
    container.innerHTML = '<p class="preview-placeholder">Completa el formulario para ver la vista previa de tu cotización.</p>';
    return;
  }

  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const quoteNum = getActiveQuoteNumber();

  let rowsHtml = items.map(i => `
    <tr>
      <td><div class="td-name">${esc(i.name) || '-'}</div><div class="td-desc">${esc(i.desc)}</div></td>
      <td>${fmt(i.price)}</td>
      <td style="text-align:center">${i.qty}</td>
      <td>${fmt(i.price * i.qty)}</td>
    </tr>
  `).join('');

  if (!rowsHtml) rowsHtml = '<tr><td colspan="4" style="text-align:center;color:#9CA3AF;padding:16px">Sin ítems agregados</td></tr>';

  const discountHtml = discountEnabled && discount > 0
    ? `<div class="quote-totals-row"><span>Descuento</span><span>-${fmt(discount)}</span></div>` : '';
  const taxHtml = taxEnabled
    ? `<div class="quote-totals-row"><span>IVA (${taxRate}%)</span><span>${fmt(tax)}</span></div>` : '';
  const notesHtml = notes
    ? `<div class="quote-notes"><div class="quote-notes-label">Notas</div>${esc(notes)}</div>` : '';

  container.innerHTML = `
    <div class="quote-doc" id="quotePrintArea">
      <div class="quote-doc-header">
        <div>
          <div class="quote-company">${esc(issuerName) || 'Tu Empresa'}</div>
          <div class="quote-company-sub">${esc(issuerEmail)}</div>
        </div>
        <div class="quote-meta">
          <strong>COTIZACIÓN</strong>
          #${quoteNum}<br/>
          ${today}
        </div>
      </div>
      <div class="quote-parties">
        <div>
          <div class="quote-party-label">Para</div>
          <div class="quote-party-name">${esc(clientName) || '-'}</div>
          ${clientEmail ? `<div class="quote-party-detail">${esc(clientEmail)}</div>` : ''}
          ${clientPhone ? `<div class="quote-party-detail">${esc(clientPhone)}</div>` : ''}
        </div>
        <div>
          <div class="quote-party-label">De parte de</div>
          <div class="quote-party-name">${esc(issuerName) || '-'}</div>
          ${issuerEmail ? `<div class="quote-party-detail">${esc(issuerEmail)}</div>` : ''}
        </div>
      </div>
      <table class="quote-table">
        <thead>
          <tr>
            <th>Servicio / Producto</th>
            <th>Precio unit.</th>
            <th style="text-align:center">Cant.</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="quote-totals">
        <div class="quote-totals-inner">
          <div class="quote-totals-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
          ${discountHtml}
          ${taxHtml}
          <div class="quote-totals-total"><span>TOTAL</span><span>${fmt(total)}</span></div>
        </div>
      </div>
      ${notesHtml}
      <div class="quote-footer">Generado con CotizaPro &mdash; Cotización válida por 30 días</div>
    </div>
  `;
}

function getFormData() {
  return {
    clientName: document.getElementById('clientName').value.trim(),
    clientEmail: document.getElementById('clientEmail').value.trim(),
    clientPhone: document.getElementById('clientPhone').value.trim(),
    issuerName: document.getElementById('issuerName').value.trim(),
    issuerEmail: document.getElementById('issuerEmail').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    taxEnabled: document.getElementById('taxEnabled').checked,
    taxRate: parseFloat(document.getElementById('taxRate').value) || 16,
    discountEnabled: document.getElementById('discountEnabled').checked,
    discountValue: parseFloat(document.getElementById('discountValue').value) || 0,
    discountMode: document.getElementById('discountMode').value,
    items: JSON.parse(JSON.stringify(items)),
    quoteNumber: getActiveQuoteNumber(),
  };
}

function loadFormData(data) {
  document.getElementById('clientName').value = data.clientName || '';
  document.getElementById('clientEmail').value = data.clientEmail || '';
  document.getElementById('clientPhone').value = data.clientPhone || '';
  document.getElementById('issuerName').value = data.issuerName || '';
  document.getElementById('issuerEmail').value = data.issuerEmail || DEFAULT_ISSUER_EMAIL;
  document.getElementById('notes').value = data.notes || '';
  document.getElementById('taxEnabled').checked = !!data.taxEnabled;
  document.getElementById('taxRate').value = data.taxRate || 16;
  document.getElementById('discountEnabled').checked = !!data.discountEnabled;
  document.getElementById('discountValue').value = data.discountValue || 0;
  document.getElementById('discountMode').value = data.discountMode || 'fixed';
  document.getElementById('taxInputWrap').classList.toggle('visible', !!data.taxEnabled);
  document.getElementById('discountInputWrap').classList.toggle('visible', !!data.discountEnabled);
  items = data.items || [];
  currentQuoteNumber = data.quoteNumber || null;
  renderItems();
}

function saveQuote() {
  const data = getFormData();
  if (!data.clientName || !data.issuerName) {
    showToast('Completa al menos el nombre del cliente y tu empresa.');
    return;
  }
  const saved = getSaved();
  const id = editingId || generateId();

  if (editingId) {
    const idx = saved.findIndex(q => q.id === editingId);
    if (idx !== -1) {
      saved[idx] = { ...data, id, savedAt: new Date().toISOString() };
    }
  } else {
    saved.push({ ...data, id, savedAt: new Date().toISOString() });
    editingId = id;
  }

  saveToStorage(saved);
  showToast('Cotización guardada correctamente.');
}

function resetForm() {
  document.getElementById('clientName').value = '';
  document.getElementById('clientEmail').value = '';
  document.getElementById('clientPhone').value = '';
  document.getElementById('issuerName').value = '';
  document.getElementById('issuerEmail').value = DEFAULT_ISSUER_EMAIL;
  document.getElementById('notes').value = '';
  document.getElementById('taxEnabled').checked = false;
  document.getElementById('taxRate').value = 16;
  document.getElementById('discountEnabled').checked = false;
  document.getElementById('discountValue').value = 0;
  document.getElementById('discountMode').value = 'fixed';
  document.getElementById('taxInputWrap').classList.remove('visible');
  document.getElementById('discountInputWrap').classList.remove('visible');
  items = [];
  editingId = null;
  currentQuoteNumber = null;
  renderItems();
}

function renderSavedList() {
  const saved = getSaved();
  const container = document.getElementById('savedList');
  if (saved.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay cotizaciones guardadas aún.</div>';
    return;
  }
  container.innerHTML = saved.slice().reverse().map(q => {
    const date = new Date(q.savedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
    const { subtotal, discount, tax, total } = calcTotalsFrom(q);
    return `
      <div class="saved-item">
        <div class="saved-item-info">
          <div class="saved-item-name">${esc(q.clientName)} &mdash; ${esc(q.issuerName)}</div>
          <div class="saved-item-date">${date} &bull; Total: ${fmt(total)}</div>
        </div>
        <div class="saved-item-actions">
          <button class="btn btn-secondary btn-sm" data-load="${q.id}">Cargar</button>
          <button class="btn btn-danger btn-sm" data-delete="${q.id}">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function calcTotalsFrom(data) {
  const items = data.items || [];
  const subtotal = items.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const discountEnabled = data.discountEnabled;
  const discountVal = data.discountValue || 0;
  const discountMode = data.discountMode || 'fixed';
  let discount = 0;
  if (discountEnabled) {
    discount = discountMode === 'percent' ? subtotal * (discountVal / 100) : discountVal;
    discount = Math.min(discount, subtotal);
  }
  const taxable = subtotal - discount;
  const tax = data.taxEnabled ? taxable * ((data.taxRate || 0) / 100) : 0;
  return { subtotal, discount, tax, total: taxable + tax };
}

async function downloadPDF() {
  if (!window.jspdf?.jsPDF) { showToast('Error al cargar generador PDF.'); return; }
  const { jsPDF } = window.jspdf;

  const clientName = document.getElementById('clientName').value.trim() || 'Cliente';
  const issuerName = document.getElementById('issuerName').value.trim() || 'Emisor';
  const issuerEmail = document.getElementById('issuerEmail').value.trim();
  const clientEmail = document.getElementById('clientEmail').value.trim();
  const clientPhone = document.getElementById('clientPhone').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const quoteNum = getActiveQuoteNumber();
  const { subtotal, discount, tax, taxRate, taxEnabled, discountEnabled, total } = calcTotals();

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, MARGIN = 18;
  let y = 20;

  const primary = [79, 70, 229];
  const textColor = [17, 24, 39];
  const mutedColor = [107, 114, 128];
  const bgColor = [249, 250, 251];
  const borderColor = [229, 231, 235];

  doc.setFillColor(...primary);
  doc.rect(MARGIN, y, W - MARGIN * 2, 1, 'F');
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primary);
  doc.text(issuerName || 'Tu Empresa', MARGIN, y + 8);

  if (issuerEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text(issuerEmail, MARGIN, y + 13);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...primary);
  doc.text('COTIZACIÓN', W - MARGIN, y + 5, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(`#${quoteNum}`, W - MARGIN, y + 11, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  doc.text(today, W - MARGIN, y + 16, { align: 'right' });

  y += 28;

  doc.setFillColor(...primary);
  doc.rect(MARGIN, y, W - MARGIN * 2, 0.4, 'F');
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text('PARA', MARGIN, y);
  doc.text('DE PARTE DE', W / 2 + 4, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textColor);
  doc.text(clientName, MARGIN, y);
  doc.text(issuerName, W / 2 + 4, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedColor);
  if (clientEmail) { doc.text(clientEmail, MARGIN, y); }
  if (issuerEmail) { doc.text(issuerEmail, W / 2 + 4, y); }
  y += 4;
  if (clientPhone) { doc.text(clientPhone, MARGIN, y); }
  y += 10;

  const colWidths = [62, 28, 18, 28];
  const colX = [MARGIN, MARGIN + 62, MARGIN + 90, MARGIN + 108];
  const tableW = W - MARGIN * 2;

  doc.setFillColor(...primary);
  doc.rect(MARGIN, y, tableW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('SERVICIO / PRODUCTO', colX[0] + 2, y + 4.5);
  doc.text('PRECIO UNIT.', colX[1] + 2, y + 4.5);
  doc.text('CANT.', colX[2] + 2, y + 4.5);
  doc.text('TOTAL', W - MARGIN - 2, y + 4.5, { align: 'right' });
  y += 7;

  items.forEach((item, idx) => {
    const rowH = 9;
    if (idx % 2 === 0) {
      doc.setFillColor(...bgColor);
      doc.rect(MARGIN, y, tableW, rowH, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text(item.name || '-', colX[0] + 2, y + 4);
    if (item.desc) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedColor);
      doc.text(item.desc, colX[0] + 2, y + 7.5);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...textColor);
    doc.text(fmt(item.price), colX[1] + 2, y + 5);
    doc.text(String(item.qty), colX[2] + 2, y + 5);
    doc.text(fmt(item.price * item.qty), W - MARGIN - 2, y + 5, { align: 'right' });

    doc.setDrawColor(...borderColor);
    doc.line(MARGIN, y + rowH, W - MARGIN, y + rowH);
    y += rowH;
  });

  y += 6;

  const totalsX = W - MARGIN - 55;

  const addTotalRow = (label, value, bold = false, isTotal = false) => {
    if (isTotal) {
      doc.setFillColor(...primary);
      doc.rect(totalsX - 2, y - 1, 57, 7, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(...mutedColor);
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 10 : 8.5);
    doc.text(label, totalsX, y + 4);
    doc.text(value, W - MARGIN - 2, y + 4, { align: 'right' });
    y += 7;
  };

  addTotalRow('Subtotal', fmt(subtotal));
  if (discountEnabled && discount > 0) addTotalRow('Descuento', '-' + fmt(discount));
  if (taxEnabled) addTotalRow(`IVA (${taxRate}%)`, fmt(tax));
  addTotalRow('TOTAL', fmt(total), true, true);
  y += 4;

  if (notes) {
    const noteLines = doc.splitTextToSize(notes, tableW - 8);
    const lineH = 4.5;
    const boxH = 8 + noteLines.length * lineH;
    doc.setFillColor(...bgColor);
    doc.rect(MARGIN, y, tableW, boxH, 'F');
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, y, MARGIN, y + boxH);
    doc.setLineWidth(0.2);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    doc.text('NOTAS', MARGIN + 4, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...mutedColor);
    noteLines.forEach((line, i) => {
      doc.text(line, MARGIN + 4, y + 6 + i * lineH);
    });
    y += boxH + 4;
  }

  doc.setDrawColor(...borderColor);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text('Generado con CotizaPro — Cotización válida por 30 días', W / 2, y, { align: 'center' });

  const fileName = `cotizacion-${(clientName || 'cliente').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  doc.save(fileName);
  showToast('PDF descargado correctamente.');
}

function buildEmailContent() {
  const clientName = document.getElementById('clientName').value.trim();
  const clientEmail = document.getElementById('clientEmail').value.trim();
  const issuerName = document.getElementById('issuerName').value.trim();
  const issuerEmail = document.getElementById('issuerEmail').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const quoteNum = getActiveQuoteNumber();
  const { subtotal, discount, tax, taxRate, taxEnabled, discountEnabled, total } = calcTotals();

  const itemLines = items.map(i =>
    `  - ${i.name || 'Sin nombre'}${i.desc ? ' (' + i.desc + ')' : ''}: ${i.qty} x ${fmt(i.price)} = ${fmt(i.price * i.qty)}`
  ).join('\n');

  let totalsBlock = `Subtotal: ${fmt(subtotal)}`;
  if (discountEnabled && discount > 0) totalsBlock += `\nDescuento: -${fmt(discount)}`;
  if (taxEnabled) totalsBlock += `\nIVA (${taxRate}%): ${fmt(tax)}`;
  totalsBlock += `\nTOTAL: ${fmt(total)}`;

  const notesBlock = notes ? `\nNotas:\n${notes}\n` : '';

  const body = `Estimado/a ${clientName || 'cliente'},\n\nAdjunto encontrará la cotización solicitada.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `COTIZACIÓN #${quoteNum}\n` +
    `Fecha: ${today}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Para: ${clientName || '-'}${clientEmail ? ' <' + clientEmail + '>' : ''}\n` +
    `De: ${issuerName || '-'}${issuerEmail ? ' <' + issuerEmail + '>' : ''}\n\n` +
    `SERVICIOS / PRODUCTOS:\n${itemLines || '  (sin ítems)'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${totalsBlock}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${notesBlock}\n` +
    `Quedo a su disposición ante cualquier duda.\n\n` +
    `Saludos,\n${issuerName || ''}\n${issuerEmail || DEFAULT_ISSUER_EMAIL}`;

  return { to: clientEmail, subject: `Cotización #${quoteNum}`, body };
}

function validateEmailExport() {
  const clientEmail = document.getElementById('clientEmail').value.trim();
  if (!items.length) { showToast('Agrega al menos un ítem antes de enviar.'); return false; }
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    showToast('El correo del cliente no es válido.'); return false;
  }
  return true;
}

function sendEmail() {
  if (!validateEmailExport()) return;
  const { to, subject, body } = buildEmailContent();
  window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showToast('Adjunta el PDF antes de enviar.');
}

function copyEmail() {
  if (!validateEmailExport()) return;
  const { body } = buildEmailContent();
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(body).then(() => showToast('Email copiado al portapapeles.')).catch(() => fallbackCopy(body));
  } else {
    fallbackCopy(body);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand('copy'); showToast('Email copiado al portapapeles.'); }
  catch { showToast('No se pudo copiar. Intenta manualmente.'); }
  document.body.removeChild(ta);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

document.getElementById('btnAddItem').addEventListener('click', addItem);
document.getElementById('btnPreview').addEventListener('click', updatePreview);
document.getElementById('btnSave').addEventListener('click', saveQuote);
document.getElementById('btnDownload').addEventListener('click', downloadPDF);
document.getElementById('btnEmailSend').addEventListener('click', sendEmail);
document.getElementById('btnEmailCopy').addEventListener('click', copyEmail);

document.getElementById('btnNewQuote').addEventListener('click', () => {
  if (confirm('¿Crear una nueva cotización? Los cambios no guardados se perderán.')) resetForm();
});

document.getElementById('btnSavedQuotes').addEventListener('click', () => {
  renderSavedList();
  document.getElementById('savedModal').classList.add('open');
});

document.getElementById('closeSavedModal').addEventListener('click', () => {
  document.getElementById('savedModal').classList.remove('open');
});

document.getElementById('savedModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('savedModal'))
    document.getElementById('savedModal').classList.remove('open');
});

document.getElementById('savedList').addEventListener('click', (e) => {
  const loadBtn = e.target.closest('[data-load]');
  const deleteBtn = e.target.closest('[data-delete]');

  if (loadBtn) {
    const id = loadBtn.dataset.load;
    const saved = getSaved();
    const q = saved.find(q => q.id === id);
    if (q) {
      loadFormData(q);
      editingId = id;
      document.getElementById('savedModal').classList.remove('open');
      showToast('Cotización cargada.');
    }
  }

  if (deleteBtn) {
    if (!confirm('¿Eliminar esta cotización?')) return;
    const id = deleteBtn.dataset.delete;
    const saved = getSaved().filter(q => q.id !== id);
    saveToStorage(saved);
    if (editingId === id) { resetForm(); }
    renderSavedList();
    showToast('Cotización eliminada.');
  }
});

document.getElementById('taxEnabled').addEventListener('change', (e) => {
  document.getElementById('taxInputWrap').classList.toggle('visible', e.target.checked);
  updateTotals(); updatePreview();
});

document.getElementById('discountEnabled').addEventListener('change', (e) => {
  document.getElementById('discountInputWrap').classList.toggle('visible', e.target.checked);
  updateTotals(); updatePreview();
});

['taxRate', 'discountValue', 'discountMode'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => { updateTotals(); updatePreview(); });
});

['clientName', 'clientEmail', 'clientPhone', 'issuerName', 'issuerEmail', 'notes'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
});

if (!document.getElementById('issuerEmail').value) {
  document.getElementById('issuerEmail').value = DEFAULT_ISSUER_EMAIL;
}
addItem();
