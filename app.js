if (localStorage.getItem("loggedIn") !== "true") {
  window.location.href = "login.html";
}

const codeReader = new ZXing.BrowserMultiFormatReader();
let scannerControls = null;
let scanning = false;

const appState = {
  stockFilters: {
    query: "",
    minPrice: "",
    maxPrice: "",
    stockStatus: "all"
  },
  salesFilters: {
    customer: "",
    phone: "",
    medicine: "",
    minTotal: "",
    maxTotal: ""
  }
};

const medicineCategories = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Ointment",
  "Drops",
  "Inhaler",
  "Cream",
  "Powder",
  "Equipment",
  "Other"
];

function setContent(html) {
  document.getElementById("content").innerHTML = html;
}

function readMeds() {
  return JSON.parse(localStorage.getItem("meds")) || [];
}

function saveMeds(data) {
  localStorage.setItem("meds", JSON.stringify(data));
}

function readSales() {
  return JSON.parse(localStorage.getItem("sales")) || [];
}

function saveSales(data) {
  localStorage.setItem("sales", JSON.stringify(data));
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function parseExpiryDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysUntilExpiry(expiry) {
  const expiryDate = parseExpiryDate(expiry);
  if (!expiryDate) {
    return null;
  }

  const diffMs = expiryDate.getTime() - startOfToday().getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(expiry) {
  const days = getDaysUntilExpiry(expiry);

  if (days === null) {
    return { label: "-", tone: "", days: null };
  }

  if (days < 0) {
    return { label: "Expired", tone: "expired", days };
  }

  if (days <= 5) {
    return { label: `Expires in ${days} day${days === 1 ? "" : "s"}`, tone: "warning", days };
  }

  return { label: expiry, tone: "ok", days };
}

function getExpiringMedicines() {
  return readMeds()
    .map((med) => ({ ...med, expiryInfo: getExpiryStatus(med.expiry) }))
    .filter((med) => med.expiryInfo.days !== null && med.expiryInfo.days <= 5)
    .sort((a, b) => a.expiryInfo.days - b.expiryInfo.days);
}

function notifyExpiryAlerts() {
  const expiringMeds = getExpiringMedicines();
  if (!expiringMeds.length) {
    return;
  }

  const alertKey = `expiry-alert-${todayKey()}`;
  if (localStorage.getItem(alertKey) === "shown") {
    return;
  }

  const summary = expiringMeds
    .slice(0, 3)
    .map((med) => `${med.name} (${med.expiryInfo.label})`)
    .join(", ");

  alert(`Expiry alert: ${summary}${expiringMeds.length > 3 ? " and more." : "."}`);
  localStorage.setItem(alertKey, "shown");
}

function todayKey() {
  return new Date().toLocaleDateString("en-IN");
}

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function updateActiveNav(view) {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function renderDashboard() {
  stopScanner();
  updateActiveNav("dashboard");

  const meds = readMeds();
  const sales = readSales();
  const expiringMeds = getExpiringMedicines();
  const lowStockCount = meds.filter((med) => Number(med.qty) <= 10).length;
  const stockValue = meds.reduce((sum, med) => sum + Number(med.qty) * Number(med.price), 0);
  const todayIncome = sales
    .filter((sale) => new Date(sale.createdAt).toLocaleDateString("en-IN") === todayKey())
    .reduce((sum, sale) => sum + Number(sale.total), 0);
  const monthIncome = sales
    .filter((sale) => {
      const date = new Date(sale.createdAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === monthKey();
    })
    .reduce((sum, sale) => sum + Number(sale.total), 0);

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const lowStock = meds
    .filter((med) => Number(med.qty) <= 10)
    .sort((a, b) => Number(a.qty) - Number(b.qty))
    .slice(0, 5);

  setContent(`
    <section class="hero">
      <div>
        <p class="eyebrow">Pharmacy operations</p>
        <h2>Run stock, billing, customer lookup, and income tracking from one dashboard.</h2>
        <p class="hero-copy">Use the quick actions below to add stock, generate bills, track low inventory, and search customers by name or phone number.</p>
      </div>
      <div class="hero-actions">
        <button class="btn-primary" onclick="renderAddStock()">Add New Stock</button>
        <button class="btn-secondary" onclick="renderBillingEntry()">Create Bill</button>
      </div>
    </section>

    ${expiringMeds.length ? `
      <section class="panel card-section alert-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">Expiry alert</p>
            <h3>${expiringMeds.length} medicine${expiringMeds.length === 1 ? "" : "s"} need attention within 5 days</h3>
          </div>
          <span class="badge warning">Check stock</span>
        </div>
        <div class="alert-list">
          ${expiringMeds.slice(0, 5).map((med) => `
            <div class="alert-item">
              <strong>${escapeHtml(med.name)}</strong>
              <span>${escapeHtml(med.barcode)}</span>
              <span>${escapeHtml(med.expiry || "-")}</span>
              <span class="expiry-badge ${med.expiryInfo.tone}">${escapeHtml(med.expiryInfo.label)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    ` : ""}

    <section class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">Total Medicines</span>
        <strong>${meds.length}</strong>
        <span class="stat-meta">Unique stock items in inventory</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Stock Value</span>
        <strong>${formatCurrency(stockValue)}</strong>
        <span class="stat-meta">Based on current quantity x selling price</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Today's Income</span>
        <strong>${formatCurrency(todayIncome)}</strong>
        <span class="stat-meta">Sales recorded on ${todayKey()}</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">This Month</span>
        <strong>${formatCurrency(monthIncome)}</strong>
        <span class="stat-meta">${sales.length} total bills generated</span>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="panel card-section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Attention needed</p>
            <h3>Low stock medicines</h3>
          </div>
          <span class="badge">${lowStockCount} items</span>
        </div>
        ${lowStock.length ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Barcode</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${lowStock.map((med) => `
                  <tr>
                    <td>${escapeHtml(med.name)}</td>
                    <td>${escapeHtml(med.barcode)}</td>
                    <td><span class="qty-badge low">${escapeHtml(med.qty)}</span></td>
                    <td>${formatCurrency(med.price)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : `<p class="empty-state">No low stock items right now.</p>`}
      </article>

      <article class="panel card-section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Recent activity</p>
            <h3>Latest sales</h3>
          </div>
          <button class="btn-secondary small" onclick="renderSalesHistory()">Open history</button>
        </div>
        ${recentSales.length ? recentSales.map((sale) => `
          <div class="timeline-item">
            <div>
              <strong>${escapeHtml(sale.customerName)}</strong>
              <p>${escapeHtml(sale.medicine)} | ${escapeHtml(sale.phone || "No phone")}</p>
            </div>
            <div class="timeline-meta">
              <strong>${formatCurrency(sale.total)}</strong>
              <span>${formatDate(sale.createdAt)}</span>
            </div>
          </div>
        `).join("") : `<p class="empty-state">No bills generated yet.</p>`}
      </article>
    </section>
  `);
}

function renderAddStock(scannedCode = "") {
  stopScanner();
  updateActiveNav("stock");

  setContent(`
    <section class="panel card-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Inventory</p>
          <h3>Add or update stock</h3>
        </div>
        <button class="btn-secondary small" onclick="startScan('add')">Scan Barcode</button>
      </div>

      <div class="form-grid">
        <label>
          <span>Barcode</span>
          <input id="barcode" placeholder="Enter or scan barcode" value="${escapeHtml(scannedCode)}">
        </label>
        <label>
          <span>Medicine Name</span>
          <input id="name" placeholder="Paracetamol 650" />
        </label>
        <label>
          <span>Category</span>
          <select id="category">
            <option value="">Select category</option>
            ${medicineCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Manufacturer</span>
          <input id="manufacturer" placeholder="Sun Pharma" />
        </label>
        <label>
          <span>Quantity</span>
          <input id="qty" type="number" min="1" placeholder="10" />
        </label>
        <label>
          <span>Price</span>
          <input id="price" type="number" min="1" step="0.01" placeholder="45" />
        </label>
        <label>
          <span>Expiry Date</span>
          <input id="expiry" type="date" />
        </label>
      </div>

      <div class="action-row">
        <button class="btn-primary" onclick="saveStock()">Save Stock</button>
        <button class="btn-secondary" onclick="renderInventory()">View Inventory</button>
      </div>
    </section>
  `);
}

function saveStock() {
  const barcode = document.getElementById("barcode").value.trim();
  const name = document.getElementById("name").value.trim();
  const category = document.getElementById("category").value.trim();
  const manufacturer = document.getElementById("manufacturer").value.trim();
  const qty = Number(document.getElementById("qty").value);
  const price = Number(document.getElementById("price").value);
  const expiry = document.getElementById("expiry").value;

  if (!barcode || !name || !category || !manufacturer || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
    alert("Enter valid medicine details before saving.");
    return;
  }

  const meds = readMeds();
  const existing = meds.find((med) => med.barcode === barcode);

  if (existing) {
    existing.name = name;
    existing.category = category;
    existing.manufacturer = manufacturer;
    existing.price = price;
    existing.expiry = expiry;
    existing.qty = Number(existing.qty) + qty;
    existing.updatedAt = new Date().toISOString();
  } else {
    meds.push({
      barcode,
      name,
      category,
      manufacturer,
      qty,
      price,
      expiry,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  saveMeds(meds);
  alert("Stock saved successfully.");
  renderInventory();
}

function getFilteredMeds() {
  const meds = readMeds();
  const { query, minPrice, maxPrice, stockStatus } = appState.stockFilters;
  const normalizedQuery = query.trim().toLowerCase();

  return meds.filter((med) => {
    const medPrice = Number(med.price);
    const medQty = Number(med.qty);
    const matchesQuery = !normalizedQuery || [med.name, med.barcode, med.category, med.manufacturer]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    const matchesMin = !minPrice || medPrice >= Number(minPrice);
    const matchesMax = !maxPrice || medPrice <= Number(maxPrice);
    const matchesStatus = stockStatus === "all"
      || (stockStatus === "low" && medQty <= 10)
      || (stockStatus === "healthy" && medQty > 10);

    return matchesQuery && matchesMin && matchesMax && matchesStatus;
  });
}

function renderInventory() {
  stopScanner();
  updateActiveNav("inventory");

  const meds = getFilteredMeds();

  setContent(`
    <section class="panel card-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Inventory search</p>
          <h3>Filter medicines by name, barcode, category, or price</h3>
        </div>
        <button class="btn-secondary small" onclick="renderAddStock()">Add medicine</button>
      </div>

      <div class="filters-grid">
        <label>
          <span>Search</span>
          <input id="stockQuery" placeholder="Medicine, barcode, category" value="${escapeHtml(appState.stockFilters.query)}" oninput="updateStockFilters()">
        </label>
        <label>
          <span>Min Price</span>
          <input id="stockMinPrice" type="number" min="0" step="0.01" value="${escapeHtml(appState.stockFilters.minPrice)}" oninput="updateStockFilters()">
        </label>
        <label>
          <span>Max Price</span>
          <input id="stockMaxPrice" type="number" min="0" step="0.01" value="${escapeHtml(appState.stockFilters.maxPrice)}" oninput="updateStockFilters()">
        </label>
        <label>
          <span>Stock Status</span>
          <select id="stockStatus" onchange="updateStockFilters()">
            <option value="all" ${appState.stockFilters.stockStatus === "all" ? "selected" : ""}>All</option>
            <option value="low" ${appState.stockFilters.stockStatus === "low" ? "selected" : ""}>Low stock</option>
            <option value="healthy" ${appState.stockFilters.stockStatus === "healthy" ? "selected" : ""}>Healthy stock</option>
          </select>
        </label>
      </div>

      ${meds.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Manufacturer</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              ${meds.map((med) => `
                ${(() => {
                  const expiryInfo = getExpiryStatus(med.expiry);
                  return `
                <tr>
                  <td>
                    <strong>${escapeHtml(med.name)}</strong>
                  </td>
                  <td>${escapeHtml(med.barcode)}</td>
                  <td>${escapeHtml(med.category || "-")}</td>
                  <td>${escapeHtml(med.manufacturer || "-")}</td>
                  <td><span class="qty-badge ${Number(med.qty) <= 10 ? "low" : "ok"}">${escapeHtml(med.qty)}</span></td>
                  <td>${formatCurrency(med.price)}</td>
                  <td><span class="expiry-badge ${expiryInfo.tone}">${escapeHtml(expiryInfo.label)}</span></td>
                </tr>
              `;
                })()}
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<p class="empty-state">No medicines matched the current filters.</p>`}
    </section>
  `);
}

function updateStockFilters() {
  appState.stockFilters.query = document.getElementById("stockQuery").value.trim();
  appState.stockFilters.minPrice = document.getElementById("stockMinPrice").value;
  appState.stockFilters.maxPrice = document.getElementById("stockMaxPrice").value;
  appState.stockFilters.stockStatus = document.getElementById("stockStatus").value;
  renderInventory();
}

function renderBillingEntry(scannedCode = "") {
  stopScanner();
  updateActiveNav("billing");

  const meds = readMeds();

  setContent(`
    <section class="panel card-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Billing desk</p>
          <h3>Create bill with customer details</h3>
        </div>
        <button class="btn-secondary small" onclick="startScan('bill')">Scan Barcode</button>
      </div>

      <div class="form-grid">
        <label>
          <span>Barcode</span>
          <input id="billBarcode" placeholder="Enter or scan barcode" value="${escapeHtml(scannedCode)}">
        </label>
        <label>
          <span>Customer Name</span>
          <input id="custName" placeholder="Enter customer name">
        </label>
        <label>
          <span>Phone Number</span>
          <input id="custPhone" placeholder="9876543210">
        </label>
        <label>
          <span>Quantity</span>
          <input id="billQty" type="number" min="1" placeholder="1">
        </label>
      </div>

      <div class="helper-card">
        <strong>Available medicines:</strong>
        <p>${meds.length ? meds.map((med) => `${escapeHtml(med.name)} (${escapeHtml(med.barcode)})`).join(" | ") : "No medicines available. Add stock first."}</p>
      </div>

      <div class="action-row">
        <button class="btn-primary" onclick="generateBill()">Generate Bill</button>
        <button class="btn-secondary" onclick="renderSalesHistory()">Search Customers</button>
      </div>
    </section>
  `);
}

function generateBill() {
  const barcode = document.getElementById("billBarcode").value.trim();
  const customerName = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const qty = Number(document.getElementById("billQty").value);

  if (!barcode || !customerName || !phone || !Number.isInteger(qty) || qty <= 0) {
    alert("Enter valid customer, phone, barcode, and quantity details.");
    return;
  }

  const meds = readMeds();
  const med = meds.find((item) => item.barcode === barcode);

  if (!med) {
    alert("Medicine not found for this barcode.");
    return;
  }

  if (Number(med.qty) < qty) {
    alert("Not enough stock available.");
    return;
  }

  med.qty = Number(med.qty) - qty;
  med.updatedAt = new Date().toISOString();
  saveMeds(meds);

  const total = Number(med.price) * qty;
  const sale = {
    id: Date.now(),
    customerName,
    phone,
    medicine: med.name,
    barcode,
    qty,
    price: Number(med.price),
    total,
    createdAt: new Date().toISOString()
  };

  const sales = readSales();
  sales.push(sale);
  saveSales(sales);

  setContent(`
    <section class="panel card-section invoice-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Invoice ready</p>
          <h3>Customer bill generated successfully</h3>
        </div>
        <span class="badge success">Saved</span>
      </div>

      <div class="invoice-grid">
        <div>
          <p><strong>Customer</strong></p>
          <p>${escapeHtml(customerName)}</p>
          <p>${escapeHtml(phone)}</p>
        </div>
        <div>
          <p><strong>Medicine</strong></p>
          <p>${escapeHtml(med.name)}</p>
          <p>Barcode: ${escapeHtml(barcode)}</p>
        </div>
        <div>
          <p><strong>Billing</strong></p>
          <p>Qty: ${qty}</p>
          <p>Unit Price: ${formatCurrency(med.price)}</p>
        </div>
      </div>

      <div class="invoice-total">
        <span>Total Amount</span>
        <strong>${formatCurrency(total)}</strong>
      </div>

      <div class="action-row">
        <button class="btn-primary" onclick="window.print()">Print Invoice</button>
        <button class="btn-secondary" onclick="renderBillingEntry()">New Bill</button>
      </div>
    </section>
  `);
}

function getFilteredSales() {
  const sales = [...readSales()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const { customer, phone, medicine, minTotal, maxTotal } = appState.salesFilters;

  return sales.filter((sale) => {
    const total = Number(sale.total);
    const matchesCustomer = !customer || sale.customerName.toLowerCase().includes(customer.toLowerCase());
    const matchesPhone = !phone || String(sale.phone).includes(phone);
    const matchesMedicine = !medicine || sale.medicine.toLowerCase().includes(medicine.toLowerCase());
    const matchesMin = !minTotal || total >= Number(minTotal);
    const matchesMax = !maxTotal || total <= Number(maxTotal);

    return matchesCustomer && matchesPhone && matchesMedicine && matchesMin && matchesMax;
  });
}

function renderSalesHistory() {
  stopScanner();
  updateActiveNav("sales");

  const sales = getFilteredSales();

  setContent(`
    <section class="panel card-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Customer history</p>
          <h3>Search by customer name, phone number, medicine, or bill amount</h3>
        </div>
        <button class="btn-secondary small" onclick="renderBillingEntry()">New bill</button>
      </div>

      <div class="filters-grid">
        <label>
          <span>Customer Name</span>
          <input id="salesCustomer" placeholder="Search customer" value="${escapeHtml(appState.salesFilters.customer)}" oninput="updateSalesFilters()">
        </label>
        <label>
          <span>Phone Number</span>
          <input id="salesPhone" placeholder="Search phone" value="${escapeHtml(appState.salesFilters.phone)}" oninput="updateSalesFilters()">
        </label>
        <label>
          <span>Medicine</span>
          <input id="salesMedicine" placeholder="Search medicine" value="${escapeHtml(appState.salesFilters.medicine)}" oninput="updateSalesFilters()">
        </label>
        <label>
          <span>Min Bill</span>
          <input id="salesMinTotal" type="number" min="0" step="0.01" value="${escapeHtml(appState.salesFilters.minTotal)}" oninput="updateSalesFilters()">
        </label>
        <label>
          <span>Max Bill</span>
          <input id="salesMaxTotal" type="number" min="0" step="0.01" value="${escapeHtml(appState.salesFilters.maxTotal)}" oninput="updateSalesFilters()">
        </label>
      </div>

      ${sales.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Medicine</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map((sale) => `
                <tr>
                  <td>${escapeHtml(sale.customerName)}</td>
                  <td>${escapeHtml(sale.phone)}</td>
                  <td>${escapeHtml(sale.medicine)}</td>
                  <td>${escapeHtml(sale.qty)}</td>
                  <td>${formatCurrency(sale.total)}</td>
                  <td>${formatDate(sale.createdAt)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<p class="empty-state">No customer records matched the current filters.</p>`}
    </section>
  `);
}

function updateSalesFilters() {
  appState.salesFilters.customer = document.getElementById("salesCustomer").value.trim();
  appState.salesFilters.phone = document.getElementById("salesPhone").value.trim();
  appState.salesFilters.medicine = document.getElementById("salesMedicine").value.trim();
  appState.salesFilters.minTotal = document.getElementById("salesMinTotal").value;
  appState.salesFilters.maxTotal = document.getElementById("salesMaxTotal").value;
  renderSalesHistory();
}

function renderIncome() {
  stopScanner();
  updateActiveNav("income");

  const sales = readSales();
  const currentDay = todayKey();
  const currentMonth = monthKey();
  const todayIncome = sales
    .filter((sale) => new Date(sale.createdAt).toLocaleDateString("en-IN") === currentDay)
    .reduce((sum, sale) => sum + Number(sale.total), 0);
  const monthIncome = sales
    .filter((sale) => {
      const date = new Date(sale.createdAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === currentMonth;
    })
    .reduce((sum, sale) => sum + Number(sale.total), 0);
  const avgBill = sales.length ? sales.reduce((sum, sale) => sum + Number(sale.total), 0) / sales.length : 0;

  setContent(`
    <section class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">Today's Income</span>
        <strong>${formatCurrency(todayIncome)}</strong>
        <span class="stat-meta">${currentDay}</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">This Month</span>
        <strong>${formatCurrency(monthIncome)}</strong>
        <span class="stat-meta">${currentMonth}</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Average Bill</span>
        <strong>${formatCurrency(avgBill)}</strong>
        <span class="stat-meta">Across ${sales.length} sales</span>
      </article>
    </section>

    <section class="panel card-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Income insights</p>
          <h3>Sales performance snapshot</h3>
        </div>
      </div>
      <div class="timeline-item">
        <div>
          <strong>Best use of this screen</strong>
          <p>Track today versus month performance and monitor average ticket size.</p>
        </div>
      </div>
      <div class="timeline-item">
        <div>
          <strong>Suggested next action</strong>
          <p>Open sales history to search high-value bills by customer or phone number.</p>
        </div>
      </div>
    </section>
  `);
}

function showScannerMessage(message) {
  const scannerPanel = document.getElementById("scannerPanel");
  const status = document.getElementById("scannerStatus");

  if (status) {
    status.textContent = message;
    return;
  }

  scannerPanel.insertAdjacentHTML("beforeend", `<p id="scannerStatus" class="scanner-status">${message}</p>`);
}

function stopScanner() {
  if (scannerControls && typeof scannerControls.stop === "function") {
    scannerControls.stop();
  }

  scannerControls = null;
  scanning = false;
  codeReader.reset();
  document.getElementById("scannerPanel").classList.add("hidden");
}

function startScan(mode) {
  if (scanning) {
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("This browser does not support camera scanning.");
    return;
  }

  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    alert("Camera scanning works only on HTTPS or localhost.");
    return;
  }

  scanning = true;
  document.getElementById("scannerPanel").classList.remove("hidden");
  showScannerMessage("Starting camera. Hold the barcode steady inside the frame.");

  codeReader
    .decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      document.getElementById("video"),
      (result, err) => {
        if (result) {
          const code = result.text;
          stopScanner();

          if (mode === "add") {
            renderAddStock(code);
          } else {
            renderBillingEntry(code);
          }

          return;
        }

        if (err && !(err instanceof ZXing.NotFoundException)) {
          showScannerMessage("Camera is active, but the barcode is not readable yet.");
          console.error(err);
        }
      }
    )
    .then((controls) => {
      scannerControls = controls || null;
      showScannerMessage("Camera started. Try moving the barcode closer and improving lighting.");
    })
    .catch((err) => {
      stopScanner();
      alert("Unable to access the camera. Please allow permission and try again.");
      console.error(err);
    });
}

function logout() {
  stopScanner();
  localStorage.removeItem("loggedIn");
  window.location.href = "login.html";
}

notifyExpiryAlerts();
renderDashboard();
