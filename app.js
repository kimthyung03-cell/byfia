const defaultProducts = [
  { id: 1, name: 'Nasi Goreng', category: 'Makanan', price: 18000, stock: 30 },
  { id: 2, name: 'Ayam Geprek', category: 'Makanan', price: 22000, stock: 25 },
  { id: 3, name: 'Mie Goreng', category: 'Makanan', price: 15000, stock: 40 },
  { id: 4, name: 'Es Teh Manis', category: 'Minuman', price: 5000, stock: 80 },
  { id: 5, name: 'Kopi Susu', category: 'Minuman', price: 12000, stock: 35 },
  { id: 6, name: 'Air Mineral', category: 'Minuman', price: 4000, stock: 60 },
  { id: 7, name: 'Kentang Goreng', category: 'Camilan', price: 13000, stock: 20 },
  { id: 8, name: 'Pisang Goreng', category: 'Camilan', price: 10000, stock: 18 }
];
const load = (key, fallback) => JSON.parse(localStorage.getItem(key)) || fallback;
let products = defaultProducts;
let financeRecords = load('kasirfia-finance', { income: [], expense: [] });
let transactions = load('kasirfia-transactions', []);
let cart = [];
let activeCategory = 'Semua';
const $ = (selector) => document.querySelector(selector);
const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0).replace('Rp', 'Rp');
const save = () => { localStorage.setItem('kasirfia-products', JSON.stringify(products)); localStorage.setItem('kasirfia-transactions', JSON.stringify(transactions)); localStorage.setItem('kasirfia-finance', JSON.stringify(financeRecords)); };
const today = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); };

