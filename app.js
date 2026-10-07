// ข้อมูลตั้งต้นหัวรายงาน
const DEFAULT_CONFIG = {
    reportMonth: 'สิงหาคม ปีพ.ศ. 2569',
    taxPayer: 'นางมะลิวัลย์ วินัยโกศล',
    taxId: '4321000003922',
    branch: 'อุบลพาณิช'
};

let headerConfig = JSON.parse(localStorage.getItem('rd_tax_header_config')) || DEFAULT_CONFIG;
let taxRecords = JSON.parse(localStorage.getItem('rd_tax_sales_records')) || [];

// ฐานข้อมูลคู่ค้า (จดจำอัตโนมัติจากหน้าฟอร์ม และจัดการผ่าน Modal ได้)
let customerDirectory = JSON.parse(localStorage.getItem('rd_tax_customers')) || [
    { name: 'หจก. อุบล เซ็นทรัลสปอร์ต', taxId: '0343526000091' },
    { name: 'บ.ไอ.ที.วัน จำกัด', taxId: '0105526007081' }
];

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderUI();
    updateCustomerBadge();
    renderCustomerTable();
    resetForm();
    renderTable();

    // ปิด Dropdown เมื่อคลิกนอกพื้นที่
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#customerName') && !e.target.closest('#customerDropdown')) {
            document.getElementById('customerDropdown')?.classList.add('hidden');
        }
        if (!e.target.closest('#customerTaxId') && !e.target.closest('#taxIdDropdown')) {
            document.getElementById('taxIdDropdown')?.classList.add('hidden');
        }
    });
});

// อัปเดตแสดงผลหัวรายงาน
function updateHeaderUI() {
    document.getElementById('displayReportMonth').innerText = headerConfig.reportMonth;
    document.getElementById('displayTaxPayer').innerText = headerConfig.taxPayer;
    document.getElementById('displayTaxId').innerText = headerConfig.taxId;
    document.getElementById('displayBranch').innerText = headerConfig.branch;
}

// อัปเดตจำนวนบริษัทบนปุ่ม Header
function updateCustomerBadge() {
    const badge = document.getElementById('customerCountBadge');
    if (badge) badge.innerText = customerDirectory.length;
}

// Modal ตั้งค่าหัวรายงาน
function openConfigModal() {
    document.getElementById('cfgReportMonth').value = headerConfig.reportMonth;
    document.getElementById('cfgTaxPayer').value = headerConfig.taxPayer;
    document.getElementById('cfgTaxId').value = headerConfig.taxId;
    document.getElementById('cfgBranch').value = headerConfig.branch;
    document.getElementById('configModal').classList.remove('hidden');
}

function closeConfigModal() {
    document.getElementById('configModal').classList.add('hidden');
}

function handleConfigSubmit(e) {
    e.preventDefault();
    headerConfig = {
        reportMonth: document.getElementById('cfgReportMonth').value.trim(),
        taxPayer: document.getElementById('cfgTaxPayer').value.trim(),
        taxId: document.getElementById('cfgTaxId').value.trim(),
        branch: document.getElementById('cfgBranch').value.trim()
    };
    localStorage.setItem('rd_tax_header_config', JSON.stringify(headerConfig));
    updateHeaderUI();
    closeConfigModal();
}

// ======================== จัดการฐานข้อมูลคู่ค้า (Modal) ========================
function openCustomerModal() {
    document.getElementById('customerModal').classList.remove('hidden');
}

function closeCustomerModal() {
    document.getElementById('customerModal').classList.add('hidden');
    resetCustomerForm();
}

