let taxRecords = JSON.parse(localStorage.getItem('sales_tax_records_v3')) || [];
let customers = JSON.parse(localStorage.getItem('sales_tax_customers_v3')) || [
    { id: '1', name: 'บริษัท ตัวอย่าง จำกัด (สำนักงานใหญ่)', taxId: '0105558000123', address: '123/45 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110' },
    { id: '2', name: 'หจก. บริการรวดเร็ว', taxId: '0103560004567', address: '99/8 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400' }
];

document.addEventListener('DOMContentLoaded', () => {
    resetForm();
    renderTable();
    updateStats();
    updateCustomerBadge();
    renderCustomerTable();

    // Keyboard shortcut listener (F2 to focus tax id)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            document.getElementById('taxId').focus();
        }
    });

    // Close autocomplete dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#taxId') && !e.target.closest('#taxIdDropdown')) {
            document.getElementById('taxIdDropdown').classList.add('hidden');
        }
        if (!e.target.closest('#customerName') && !e.target.closest('#customerDropdown')) {
            document.getElementById('customerDropdown').classList.add('hidden');
        }
    });
});

function updateCustomerBadge() {
    document.getElementById('customerCountBadge').innerText = customers.length;
}

function generateInvoiceNo() {
    const dateObj = new Date();
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const seq = String(taxRecords.length + 1).padStart(3, '0');
    return `INV-${year}${month}-${seq}`;
}