function renderCategories() {
  const categories = ['Semua', ...new Set(products.map((product) => product.category))];
  $('#categoryTabs').innerHTML = categories.map((category) => `<button class="category-tab ${category === activeCategory ? 'active' : ''}" data-category="${category}">${category}</button>`).join('');
  document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { activeCategory = button.dataset.category; renderCategories(); renderProducts(); }));
}
function renderProducts() {
  const query = $('#productSearch').value.toLowerCase();

  const visible = products.filter(
    (product) =>
      (activeCategory === 'Semua' || product.category === activeCategory) &&
      product.name.toLowerCase().includes(query)
  );

  $('#productGrid').innerHTML = visible.length
    ? visible.map((product) => `
      <button class="product-card" data-product-id="${product.id}" ${product.stock < 1 ? 'disabled' : ''}>
        ${product.image
          ? `<div style="width:60px;height:60px;margin-bottom:10px;">
              <img src="${product.image}" alt="${product.name}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
            </div>`
          : `<div class="product-color">${product.name.charAt(0)}</div>`
        }
        <b>${product.name}</b>
        <small>
          ${product.category}
          <span class="stock-label">Stok ${product.stock}</span>
        </small>
        <strong>${formatRupiah(product.price)}</strong>
      </button>
    `).join('')
    : '<div class="no-history">Produk tidak ditemukan.</div>';

  document.querySelectorAll('[data-product-id]').forEach((button) =>
    button.addEventListener('click', () =>
      addToCart(Number(button.dataset.productId))
    )
  );
}
function addToCart(id) {
  const product = products.find((item) => item.id === id); const existing = cart.find((item) => item.id === id);
  if (!product || (existing && existing.quantity >= product.stock)) return showToast('Jumlah melebihi stok yang tersedia.');
  if (existing) existing.quantity += 1; else cart.push({ ...product, quantity: 1 });
  renderCart();
}
function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0); const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  $('#cartCount').textContent = `${count} item`; $('#cartTotal').textContent = formatRupiah(total);
  $('#cartItems').innerHTML = cart.length ? cart.map((item) => `<div class="cart-item"><div><b>${item.name}</b><small>${formatRupiah(item.price)} / item</small><div class="qty-controls"><button data-action="minus" data-id="${item.id}">−</button><span>${item.quantity}</span><button data-action="plus" data-id="${item.id}">+</button></div></div><div class="cart-item-price">${formatRupiah(item.price * item.quantity)}</div></div>`).join('') : '<div class="empty-state"><div class="empty-icon">🛒</div><b>Belum ada pesanan</b><span>Pilih produk di sebelah kiri</span></div>';
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => updateQuantity(Number(button.dataset.id), button.dataset.action)));
  updateChange();
}
function updateQuantity(id, action) { const item = cart.find((entry) => entry.id === id); if (!item) return; if (action === 'plus') addToCart(id); else if (item.quantity > 1) item.quantity -= 1; else cart = cart.filter((entry) => entry.id !== id); renderCart(); }
function updateChange() { const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); const payment = Number($('#paymentAmount').value) || 0; $('#changeAmount').textContent = payment >= total ? formatRupiah(payment - total) : 'Rp0'; }
function renderDashboard() { const date = new Date(); const daily = transactions.filter((transaction) => new Date(transaction.date).toDateString() === date.toDateString()); $('#todayTransactions').textContent = daily.length; $('#todayRevenue').textContent = formatRupiah(daily.reduce((sum, transaction) => sum + transaction.total, 0)); $('#todayLabel').textContent = today(); }
function completePayment() { const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); const payment = Number($('#paymentAmount').value) || 0; if (!cart.length) return showToast('Tambahkan produk terlebih dahulu.'); if (payment < total) return showToast('Uang diterima belum mencukupi.'); const transaction = { id: Date.now(), date: new Date().toISOString(), items: cart.map((item) => ({ name: item.name, quantity: item.quantity })), total, payment, change: payment - total }; transactions.unshift(transaction); cart.forEach((item) => { const product = products.find((entry) => entry.id === item.id); if (product) product.stock -= item.quantity; }); save(); cart = []; $('#paymentAmount').value = ''; renderAll(); showToast('Transaksi berhasil disimpan.'); }
function renderProductTable() { const query = $('#manageSearch').value.toLowerCase(); const visible = products.filter((product) => product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query)); $('#productCount').textContent = `${products.length} produk terdaftar`; $('#productTableBody').innerHTML = visible.map((product) => `<tr><td><b>${product.name}</b><small>ID #${product.id}</small></td><td>${product.category}</td><td><b>${formatRupiah(product.price)}</b></td><td>${product.stock}</td><td><div class="table-actions"><button class="icon-button" title="Edit" data-edit="${product.id}">✎</button><button class="icon-button delete-button" title="Hapus" data-delete="${product.id}">×</button></div></td></tr>`).join(''); document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => openProductModal(Number(button.dataset.edit)))); document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteProduct(Number(button.dataset.delete)))); }
function renderHistory() { const revenue = transactions.reduce((sum, transaction) => sum + transaction.total, 0); $('#historyCount').textContent = transactions.length; $('#historyRevenue').textContent = formatRupiah(revenue); $('#historyList').innerHTML = transactions.length ? transactions.map((transaction) => `<div class="history-row"><div><b>Transaksi #${String(transaction.id).slice(-6)}</b><small>${new Date(transaction.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</small></div><span>${transaction.items.map((item) => `${item.name} (${item.quantity})`).join(', ')}</span><strong>${formatRupiah(transaction.total)}</strong></div>`).join('') : '<div class="no-history">Belum ada riwayat transaksi.</div>'; }
function openProductModal(id = null) { const product = products.find((item) => item.id === id); $('#modalTitle').textContent = product ? 'Edit produk' : 'Tambah produk'; $('#productId').value = product?.id || ''; $('#productName').value = product?.name || ''; $('#productCategory').value = product?.category || ''; $('#productPrice').value = product?.price || ''; $('#productStock').value = product?.stock ?? ''; $('#productModal').classList.add('open'); $('#productName').focus(); }
function closeProductModal() { $('#productModal').classList.remove('open'); }
function submitProduct(event) {
  event.preventDefault();

  const id = Number($('#productId').value);
  const file = $('#productImage').files[0];

  const data = {
    name: $('#productName').value.trim(),
    category: $('#productCategory').value.trim(),
    price: Number($('#productPrice').value),
    stock: Number($('#productStock').value)
  };

  function finishSave(image = '') {
    if (id) {
      products = products.map((product) =>
        product.id === id
          ? { ...product, ...data, ...(image ? { image } : {}) }
          : product
      );
    } else {
      products.push({
        ...data,
        id: Date.now(),
        image
      });
    }

    save();
    closeProductModal();
    renderAll();

    showToast(
      id
        ? 'Produk berhasil diperbarui.'
        : 'Produk berhasil ditambahkan.'
    );
  }

  if (file) {
    const reader = new FileReader();

    reader.onload = function(event) {
      finishSave(event.target.result);
    };

    reader.readAsDataURL(file);
  } else {
    finishSave();
  }
}
function addIncome() { const description = $('#incomeDescription').value.trim(); const amount = Number($('#incomeAmount').value.replace(/\./g, '')); if (!description || !amount) return showToast('Isi deskripsi dan jumlah pemasukan.'); financeRecords.income.push({ id: Date.now(), description, amount }); save(); renderFinance(); $('#incomeDescription').value = ''; $('#incomeAmount').value = ''; showToast('Pemasukan berhasil dicatat.'); }
function addExpense() { const description = $('#expenseDescription').value.trim(); const amount = Number($('#expenseAmount').value.replace(/\./g, '')); if (!description || !amount) return showToast('Isi deskripsi dan jumlah pengeluaran.'); financeRecords.expense.push({ id: Date.now(), description, amount }); save(); renderFinance(); $('#expenseDescription').value = ''; $('#expenseAmount').value = ''; showToast('Pengeluaran berhasil dicatat.'); }
function renderFinance() {
  const totalIncome = financeRecords.income.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = financeRecords.expense.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalIncome - totalExpense;

let businessProfile = load('kasirfia-business-profile', {
  name: '',
  logo: ''
});

function saveBusinessProfile() {
  const name = $('#businessName').value.trim();
  const file = $('#businessLogo').files[0];

  if (!name) {
    showToast('Isi nama usaha terlebih dahulu.');
    return;
  }

  if (file) {
    const reader = new FileReader();

    reader.onload = function(event) {
      businessProfile.name = name;
      businessProfile.logo = event.target.result;

      localStorage.setItem(
        'kasirfia-business-profile',
        JSON.stringify(businessProfile)
      );

      renderBusinessProfile();
      showToast('Profil usaha berhasil disimpan.');
    };

    reader.readAsDataURL(file);
  } else {
    businessProfile.name = name;

    localStorage.setItem(
      'kasirfia-business-profile',
      JSON.stringify(businessProfile)
    );

    renderBusinessProfile();
    showToast('Profil usaha berhasil disimpan.');
  }
}

function renderBusinessProfile() {
  $('#businessName').value = businessProfile.name || '';
const businessNameDisplay = $('#businessNameDisplay');
if (businessNameDisplay) {
  businessNameDisplay.textContent = businessProfile.name || 'KASIRFIA';
}
  if (businessProfile.logo) {
    $('#businessLogoPreview').innerHTML =
      '<img src="' + businessProfile.logo + '" style="max-width:150px; max-height:150px; object-fit:contain;">';
  } else {
    $('#businessLogoPreview').innerHTML = '';
  }
}
  $('#totalIncome').textContent = formatRupiah(totalIncome);
  $('#totalExpense').textContent = formatRupiah(totalExpense);
  $('#netProfit').textContent = formatRupiah(netProfit);

  const records = [
    ...financeRecords.income.map((item) => ({
      ...item,
      type: 'Pemasukan'
    })),
    ...financeRecords.expense.map((item) => ({
      ...item,
      type: 'Pengeluaran'
    }))
  ].sort((a, b) => b.id - a.id);

  $('#financeHistory').innerHTML = records.length
    ? records.map((item) => `
      <div class="history-row">
        <div>
          <b>${item.type}</b>
          <small>${new Date(item.id).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}</small>
        </div>

        <span>${item.description}</span>

        <strong>
          ${item.type === 'Pemasukan' ? '+' : '-'}${formatRupiah(item.amount)}
        </strong>

        <button class="outline-button finance-edit-button" data-finance-id="${item.id}" data-finance-type="${item.type}">
          Edit
        </button>
      </div>
    `).join('')
    : '<div class="no-history">Belum ada riwayat keuangan.</div>';

  document.querySelectorAll('.finance-edit-button').forEach((button) => {
    button.addEventListener('click', () => {
      editFinance(
        Number(button.dataset.financeId),
        button.dataset.financeType
      );
    });
  });
}
function editFinance(id, type) {
  const list = type === 'Pemasukan'
    ? financeRecords.income
    : financeRecords.expense;

  const item = list.find((record) => record.id === id);

  if (!item) return;

  const newDescription = prompt(
    'Edit keterangan:',
    item.description
  );

  if (newDescription === null) return;

  const newAmount = prompt(
    'Edit jumlah:',
    item.amount.toLocaleString('id-ID')
  );

  if (newAmount === null) return;

  const amount = Number(newAmount.replace(/\./g, ''));

  if (!newDescription.trim() || !amount) {
    showToast('Data tidak valid.');
    return;
  }

  item.description = newDescription.trim();
  item.amount = amount;

  save();
  renderFinance();

  showToast(type + ' berhasil diperbarui.');
}
function deleteProduct(id) { const product = products.find((item) => item.id === id); if (product && confirm(`Hapus ${product.name}?`)) { products = products.filter((item) => item.id !== id); save(); renderAll(); showToast('Produk dihapus.'); } }
function switchView(view) { document.querySelectorAll('.view').forEach((section) => section.classList.remove('active')); $(`#${view}View`).classList.add('active'); document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === view)); const titles = { kasir: ['TRANSAKSI BARU', 'Kasir'], produk: ['INVENTARIS', 'Produk'], riwayat: ['CATATAN PENJUALAN', 'Riwayat transaksi'], keuangan: ['CATATAN KEUANGAN', 'Keuangan'] }; $('#pageEyebrow').textContent = titles[view][0]; $('#pageTitle').textContent = titles[view][1]; $('#sidebar')?.classList.remove('open'); }
function renderAll() { renderCategories(); renderProducts(); renderCart(); renderDashboard(); renderProductTable(); renderHistory(); renderFinance(); renderBusinessProfile(); }

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
$('#productSearch').addEventListener('input', renderProducts); $('#manageSearch').addEventListener('input', renderProductTable); $('#paymentAmount').addEventListener('input', updateChange); $('#completePayment').addEventListener('click', completePayment); $('#clearCart').addEventListener('click', () => { cart = []; renderCart(); }); $('#addProductButton').addEventListener('click', () => openProductModal()); $('#closeModal').addEventListener('click', closeProductModal); $('#cancelModal').addEventListener('click', closeProductModal); $('#productForm').addEventListener('submit', submitProduct); $('#clearHistory').addEventListener('click', () => { if (transactions.length && confirm('Hapus semua riwayat transaksi?')) { transactions = []; save(); renderAll(); showToast('Riwayat dihapus.'); } }); $('#mobileMenu').addEventListener('click', () => $('.sidebar').classList.toggle('open')); $('#productModal').addEventListener('click', (event) => { if (event.target.id === 'productModal') closeProductModal(); }); $('#addIncomeButton').addEventListener('click', addIncome); $('#addExpenseButton').addEventListener('click', addExpense);$('#saveBusinessProfile').addEventListener('click', saveBusinessProfile);
renderAll();