function renderCustomerTable() {
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    customerDirectory.forEach((c) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800 transition border-b border-slate-800";
        tr.innerHTML = `
            <td class="py-2 px-3 font-medium text-white">${escapeHtml(c.name)}</td>
            <td class="py-2 px-3 font-mono text-indigo-300">${escapeHtml(c.taxId)}</td>
            <td class="py-2 px-3 text-center">
                <button onclick="editCustomer('${escapeHtml(c.taxId)}')" class="text-amber-400 hover:underline mr-2 text-xs">แก้ไข</button>
                <button onclick="deleteCustomer('${escapeHtml(c.taxId)}')" class="text-rose-400 hover:underline text-xs">ลบ</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function handleCustomerSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('dirName').value.trim();
    const taxId = document.getElementById('dirTaxId').value.trim();

    const idx = customerDirectory.findIndex(c => c.taxId === taxId);
    if (idx >= 0) {
        customerDirectory[idx].name = name;
    } else {
        customerDirectory.push({ name, taxId });
    }

    localStorage.setItem('rd_tax_customers', JSON.stringify(customerDirectory));
    updateCustomerBadge();
    renderCustomerTable();
    resetCustomerForm();
}

function editCustomer(taxId) {
    const c = customerDirectory.find(item => item.taxId === taxId);
    if (!c) return;
    document.getElementById('dirName').value = c.name;
    document.getElementById('dirTaxId').value = c.taxId;
    document.getElementById('dirTaxId').disabled = true;
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
    if (confirm('คุณต้องการลบข้อมูลลูกค้ารายนี้ออกจากฐานข้อมูลหรือไม่?')) {
        customerDirectory = customerDirectory.filter(c => c.taxId !== taxId);
        localStorage.setItem('rd_tax_customers', JSON.stringify(customerDirectory));
        updateCustomerBadge();
        renderCustomerTable();
    }
}

// ======================== ระบบ Auto-complete ========================
function onCustomerNameInput(val) {
    const dropdown = document.getElementById('customerDropdown');
    const q = val.trim().toLowerCase();
    if (!q) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = customerDirectory.filter(c => 
        c.name.toLowerCase().includes(q) || c.taxId.includes(q)
    );

    if (matches.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    dropdown.innerHTML = matches.map(c => `
        <div onclick="selectCustomer('${escapeHtml(c.taxId)}', '${escapeHtml(c.name)}')" 
             class="p-2 hover:bg-slate-700/80 cursor-pointer border-b border-slate-700/50 text-xs">
            <div class="font-bold text-white truncate">${escapeHtml(c.name)}</div>
            <div class="text-indigo-400 font-mono text-[11px]">${escapeHtml(c.taxId)}</div>
        </div>
    `).join('');
    dropdown.classList.remove('hidden');
}

function onTaxIdInput(val) {
    const dropdown = document.getElementById('taxIdDropdown');
    const q = val.trim().toLowerCase();
    if (!q) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = customerDirectory.filter(c => 
        c.taxId.includes(q) || c.name.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    dropdown.innerHTML = matches.map(c => `
        <div onclick="selectCustomer('${escapeHtml(c.taxId)}', '${escapeHtml(c.name)}')" 
             class="p-2 hover:bg-slate-700/80 cursor-pointer border-b border-slate-700/50 text-xs">
            <div class="font-bold text-indigo-300 font-mono">${escapeHtml(c.taxId)}</div>
            <div class="text-white truncate text-[11px]">${escapeHtml(c.name)}</div>
        </div>
    `).join('');
    dropdown.classList.remove('hidden');
}

function selectCustomer(taxId, name) {
    document.getElementById('customerTaxId').value = taxId;
    document.getElementById('customerName').value = name;
    
    document.getElementById('customerDropdown').classList.add('hidden');
    document.getElementById('taxIdDropdown').classList.add('hidden');
    
    document.getElementById('amount').focus();
}

function calculateVat() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const vat = Math.round((amount * 0.07 + Number.EPSILON) * 100) / 100;
    document.getElementById('calculatedVat').innerText = vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ======================== บันทึกรายการภาษี & จำคู่ค้าใหม่อัตโนมัติ ========================
function handleFormSubmit(e) {
    e.preventDefault();
    const editIndex = parseInt(document.getElementById('editIndex').value);
    const date = document.getElementById('taxDate').value;
    const taxNo = document.getElementById('taxNo').value.trim();
    const customerTaxId = document.getElementById('customerTaxId').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const vat = Math.round((amount * 0.07 + Number.EPSILON) * 100) / 100;

    // ระบบจดจำคู่ค้าใหม่อัตโนมัติ (Auto-Save to Customer Directory)
    if (customerName && customerTaxId) {
        const existIdx = customerDirectory.findIndex(c => c.taxId === customerTaxId);
        if (existIdx >= 0) {
            customerDirectory[existIdx].name = customerName;
        } else {
            customerDirectory.push({ name: customerName, taxId: customerTaxId });
        }
        localStorage.setItem('rd_tax_customers', JSON.stringify(customerDirectory));
        updateCustomerBadge();
        renderCustomerTable();
    }

    const record = { date, taxNo, customerTaxId, customerName, amount, vat };

    if (editIndex === -1) {
        taxRecords.push(record);
    } else {
        taxRecords[editIndex] = record;
        resetForm();
    }

    localStorage.setItem('rd_tax_sales_records', JSON.stringify(taxRecords));
    renderTable();

    if (editIndex === -1) {
        document.getElementById('taxNo').value = '';
        document.getElementById('customerTaxId').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('amount').value = '';
        calculateVat();
        document.getElementById('taxNo').focus();
    }
}

function resetForm() {
    document.getElementById('editIndex').value = -1;
    document.getElementById('taxForm').reset();
    document.getElementById('taxDate').value = new Date().toISOString().split('T')[0];
    calculateVat();
    document.getElementById('formTitle').innerHTML = '✍️ คีย์ข้อมูลแบบบรรทัดเอกสาร (Fast Horizontal Entry)';
    document.getElementById('submitBtn').innerText = 'บันทึก';
    document.getElementById('cancelBtn').classList.add('hidden');
}

function renderTable() {
    const tbody = document.getElementById('taxTableBody');
    const emptyState = document.getElementById('emptyState');
    const q = (document.getElementById('searchInput').value || '').toLowerCase();
    tbody.innerHTML = '';

    const filtered = taxRecords.filter(r => 
        r.taxNo.toLowerCase().includes(q) || 
        r.customerName.toLowerCase().includes(q) || 
        (r.customerTaxId && r.customerTaxId.includes(q))
    );

    let sumAmount = 0, sumVat = 0;
    filtered.forEach(r => {
        sumAmount += r.amount;
        sumVat += r.vat;
    });

    document.getElementById('statSubtotal').innerText = sumAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
    document.getElementById('statVat').innerText = sumVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    filtered.forEach((r, idx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-700/40 border-b border-slate-700/50";
        tr.innerHTML = `
            <td class="py-2.5 px-3 text-slate-300 font-mono">${formatThaiDate(r.date)}</td>
            <td class="py-2.5 px-3 text-white font-medium font-mono">${escapeHtml(r.taxNo)}</td>
            <td class="py-2.5 px-3">${escapeHtml(r.customerName)}</td>
            <td class="py-2.5 px-3 text-indigo-300 font-mono">${escapeHtml(r.customerTaxId || '-')}</td>
            <td class="py-2.5 px-3 text-right font-medium text-slate-200 font-mono">${r.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="py-2.5 px-3 text-right text-emerald-400 font-medium font-mono">${r.vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="py-2.5 px-3 text-center">
                <button onclick="editRecord(${idx})" class="text-amber-400 hover:underline mr-2 text-[11px]">แก้ไข</button>
                <button onclick="deleteRecord(${idx})" class="text-rose-400 hover:underline text-[11px]">ลบ</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editRecord(idx) {
    const r = taxRecords[idx];
    document.getElementById('editIndex').value = idx;
    document.getElementById('taxDate').value = r.date;
    document.getElementById('taxNo').value = r.taxNo;
    document.getElementById('customerTaxId').value = r.customerTaxId || '';
    document.getElementById('customerName').value = r.customerName;
    document.getElementById('amount').value = r.amount;
    calculateVat();

    document.getElementById('formTitle').innerHTML = `✍️ กำลังแก้ไขรายการ: <span class="text-amber-400 font-mono">${escapeHtml(r.taxNo)}</span>`;
    document.getElementById('submitBtn').innerText = 'บันทึกแก้ไข';
    document.getElementById('cancelBtn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteRecord(idx) {
    if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
        taxRecords.splice(idx, 1);
        localStorage.setItem('rd_tax_sales_records', JSON.stringify(taxRecords));
        renderTable();
        resetForm();
    }
}

// ล้างข้อมูลทั้งหมดในตาราง (พร้อมยืนยัน 2 ชั้น)
function clearAllRecords() {
    if (taxRecords.length === 0) {
        alert('ขณะนี้ไม่มีรายการข้อมูลภาษีให้ลบ');
        return;
    }

    const firstConfirm = confirm(`คุณต้องการลบข้อมูลรายการภาษีซื้อทั้งหมดจำนวน ${taxRecords.length} รายการ ใช่หรือไม่?`);
    if (!firstConfirm) return;

    const secondConfirm = confirm('⚠️ ยืนยันอีกครั้ง! การลบนี้จะไม่สามารถกู้คืนข้อมูลกลับมาได้ คุณแน่ใจหรือไม่ว่าต้องการลบทั้งหมด?');
    if (!secondConfirm) return;

    taxRecords = [];
    localStorage.setItem('rd_tax_sales_records', JSON.stringify(taxRecords));

    resetForm();
    renderTable();
    alert('ลบข้อมูลรายการภาษีทั้งหมดเรียบร้อยแล้ว');
}

// ======================== รายงานสำหรับพิมพ์ (แบบสรรพากร) ========================
function openReportModal() {
    const content = document.getElementById('reportPreviewContent');
    let totalAmount = 0, totalVat = 0;
    let rowsHtml = '';

    taxRecords.forEach((r) => {
        totalAmount += r.amount;
        totalVat += r.vat;
        rowsHtml += `
            <tr class="border-b border-black text-[12px] leading-tight">
                <td class="border-r border-black py-1 px-1.5 text-center font-mono">${formatThaiDate(r.date)}</td>
                <td class="border-r border-black py-1 px-1.5 text-center font-mono">${escapeHtml(r.taxNo)}</td>
                <td class="border-r border-black py-1 px-2">${escapeHtml(r.customerName)}</td>
                <td class="border-r border-black py-1 px-1.5 text-center font-mono">${escapeHtml(r.customerTaxId || '')}</td>
                <td class="border-r border-black py-1 px-2 text-right font-mono">${r.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="py-1 px-2 text-right font-mono">${r.vat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `;
    });

    content.innerHTML = `
        <div class="bg-white text-black p-6 rounded shadow font-sarabun max-w-4xl mx-auto">
            <div class="text-center mb-4 leading-normal">
                <h2 class="text-base font-bold">รายงานภาษีซื้อ</h2>
                <p class="text-xs">เดือนภาษี ${escapeHtml(headerConfig.reportMonth)}</p>
                <p class="text-xs">ชื่อผู้ประกอบการ ${escapeHtml(headerConfig.taxPayer)}</p>
                <p class="text-xs">เลขประจำตัวผู้เสียภาษี ${escapeHtml(headerConfig.taxId)}</p>
                <p class="text-xs">ชื่อสถานประกอบการ ${escapeHtml(headerConfig.branch)}</p>
            </div>

            <table class="w-full border-collapse border border-black text-xs">
                <thead>
                    <tr class="border-b border-black text-center font-semibold bg-gray-50">
                        <th colspan="2" class="border-r border-black py-1">ใบกำกับภาษี</th>
                        <th rowspan="2" class="border-r border-black py-1 px-2">ชื่อผู้ขายสินค้า/ผู้ให้บริการ</th>
                        <th rowspan="2" class="border-r border-black py-1 px-2">เลขประจำตัวผู้เสียภาษีอากร<br>ของผู้ขายสินค้า</th>
                        <th rowspan="2" class="border-r border-black py-1 px-2 text-right">มูลค่าสินค้า<br>หรือบริการ</th>
                        <th rowspan="2" class="py-1 px-2 text-right">จำนวนเงิน<br>ภาษีมูลค่าเพิ่ม</th>
                    </tr>
                    <tr class="border-b border-black text-center font-semibold bg-gray-50">
                        <th class="border-r border-black py-1 px-1.5 w-24">วัน เดือน ปี</th>
                        <th class="border-r border-black py-1 px-1.5 w-32">เล่มที่/เลขที่</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr class="border-t-2 border-black font-bold">
                        <td colspan="4" class="border-r border-black py-1.5 px-3 text-center">รวมหน้าที่ 1</td>
                        <td class="border-r border-black py-1.5 px-2 text-right font-mono">${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td class="py-1.5 px-2 text-right font-mono">${totalVat.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    document.getElementById('reportModal').classList.remove('hidden');
}

function closeReportModal() {
    document.getElementById('reportModal').classList.add('hidden');
}

function printReport() {
    const printContent = document.getElementById('reportPreviewContent').innerHTML;
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = printContent;
    window.print();
    printArea.innerHTML = '';
}

function formatThaiDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const thaiYear = parseInt(y) + 543;
    return `${d}/${m}/${thaiYear}`;
}

function escapeHtml(t) {
    if (!t) return '';
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}