function calculateVat() {
    const amountInput = parseFloat(document.getElementById('amount').value) || 0;
    const vat = amountInput * 0.07;
    const total = amountInput + vat;

    document.getElementById('calculatedVat').innerText = vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('calculatedTotal').innerText = total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function onTaxIdInput(val) {
    const dropdown = document.getElementById('taxIdDropdown');
    const query = val.trim().toLowerCase();
    if (!query) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = customers.filter(c => c.taxId.toLowerCase().includes(query) || c.name.toLowerCase().includes(query));
    if (matches.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    dropdown.innerHTML = matches.map(c => `
        <div onclick="selectCustomer('${c.taxId}')" class="p-2.5 hover:bg-slate-700/80 cursor-pointer border-b border-slate-700/50 text-xs">
            <div class="font-bold text-indigo-300 font-mono">${escapeHtml(c.taxId)}</div>
            <div class="text-white truncate">${escapeHtml(c.name)}</div>
        </div>
    `).join('');
    dropdown.classList.remove('hidden');
}

function onCustomerNameInput(val) {
    const dropdown = document.getElementById('customerDropdown');
    const query = val.trim().toLowerCase();
    if (!query) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = customers.filter(c => c.name.toLowerCase().includes(query) || c.taxId.includes(query));
    if (matches.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    dropdown.innerHTML = matches.map(c => `
        <div onclick="selectCustomer('${c.taxId}')" class="p-2.5 hover:bg-slate-700/80 cursor-pointer border-b border-slate-700/50 text-xs">
            <div class="font-bold text-white truncate">${escapeHtml(c.name)}</div>
            <div class="text-indigo-400 font-mono text-[11px]">เลขผู้เสียภาษี: ${escapeHtml(c.taxId)}</div>
        </div>
    `).join('');
    dropdown.classList.remove('hidden');
}

function selectCustomer(taxId) {
    const cust = customers.find(c => c.taxId === taxId);
    if (!cust) return;

    document.getElementById('taxId').value = cust.taxId;
    document.getElementById('customerName').value = cust.name;
    document.getElementById('customerAddress').value = cust.address || '';

    document.getElementById('taxIdDropdown').classList.add('hidden');
    document.getElementById('customerDropdown').classList.add('hidden');

    document.getElementById('amount').focus();
}

function handleFormSubmit(event) {
    event.preventDefault();

    const editIndex = parseInt(document.getElementById('editIndex').value);
    const date = document.getElementById('taxDate').value;
    const taxNo = document.getElementById('taxNo').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    const taxId = document.getElementById('taxId').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const vat = amount * 0.07;
    const total = amount + vat;

    const record = { date, taxNo, customerName, taxId, customerAddress, amount, vat, total };

    if (taxId && customerName) {
        const existingIndex = customers.findIndex(c => c.taxId === taxId);
        if (existingIndex >= 0) {
            customers[existingIndex].name = customerName;
            customers[existingIndex].address = customerAddress;
        } else {
            customers.push({ id: Date.now().toString(), name: customerName, taxId, address: customerAddress });
        }
        localStorage.setItem('sales_tax_customers_v3', JSON.stringify(customers));
        updateCustomerBadge();
        renderCustomerTable();
    }

    if (editIndex === -1) {
        taxRecords.unshift(record);
    } else {
        taxRecords[editIndex] = record;
        resetForm();
    }

    saveAndRefresh();

    if (editIndex === -1) {
        const today = document.getElementById('taxDate').value;
        document.getElementById('taxForm').reset();
        document.getElementById('taxDate').value = today;
        document.getElementById('taxNo').value = generateInvoiceNo();
        document.getElementById('taxId').focus();
        calculateVat();
    }
}

function saveAndRefresh() {
    localStorage.setItem('sales_tax_records_v3', JSON.stringify(taxRecords));
    renderTable();
    updateStats();
}

function renderTable() {
    const tbody = document.getElementById('taxTableBody');
    const emptyState = document.getElementById('emptyState');
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    tbody.innerHTML = '';

    const filtered = taxRecords.filter(item => 
        item.taxNo.toLowerCase().includes(searchQuery) || 
        item.customerName.toLowerCase().includes(searchQuery) ||
        item.date.includes(searchQuery) ||
        (item.taxId && item.taxId.includes(searchQuery))
    );

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    filtered.forEach((item) => {
        const originalIndex = taxRecords.indexOf(item);
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-700/40 transition border-b border-slate-700/50";
        
        tr.innerHTML = `
            <td class="py-3 px-4 text-slate-300">${formatDate(item.date)}</td>
            <td class="py-3 px-4 font-medium text-white font-mono">${escapeHtml(item.taxNo)}</td>
            <td class="py-3 px-4 text-slate-200">
                <div class="font-semibold">${escapeHtml(item.customerName)}</div>
                ${item.taxId ? `<div class="text-xs text-slate-400 font-mono">ID: ${escapeHtml(item.taxId)}</div>` : ''}
            </td>
            <td class="py-3 px-4 text-right text-slate-300 font-mono">${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="py-3 px-4 text-right text-emerald-400 font-mono">${item.vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="py-3 px-4 text-right font-semibold text-indigo-400 font-mono">${item.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="previewInvoice(${originalIndex})" title="พิมพ์ใบกำกับภาษี" class="p-1.5 bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-300 rounded-lg transition">พิมพ์</button>
                    <button onclick="editRecord(${originalIndex})" title="แก้ไข" class="p-1.5 bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 rounded-lg transition">แกไข</button>
                    <button onclick="deleteRecord(${originalIndex})" title="ลบ" class="p-1.5 bg-rose-500/25 hover:bg-rose-500/40 text-rose-300 rounded-lg transition">ลบ</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStats() {
    let totalSub = 0, totalVat = 0, grandTotal = 0;
    taxRecords.forEach(item => {
        totalSub += item.amount;
        totalVat += item.vat;
        grandTotal += item.total;
    });

    document.getElementById('statSubtotal').innerHTML = totalSub.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' <span class="text-sm font-normal text-slate-400">บาท</span>';
    document.getElementById('statVat').innerHTML = totalVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' <span class="text-sm font-normal text-slate-400">บาท</span>';
    document.getElementById('statTotal').innerHTML = grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' <span class="text-sm font-normal text-slate-400">บาท</span>';
}

function editRecord(index) {
    const item = taxRecords[index];
    document.getElementById('editIndex').value = index;
    document.getElementById('taxDate').value = item.date;
    document.getElementById('taxNo').value = item.taxNo;
    document.getElementById('customerName').value = item.customerName;
    document.getElementById('taxId').value = item.taxId || '';
    document.getElementById('customerAddress').value = item.customerAddress || '';
    document.getElementById('amount').value = item.amount;
    
    calculateVat();

    document.getElementById('formTitle').innerText = 'แก้ไขรายการภาษีขาย';
    document.getElementById('submitBtn').innerHTML = 'บันทึกการแก้ไข';
    document.getElementById('submitBtn').className = "flex-grow bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition shadow-lg";
    document.getElementById('cancelBtn').classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('editIndex').value = -1;
    document.getElementById('taxForm').reset();
    document.getElementById('taxDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('taxNo').value = generateInvoiceNo();
    calculateVat();

    document.getElementById('formTitle').innerText = 'กรอกข้อมูลด่วน (Fast Entry)';
    document.getElementById('submitBtn').innerHTML = 'บันทึกรายการ (Enter)';
    document.getElementById('submitBtn').className = "flex-grow bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2";
    document.getElementById('cancelBtn').classList.add('hidden');
}

function deleteRecord(index) {
    if (confirm('คุณต้องการลบรายการภาษีขายนี้ใช่หรือไม่?')) {
        taxRecords.splice(index, 1);
        saveAndRefresh();
        resetForm();
    }
}

function openCustomerModal() { document.getElementById('customerModal').classList.remove('hidden'); }
function closeCustomerModal() { document.getElementById('customerModal').classList.add('hidden'); resetCustomerForm(); }
function renderCustomerTable() {
    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';
    customers.forEach((c) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800 transition border-b border-slate-800";
        tr.innerHTML = `
            <td class="py-2.5 px-3 font-semibold text-white">${escapeHtml(c.name)}</td>
            <td class="py-2.5 px-3 font-mono text-indigo-300">${escapeHtml(c.taxId)}</td>
            <td class="py-2.5 px-3 text-slate-300">${escapeHtml(c.address || '-')}</td>
            <td class="py-2.5 px-3 text-center">
                <button onclick="editCustomer('${c.taxId}')" class="text-amber-400 hover:underline mr-2">แก้ไข</button>
                <button onclick="deleteCustomer('${c.taxId}')" class="text-rose-400 hover:underline">ลบ</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
function handleCustomerSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('dirName').value.trim();
    const taxId = document.getElementById('dirTaxId').value.trim();
    const address = document.getElementById('dirAddress').value.trim();

    const existing = customers.find(c => c.taxId === taxId);
    if (existing) {
        existing.name = name;
        existing.address = address;
    } else {
        customers.push({ id: Date.now().toString(), name, taxId, address });
    }

    localStorage.setItem('sales_tax_customers_v3', JSON.stringify(customers));
    updateCustomerBadge();
    renderCustomerTable();
    resetCustomerForm();
}
function editCustomer(taxId) {
    const c = customers.find(item => item.taxId === taxId);
    if (!c) return;
    document.getElementById('dirName').value = c.name;
    document.getElementById('dirTaxId').value = c.taxId;
    document.getElementById('dirTaxId').disabled = true;
    document.getElementById('dirAddress').value = c.address || '';
    document.getElementById('cancelCustomerBtn').classList.remove('hidden');
    document.getElementById('saveCustomerBtn').innerText = 'บันทึกการแก้ไข';
}
function resetCustomerForm() {
    document.getElementById('customerForm').reset();
    document.getElementById('dirTaxId').disabled = false;
    document.getElementById('cancelCustomerBtn').classList.add('hidden');
    document.getElementById('saveCustomerBtn').innerText = 'บันทึกข้อมูลบริษัท';
}
function deleteCustomer(taxId) {
    if (confirm('คุณต้องการลบข้อมูลบริษัทนี้ออกจากฐานข้อมูลใช่หรือไม่?')) {
        customers = customers.filter(c => c.taxId !== taxId);
        localStorage.setItem('sales_tax_customers_v3', JSON.stringify(customers));
        updateCustomerBadge();
        renderCustomerTable();
    }
}

function previewInvoice(index) {
    const item = taxRecords[index];
    const content = document.getElementById('invoicePreviewContent');
    content.innerHTML = `
        <div class="bg-white p-8 rounded-xl shadow-lg text-slate-800 max-w-2xl mx-auto">
            <div class="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                    <h2 class="text-xl font-bold text-slate-900">ใบกำกับภาษี / ใบเสร็จรับเงิน</h2>
                </div>
                <div class="text-right">
                    <p class="text-sm font-semibold text-indigo-600 font-mono">เลขที่: ${escapeHtml(item.taxNo)}</p>
                    <p class="text-xs text-slate-500 mt-0.5">วันที่: ${formatDate(item.date)}</p>
                </div>
            </div>
            <div class="mb-6 grid grid-cols-1 gap-3 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div><span class="block text-[11px] font-semibold text-slate-400 uppercase">นามลูกค้า / ผู้ซื้อ:</span><span class="font-bold text-slate-900">${escapeHtml(item.customerName)}</span></div>
                <div><span class="block text-[11px] font-semibold text-slate-400 uppercase">เลขประจำตัวผู้เสียภาษี:</span><span class="font-medium text-slate-700 font-mono">${item.taxId ? escapeHtml(item.taxId) : '-'}</span></div>
                ${item.customerAddress ? `<div><span class="block text-[11px] font-semibold text-slate-400 uppercase">ที่อยู่:</span><span class="text-slate-700 text-xs">${escapeHtml(item.customerAddress)}</span></div>` : ''}
            </div>
            <table class="w-full text-left mb-6 border-collapse">
                <thead><tr class="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase"><th class="py-2.5">รายการ</th><th class="py-2.5 text-right">จำนวนเงิน (บาท)</th></tr></thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                    <tr><td class="py-3 text-slate-700">ค่าสินค้าและบริการตามใบกำกับภาษีเลขที่ ${escapeHtml(item.taxNo)}</td><td class="py-3 text-right text-slate-700 font-mono">${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                </tbody>
            </table>
            <div class="flex justify-end pt-4 border-t border-slate-200">
                <div class="w-64 space-y-2 text-sm">
                    <div class="flex justify-between text-slate-600"><span>มูลค่าสินค้า / ฐานภาษี:</span><span class="font-mono">${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div class="flex justify-between text-slate-600"><span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span><span class="text-emerald-600 font-medium font-mono">${item.vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div class="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 text-base"><span>ยอดรวมทั้งสิ้น:</span><span class="text-indigo-600 font-mono">${item.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('printModal').classList.remove('hidden');
}
function closePrintModal() { document.getElementById('printModal').classList.add('hidden'); }

function openReportModal() {
    const content = document.getElementById('reportPreviewContent');
    let totalSub = 0, totalVat = 0, grandTotal = 0;
    let rowsHtml = '';

    taxRecords.forEach((item, index) => {
        totalSub += item.amount;
        totalVat += item.vat;
        grandTotal += item.total;
        rowsHtml += `
            <tr class="border-b border-slate-200 text-xs text-slate-800">
                <td class="py-2.5 px-3 text-center">${index + 1}</td>
                <td class="py-2.5 px-3">${formatDate(item.date)}</td>
                <td class="py-2.5 px-3 font-medium font-mono">${escapeHtml(item.taxNo)}</td>
                <td class="py-2.5 px-3">${escapeHtml(item.customerName)}</td>
                <td class="py-2.5 px-3 font-mono">${escapeHtml(item.taxId || '-')}</td>
                <td class="py-2.5 px-3 text-right font-mono">${item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="py-2.5 px-3 text-right text-emerald-700 font-mono">${item.vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="py-2.5 px-3 text-right font-semibold text-indigo-700 font-mono">${item.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
    });

    if (taxRecords.length === 0) {
        rowsHtml = `<tr><td colspan="8" class="py-8 text-center text-slate-400">ยังไม่มีข้อมูลรายการภาษีขาย</td></tr>`;
    }

    content.innerHTML = `
        <div class="bg-white p-8 rounded-xl shadow-lg text-slate-800 mx-auto">
            <div class="text-center border-b border-slate-200 pb-6 mb-6">
                <h2 class="text-xl font-bold text-slate-900">รายงานภาษีขาย (Sales Tax Report)</h2>
            </div>
            <table class="w-full text-left border-collapse mb-6">
                <thead>
                    <tr class="bg-slate-100 border-b border-slate-300 text-[11px] font-semibold text-slate-600 uppercase">
                        <th class="py-2.5 px-3 text-center">ลำดับ</th><th class="py-2.5 px-3">วันที่</th><th class="py-2.5 px-3">เลขที่ใบกำกับ</th><th class="py-2.5 px-3">ชื่อผู้ซื้อ</th><th class="py-2.5 px-3">เลขผู้เสียภาษี</th><th class="py-2.5 px-3 text-right">มูลค่า</th><th class="py-2.5 px-3 text-right">VAT 7%</th><th class="py-2.5 px-3 text-right">รวม</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">${rowsHtml}</tbody>
                <tfoot>
                    <tr class="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td colspan="5" class="py-3 px-3 text-right">รวมทั้งสิ้น:</td>
                        <td class="py-3 px-3 text-right font-mono">${totalSub.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td class="py-3 px-3 text-right text-emerald-700 font-mono">${totalVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td class="py-3 px-3 text-right text-indigo-700 font-mono">${grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    document.getElementById('reportModal').classList.remove('hidden');
}
function closeReportModal() { document.getElementById('reportModal').classList.add('hidden'); }

function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parseInt(parts[0])}`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
