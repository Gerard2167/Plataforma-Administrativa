const STORAGE_KEY = "pa-negocios-data-v2";
const LEGACY_STORAGE_KEY = "pa-negocios-data-v1";
const SESSION_KEY = "pa-negocios-session";
const CLOUD_SAVE_DELAY = 650;

let cloudClient = null;
let cloudReady = false;
let cloudStatus = "Local";
let cloudSaveTimer = null;

const permissions = [
  { id: "income:create", label: "Ingresar ingresos" },
  { id: "expense:create", label: "Ingresar gastos" },
  { id: "maintenance:create", label: "Ingresar mantenimientos" },
  { id: "accounting:view", label: "Ver contabilidad" },
  { id: "transfers:authorize", label: "Autorizar transferencias" },
  { id: "settings:access", label: "Ingresar a parametria" },
  { id: "users:manage", label: "Crear usuarios y roles" },
  { id: "business:manage", label: "Administrar negocios" },
  { id: "vehicles:manage", label: "Administrar carros" },
  { id: "rentals:manage", label: "Administrar alquileres" },
  { id: "records:delete", label: "Borrar registros" },
  { id: "distribution:manage", label: "Configurar distribucion Uber" },
  { id: "alerts:view", label: "Ver alertas" },
  { id: "alerts:manage", label: "Configurar alertas" },
  { id: "loans:view", label: "Ver prestamos" },
  { id: "loans:manage", label: "Administrar prestamos" },
  { id: "family:manage", label: "Administrar finanzas familiares" },
];

const defaultRoles = [
  {
    id: "owner",
    name: "Propietario",
    description: "Acceso completo a administracion, parametria y movimientos.",
    permissions: permissions.map((item) => item.id),
  },
  {
    id: "operator",
    name: "Operador",
    description: "Registra ingresos, gastos y mantenimientos diarios.",
    permissions: ["income:create", "expense:create", "maintenance:create", "accounting:view", "alerts:view"],
  },
  {
    id: "accountant",
    name: "Contabilidad",
    description: "Revisa contabilidad y autoriza transferencias.",
    permissions: ["accounting:view", "transfers:authorize"],
  },
];

const defaultUsers = [
  { id: "u-admin", email: "admin@familia.com", password: "admin123", name: "Administrador", roleId: "owner", active: true },
  { id: "u-operador", email: "operador@familia.com", password: "operador123", name: "Operador", roleId: "operator", active: true },
];

const defaultDistribution = [
  { id: "loan", label: "Prestamo", amount: 80, priority: 1, balance: 0 },
  { id: "maintenance", label: "Mantenimiento", amount: 20, priority: 2, balance: 0 },
  { id: "business", label: "Ganancia negocio", amount: 15, priority: 3, balance: 0 },
  { id: "owners", label: "Ganancia nosotros", amount: 10, priority: 4, balance: 0 },
];

const defaultAlertSettings = {
  daysBefore: 15,
  maintenanceKmBefore: 500,
  recipientsByType: {
    maintenance: ["owner", "operator"],
    rent: ["owner", "operator"],
    insurance: ["owner", "operator"],
    license: ["owner", "operator"],
    plate: ["owner", "operator"],
  },
};

const initialData = {
  roles: structuredClone(defaultRoles),
  users: structuredClone(defaultUsers),
  businesses: [
    { id: "uber", name: "Uber", type: "Transporte", status: "Activo" },
    { id: "casa-chorrera", name: "Casa en Chorrera", type: "Alquiler", status: "Activo" },
  ],
  vehicles: [
    {
      id: "kia",
      name: "Kia",
      driver: "Pendiente",
      plate: "Sin placa",
      dailyGoal: 25,
      currentKm: 52000,
      nextMaintenanceKm: 57000,
      insuranceDueDate: today(20),
      driverLicenseDueDate: today(35),
      plateDueDate: today(45),
      allocations: structuredClone(defaultDistribution),
    },
    {
      id: "hyundai",
      name: "Hyundai",
      driver: "Pendiente",
      plate: "Sin placa",
      dailyGoal: 22.5,
      currentKm: 47000,
      nextMaintenanceKm: 52000,
      insuranceDueDate: today(9),
      driverLicenseDueDate: today(28),
      plateDueDate: today(50),
      allocations: structuredClone(defaultDistribution),
    },
    {
      id: "mitsubishi",
      name: "Mitsubishi",
      driver: "Pendiente",
      plate: "Sin placa",
      dailyGoal: 20,
      currentKm: 61000,
      nextMaintenanceKm: 66000,
      insuranceDueDate: today(-3),
      driverLicenseDueDate: today(18),
      plateDueDate: today(60),
      allocations: structuredClone(defaultDistribution),
    },
  ],
  uberIncome: [
    { id: crypto.randomUUID(), vehicleId: "kia", date: today(-2), amount: 27, driver: "Pendiente", notes: "Meta cumplida" },
    { id: crypto.randomUUID(), vehicleId: "hyundai", date: today(-2), amount: 22.5, driver: "Pendiente", notes: "Meta exacta" },
    { id: crypto.randomUUID(), vehicleId: "mitsubishi", date: today(-2), amount: 20, driver: "Pendiente", notes: "Meta exacta" },
  ],
  incomeDistributions: [],
  expenses: [
    { id: crypto.randomUUID(), vehicleId: "kia", date: today(-10), category: "Mantenimiento", amount: 38, description: "Cambio de aceite" },
  ],
  maintenances: [
    { id: crypto.randomUUID(), vehicleId: "kia", date: today(-10), km: 52000, nextKm: 57000, service: "Aceite y filtros", cost: 38 },
  ],
  rentals: [
    {
      id: "casa-chorrera",
      property: "Casa en Chorrera",
      tenant: "Sra. inquilina",
      monthlyRent: 240,
      dueDay: 1,
      status: "Al dia",
      payments: [{ id: crypto.randomUUID(), date: monthDate(), amount: 240, notes: "Pago mensual" }],
      expenses: [],
    },
  ],
  transfers: [],
  loans: [],
  familyExpenses: [],
  alertSettings: structuredClone(defaultAlertSettings),
};

let state = loadData();
let session = loadSession();
let view = "dashboard";
let activeBusiness = null;
let activeVehicle = "kia";
let drawer = null;
let settingsTab = "users";

function today(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function monthDate() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  const data = stored ? JSON.parse(stored) : structuredClone(initialData);
  const migrated = migrateData(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

function migrateData(data) {
  const migrated = { ...structuredClone(initialData), ...data };
  migrated.roles = migrated.roles?.length ? migrated.roles : structuredClone(defaultRoles);
  migrated.roles = migrated.roles.map((role) => {
    const extraPermissions = [];
    if (role.id === "owner") extraPermissions.push("alerts:view", "alerts:manage", "loans:view", "loans:manage", "family:manage");
    if (role.id === "operator") extraPermissions.push("alerts:view");
    return { ...role, permissions: [...new Set([...(role.permissions || []), ...extraPermissions])] };
  });
  migrated.users = migrated.users?.length ? migrated.users : structuredClone(defaultUsers);
  migrated.transfers = migrated.transfers || [];
  migrated.loans = migrated.loans || [];
  migrated.familyExpenses = migrated.familyExpenses || [];
  migrated.incomeDistributions = migrated.incomeDistributions || [];
  migrated.alertSettings = {
    ...structuredClone(defaultAlertSettings),
    ...(migrated.alertSettings || {}),
    recipientsByType: {
      ...structuredClone(defaultAlertSettings.recipientsByType),
      ...(migrated.alertSettings?.recipientsByType || {}),
    },
  };
  migrated.vehicles = (migrated.vehicles || []).map((vehicle) => ({
    ...vehicle,
    insuranceDueDate: vehicle.insuranceDueDate || today(30),
    driverLicenseDueDate: vehicle.driverLicenseDueDate || today(30),
    plateDueDate: vehicle.plateDueDate || today(30),
    allocations: normalizeAllocations(vehicle),
  }));
  return migrated;
}

function normalizeAllocations(vehicle) {
  if (Array.isArray(vehicle.allocations) && vehicle.allocations.length) {
    return vehicle.allocations.map((item, index) => ({
      id: item.id || crypto.randomUUID(),
      label: item.label,
      amount: Number(item.amount || 0),
      priority: Number(item.priority || index + 1),
      balance: Number(item.balance || 0),
    }));
  }
  if (vehicle.allocation) {
    const labels = { loan: "Prestamo", maintenance: "Mantenimiento", business: "Ganancia negocio", owners: "Ganancia nosotros" };
    return Object.entries(vehicle.allocation).map(([key, percent], index) => ({
      id: key,
      label: labels[key] || key,
      amount: Number(percent),
      priority: index + 1,
      balance: 0,
    }));
  }
  return structuredClone(defaultDistribution);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueCloudSave();
}

function supabaseConfig() {
  return window.SUPABASE_CONFIG || {};
}

function isSupabaseConfigured() {
  const config = supabaseConfig();
  return Boolean(config.url && config.anonKey && window.supabase?.createClient);
}

function initSupabaseClient() {
  if (!isSupabaseConfigured()) {
    cloudStatus = "Local";
    return null;
  }
  if (!cloudClient) {
    const config = supabaseConfig();
    cloudClient = window.supabase.createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cloudClient;
}

async function signInToCloud(email, password) {
  const client = initSupabaseClient();
  if (!client) return true;
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    cloudReady = false;
    cloudStatus = "Supabase sin sesion";
    throw error;
  }
  cloudReady = true;
  cloudStatus = "Supabase conectado";
  return true;
}

async function signOutFromCloud() {
  if (!cloudClient) return;
  await cloudClient.auth.signOut();
  cloudReady = false;
}

async function loadCloudState() {
  const client = initSupabaseClient();
  if (!client || !cloudReady) return;
  const id = supabaseConfig().stateId || "familia-principal";
  const { data, error } = await client.from("app_state").select("data").eq("id", id).maybeSingle();
  if (error) {
    cloudStatus = "Supabase con error";
    throw error;
  }
  if (data?.data) {
    state = migrateData(data.data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    cloudStatus = "Supabase sincronizado";
    return;
  }
  await saveCloudState();
}

function queueCloudSave() {
  if (!cloudReady || !cloudClient) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(() => saveCloudState(), CLOUD_SAVE_DELAY);
}

async function saveCloudState() {
  const client = initSupabaseClient();
  if (!client || !cloudReady) return;
  const id = supabaseConfig().stateId || "familia-principal";
  const { error } = await client.from("app_state").upsert({
    id,
    data: state,
    updated_at: new Date().toISOString(),
  });
  cloudStatus = error ? "Supabase con error" : "Supabase guardado";
  if (error) console.warn("No se pudo guardar en Supabase", error);
}

function loadSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  const parsed = JSON.parse(stored);
  const user = state?.users?.find((item) => item.email === parsed.email && item.active);
  return user ? sessionFromUser(user) : null;
}

function sessionFromUser(user) {
  const role = state.roles.find((item) => item.id === user.roleId) || state.roles[0];
  return { email: user.email, name: user.name, roleId: role.id, role: role.name, permissions: role.permissions || [] };
}

function saveSession(user) {
  session = sessionFromUser(user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function dateText(value) {
  return new Intl.DateTimeFormat("es-PA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function daysUntil(value) {
  const start = new Date(`${today()}T00:00:00`);
  const end = new Date(`${value}T00:00:00`);
  return Math.ceil((end - start) / 86400000);
}

function byId(id) {
  return document.getElementById(id);
}

function hasPermission(permission) {
  return Boolean(session?.permissions?.includes(permission));
}

function canManage() {
  return hasPermission("business:manage") || hasPermission("settings:access");
}

function render() {
  const app = byId("app");
  app.innerHTML = session ? layout() : login();
  bindEvents();
}

function login() {
  return `
    <section class="login-shell">
      <div class="login-copy">
        <div class="brand-mark">PA</div>
        <div>
          <h1>Control claro para cada negocio familiar.</h1>
          <p>Administra ingresos, metas, carros, mantenimientos, alquileres, permisos y decisiones de dinero desde una sola plataforma privada.</p>
        </div>
      </div>
      <aside class="login-panel">
        <h2>Ingresar</h2>
        <p class="hint">Usa un usuario con rol para ver y registrar la informacion de los negocios.</p>
        <form id="loginForm">
          <div class="field">
            <label>Correo</label>
            <input name="email" type="email" autocomplete="username" value="admin@familia.com" required />
          </div>
          <div class="field">
            <label>Contrasena</label>
            <input name="password" type="password" autocomplete="current-password" value="admin123" required />
          </div>
          <button class="primary" type="submit">Entrar</button>
        </form>
        <div class="demo-users">
          <strong>Usuarios de prueba</strong><br />
          Propietario: admin@familia.com / admin123<br />
          Operador: operador@familia.com / operador123
        </div>
      </aside>
    </section>
  `;
}

function layout() {
  const title = view === "settings" ? "Parametria" : view === "alerts" ? "Alertas" : view === "loans" ? "Prestamos" : activeBusiness ? businessTitle() : "Panel de negocios";
  return `
    <section class="app-shell">
      <aside class="sidebar">
        <div class="side-top">
          <div class="brand-mark">PA</div>
          <div><strong>Plataforma Admin</strong><small>Negocios familiares</small></div>
        </div>
        <nav class="nav">
          <button class="${!activeBusiness && view === "dashboard" ? "active" : ""}" data-nav="dashboard">Inicio <span>⌂</span></button>
          ${hasPermission("alerts:view") ? `<button class="${view === "alerts" ? "active" : ""}" data-nav="alerts">Alertas <span>${visibleAlerts().length}</span></button>` : ""}
          ${hasPermission("loans:view") ? `<button class="${view === "loans" ? "active" : ""}" data-nav="loans">Prestamos <span>${activeLoans().length}</span></button>` : ""}
          ${state.businesses.map((business) => `<button class="${activeBusiness === business.id ? "active" : ""}" data-business="${business.id}">${business.name} <span>›</span></button>`).join("")}
          ${hasPermission("settings:access") ? `<button class="${view === "settings" ? "active" : ""}" data-nav="settings">Parametria <span>⚙</span></button>` : ""}
          ${hasPermission("business:manage") ? `<button data-action="new-business">Agregar negocio <span>＋</span></button>` : ""}
        </nav>
        <div class="user-chip">
          <div><strong>${session.name}</strong><small>${session.role}</small></div>
          <span class="cloud-chip">${cloudStatus}</span>
          <button class="ghost" data-action="logout">Salir</button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div>
            <h1>${title}</h1>
            <p class="hint">${topbarHint()}</p>
          </div>
          <div class="actions">${topbarActions()}</div>
        </header>
        ${content()}
      </div>
      ${drawer ? drawerTemplate() : ""}
    </section>
  `;
}

function businessTitle() {
  if (activeBusiness === "uber") return "Uber";
  if (activeBusiness === "casa-chorrera") return "Casa en Chorrera";
  return state.businesses.find((business) => business.id === activeBusiness)?.name || "Negocio";
}

function topbarHint() {
  if (view === "loans") return "Prestamos hechos desde rubros del negocio o cuentas familiares, con saldo, interes y pagos.";
  if (view === "alerts") return "Vencimientos y avisos operativos segun los roles destinatarios.";
  if (view === "settings") return "Gestiona usuarios, roles, permisos y configuraciones sensibles.";
  if (activeBusiness === "uber") return "Metas diarias, conductores, gastos, prestamos, mantenimiento y utilidad consolidada.";
  if (activeBusiness === "casa-chorrera") return "Control mensual de renta, pagos recibidos, gastos y estado del alquiler.";
  if (activeBusiness) return "Modulo listo para personalizar cuando agregues las reglas de este negocio.";
  return "Selecciona un negocio, revisa resultados y agrega nuevas unidades cuando crezcan.";
}

function topbarActions() {
  if (view === "loans") {
    return hasPermission("loans:manage") ? `<button class="secondary" data-drawer="loan">＋ Prestamo</button>` : "";
  }
  if (view === "alerts") {
    return hasPermission("alerts:manage") ? `<button class="secondary" data-drawer="alert-settings">Configurar alertas</button>` : "";
  }
  if (view === "settings") {
    if (!hasPermission("users:manage")) return "";
    return `
      <button class="secondary" data-drawer="user">＋ Usuario</button>
      <button class="secondary" data-drawer="role">＋ Rol</button>
    `;
  }
  if (view === "dashboard") {
    return hasPermission("family:manage") ? `<button class="secondary" data-drawer="family-expense">＋ Gasto familiar</button>` : "";
  }
  if (activeBusiness === "uber") {
    return `
      ${hasPermission("income:create") ? `<button class="secondary" data-drawer="income">＋ Ingreso</button>` : ""}
      ${hasPermission("expense:create") ? `<button class="secondary" data-drawer="expense">＋ Gasto</button>` : ""}
      ${hasPermission("maintenance:create") ? `<button class="secondary" data-drawer="maintenance">＋ Mantenimiento</button>` : ""}
    `;
  }
  if (activeBusiness === "casa-chorrera") {
    return `
      ${hasPermission("income:create") ? `<button class="secondary" data-drawer="rent-payment">＋ Pago</button>` : ""}
      ${hasPermission("expense:create") ? `<button class="secondary" data-drawer="rent-expense">＋ Gasto</button>` : ""}
    `;
  }
  if (hasPermission("business:manage")) return `<button class="secondary" data-action="new-business">＋ Agregar negocio</button>`;
  return "";
}

function content() {
  if (view === "loans") return loansView();
  if (view === "alerts") return alertsView();
  if (view === "settings") return settingsView();
  if (activeBusiness === "uber") return uberView();
  if (activeBusiness === "casa-chorrera") return rentalView();
  if (activeBusiness) return genericBusinessView();
  return dashboardView();
}

function dashboardView() {
  const uberTotal = sum(state.uberIncome, "amount");
  const rentTotal = state.rentals.flatMap((rental) => rental.payments).reduce((total, item) => total + Number(item.amount), 0);
  const businessIncome = uberTotal + rentTotal;
  const businessExpenses = sum(state.expenses, "amount") + sum(state.maintenances, "cost") + state.rentals.flatMap((rental) => rental.expenses).reduce((total, item) => total + Number(item.amount), 0);
  const familyExpenses = sum(state.familyExpenses, "amount");
  const loanReceivable = activeLoans().reduce((total, loan) => total + loanBalance(loan), 0);
  const alertCount = visibleAlerts().length;
  return `
    <div class="metrics">
      <div class="metric"><span>Ingresos negocios</span><strong>${money(businessIncome)}</strong></div>
      <div class="metric"><span>Gastos negocio</span><strong>${money(businessExpenses)}</strong></div>
      <div class="metric"><span>Gastos familiares</span><strong>${money(familyExpenses)}</strong></div>
      <div class="metric"><span>Por cobrar prestamos</span><strong>${money(loanReceivable)}</strong></div>
    </div>
    <div class="metrics">
      <div class="metric"><span>Balance familiar</span><strong>${money(businessIncome - businessExpenses - familyExpenses)}</strong></div>
      <div class="metric"><span>Negocios activos</span><strong>${state.businesses.length}</strong></div>
      <div class="metric"><span>Prestamos activos</span><strong>${activeLoans().length}</strong></div>
      <div class="metric"><span>Alertas para tu rol</span><strong>${alertCount}</strong></div>
    </div>
    <section class="panel">
      <div class="section-title">
        <div><h2>Gastos familiares</h2><p class="hint">Gastos personales y del hogar separados de los gastos del negocio.</p></div>
        ${hasPermission("family:manage") ? `<button class="ghost" data-drawer="family-expense">Registrar gasto</button>` : ""}
      </div>
      <div class="records">${familyExpenseRecords()}</div>
    </section>
    <div class="section-title">
      <div><h2>Negocios</h2><p class="hint">Vista rapida de cada operacion.</p></div>
    </div>
    <div class="business-grid">
      ${state.businesses.map((business) => businessCard(business)).join("")}
    </div>
  `;
}

function businessCard(business) {
  const descriptions = {
    uber: "3 carros activos con metas diarias de lunes a sabado, registros por conductor, mantenimiento y gastos.",
    "casa-chorrera": `Renta mensual de ${money(240)}, control de pagos, gastos y estado del contrato.`,
  };
  return `
    <article class="business-card">
      <span class="pill">${business.type}</span>
      <div>
        <h3>${business.name}</h3>
        <p>${descriptions[business.id] || "Negocio preparado para incorporar ingresos, gastos y reportes en una proxima etapa."}</p>
      </div>
      <button class="primary" data-business="${business.id}">Abrir negocio</button>
    </article>
  `;
}

function genericBusinessView() {
  const business = state.businesses.find((item) => item.id === activeBusiness);
  return `
    <section class="panel">
      <div class="section-title">
        <div><h2>${business?.name || "Negocio"}</h2><p class="hint">Estado: ${business?.status || "Activo"} · Tipo: ${business?.type || "General"}</p></div>
      </div>
      <div class="empty">Este negocio ya esta creado. El siguiente paso es agregarle su propio modulo de ingresos, gastos y reportes.</div>
    </section>
  `;
}

function loansView() {
  if (!hasPermission("loans:view")) return `<div class="empty">Tu rol no tiene permiso para ver prestamos.</div>`;
  const totalPrincipal = state.loans.reduce((total, loan) => total + Number(loan.principal || 0), 0);
  const totalDue = state.loans.reduce((total, loan) => total + loanTotalDue(loan), 0);
  const totalPaid = state.loans.reduce((total, loan) => total + loanPaid(loan), 0);
  const balance = state.loans.reduce((total, loan) => total + loanBalance(loan), 0);
  return `
    <div class="metrics">
      <div class="metric"><span>Prestado</span><strong>${money(totalPrincipal)}</strong></div>
      <div class="metric"><span>Total a cobrar</span><strong>${money(totalDue)}</strong></div>
      <div class="metric"><span>Pagado</span><strong>${money(totalPaid)}</strong></div>
      <div class="metric"><span>Saldo</span><strong>${money(balance)}</strong></div>
    </div>
    <section class="panel">
      <div class="section-title">
        <div><h2>Prestamos</h2><p class="hint">Control de prestamos familiares o a terceros, con o sin interes.</p></div>
        ${hasPermission("loans:manage") ? `<button class="primary" data-drawer="loan">Crear prestamo</button>` : ""}
      </div>
      <div class="loan-grid">
        ${state.loans.length ? state.loans.map(loanCard).join("") : `<div class="empty">Todavia no hay prestamos registrados.</div>`}
      </div>
    </section>
  `;
}

function loanCard(loan) {
  const balance = loanBalance(loan);
  const next = nextLoanPayment(loan);
  return `
    <article class="loan-card">
      <header>
        <div>
          <span class="pill">${loan.status}</span>
          <h3>${loan.borrower}</h3>
          <p class="hint">${loan.sourceLabel}</p>
        </div>
        <strong>${money(balance)}</strong>
      </header>
      <dl>
        <div><dt>Prestado</dt><dd>${money(loan.principal)}</dd></div>
        <div><dt>Total a pagar</dt><dd>${money(loanTotalDue(loan))}</dd></div>
        <div><dt>Interes</dt><dd>${loan.interestEnabled ? `${loan.annualRate}% anual` : "Sin interes"}</dd></div>
        <div><dt>Cuota estimada</dt><dd>${money(loanMonthlyPayment(loan))}</dd></div>
        <div><dt>Proximo pago</dt><dd>${next ? `${dateText(next.date)} · ${money(next.amount)}` : "Pagado"}</dd></div>
        <div><dt>Pagado</dt><dd>${money(loanPaid(loan))}</dd></div>
      </dl>
      <p>${loan.notes || ""}</p>
      <div class="records compact-records">${loanPayments(loan)}</div>
      <div class="actions">
        ${hasPermission("loans:manage") && balance > 0 ? `<button class="ghost" data-drawer="loan-payment" data-id="${loan.id}">Registrar pago</button>` : ""}
        ${deleteButton("loan", loan.id)}
      </div>
    </article>
  `;
}

function loanPayments(loan) {
  if (!loan.payments?.length) return `<div class="empty">Sin pagos registrados.</div>`;
  return loan.payments
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((payment) => `<article class="record-row"><div><small>Pago</small><strong>${payment.notes || "Abono"}</strong></div><div><small>Fecha</small><strong>${dateText(payment.date)}</strong></div><div><small>Monto</small><strong>${money(payment.amount)}</strong></div></article>`)
    .join("");
}

function activeLoans() {
  return state.loans.filter((loan) => loan.status !== "Pagado" && loanBalance(loan) > 0);
}

function loanTotalDue(loan) {
  const principal = Number(loan.principal || 0);
  if (!loan.interestEnabled) return principal;
  return principal + principal * (Number(loan.annualRate || 0) / 100) * (Number(loan.termMonths || 1) / 12);
}

function loanPaid(loan) {
  return (loan.payments || []).reduce((total, payment) => total + Number(payment.amount || 0), 0);
}

function loanBalance(loan) {
  return Math.max(0, loanTotalDue(loan) - loanPaid(loan));
}

function loanMonthlyPayment(loan) {
  return loanTotalDue(loan) / Math.max(1, Number(loan.termMonths || 1));
}

function nextLoanPayment(loan) {
  const balance = loanBalance(loan);
  if (balance <= 0) return null;
  const paymentsMade = loan.payments?.length || 0;
  const date = new Date(`${loan.startDate}T00:00:00`);
  date.setMonth(date.getMonth() + paymentsMade + 1);
  date.setDate(Number(loan.dueDay || date.getDate()));
  return { date: date.toISOString().slice(0, 10), amount: Math.min(balance, loanMonthlyPayment(loan)) };
}

function familyExpenseRecords() {
  if (!state.familyExpenses.length) return `<div class="empty">Todavia no hay gastos familiares registrados.</div>`;
  return state.familyExpenses
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((item) => `<article class="record-row"><div><small>${item.category}</small><strong>${item.description || "Gasto familiar"}</strong></div><div><small>Fecha</small><strong>${dateText(item.date)}</strong></div><div><small>Monto</small><strong>${money(item.amount)}</strong></div>${deleteButton("familyExpense", item.id)}</article>`)
    .join("");
}

function loanSourceOptions() {
  const options = [];
  state.vehicles.forEach((vehicle) => {
    sortedAllocations(vehicle).forEach((allocation) => {
      options.push({
        value: `vehicle:${vehicle.id}:${allocation.id}`,
        label: `${vehicle.name} · ${allocation.label} (${money(allocation.balance)})`,
      });
    });
  });
  state.rentals.forEach((rental) => {
    options.push({ value: `rental:${rental.id}:rent`, label: `${rental.property} · Cuenta alquiler` });
  });
  options.push({ value: "family:general:cash", label: "Cuenta familiar / efectivo" });
  return options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
}

function parseLoanSource(value) {
  const [sourceType, sourceId, allocationId] = value.split(":");
  let sourceLabel = "Cuenta familiar";
  if (sourceType === "vehicle") {
    const vehicle = state.vehicles.find((item) => item.id === sourceId);
    const allocation = vehicle?.allocations?.find((item) => item.id === allocationId);
    sourceLabel = `${vehicle?.name || "Auto"} · ${allocation?.label || "Rubro"}`;
  }
  if (sourceType === "rental") {
    const rental = state.rentals.find((item) => item.id === sourceId);
    sourceLabel = `${rental?.property || "Alquiler"} · Cuenta alquiler`;
  }
  return { sourceType, sourceId, allocationId, sourceLabel };
}

function alertsView() {
  const alerts = visibleAlerts();
  const critical = alerts.filter((alert) => alert.status === "Vencido").length;
  const upcoming = alerts.filter((alert) => alert.status === "Proximo").length;
  return `
    <div class="metrics">
      <div class="metric"><span>Total alertas</span><strong>${alerts.length}</strong></div>
      <div class="metric"><span>Vencidas</span><strong>${critical}</strong></div>
      <div class="metric"><span>Proximas</span><strong>${upcoming}</strong></div>
      <div class="metric"><span>Dias de aviso</span><strong>${state.alertSettings.daysBefore}</strong></div>
    </div>
    <section class="panel">
      <div class="section-title">
        <div><h2>Bandeja de alertas</h2><p class="hint">Solo ves las alertas asignadas a tu rol.</p></div>
        ${hasPermission("alerts:manage") ? `<button class="ghost" data-drawer="alert-settings">Configurar</button>` : ""}
      </div>
      <div class="records">
        ${alerts.length ? alerts.map(alertCard).join("") : `<div class="empty">No hay alertas para tu rol en este momento.</div>`}
      </div>
    </section>
  `;
}

function alertCard(alert) {
  const emails = alertRecipients(alert.type).map((user) => user.email).join(",");
  const subject = encodeURIComponent(`[Plataforma Admin] ${alert.title}`);
  const body = encodeURIComponent(`${alert.message}\n\nFecha: ${alert.dueDate ? dateText(alert.dueDate) : "No aplica"}\nEstado: ${alert.status}`);
  return `
    <article class="alert-row ${alert.status === "Vencido" ? "is-danger" : ""}">
      <div>
        <span class="pill">${alert.status}</span>
        <h3>${alert.title}</h3>
        <p class="hint">${alert.message}</p>
      </div>
      <div><small>Fecha limite</small><strong>${alert.dueDate ? dateText(alert.dueDate) : alert.reference}</strong></div>
      <div><small>Destinatarios</small><strong>${alertRecipients(alert.type).map((user) => user.name).join(", ") || "Sin usuarios"}</strong></div>
      <a class="ghost" href="mailto:${emails}?subject=${subject}&body=${body}">Correo</a>
    </article>
  `;
}

function visibleAlerts() {
  return allAlerts().filter((alert) => alert.roleIds.includes(session?.roleId));
}

function allAlerts() {
  const alerts = [];
  const settings = state.alertSettings;
  state.vehicles.forEach((vehicle) => {
    const kmLeft = Number(vehicle.nextMaintenanceKm || 0) - Number(vehicle.currentKm || 0);
    if (kmLeft <= settings.maintenanceKmBefore) {
      alerts.push({
        id: `maintenance-${vehicle.id}`,
        type: "maintenance",
        title: `Mantenimiento de ${vehicle.name}`,
        message: kmLeft < 0 ? `El mantenimiento esta vencido por ${Math.abs(kmLeft).toLocaleString("en-US")} km.` : `Faltan ${kmLeft.toLocaleString("en-US")} km para el mantenimiento.`,
        status: kmLeft < 0 ? "Vencido" : "Proximo",
        reference: `${kmLeft.toLocaleString("en-US")} km`,
        roleIds: alertRoleIds("maintenance"),
      });
    }
    addDateAlert(alerts, "insurance", `Seguro de ${vehicle.name}`, vehicle.insuranceDueDate, `El seguro del auto ${vehicle.name}`);
    addDateAlert(alerts, "license", `Licencia de ${vehicle.driver}`, vehicle.driverLicenseDueDate, `La licencia del conductor de ${vehicle.name}`);
    addDateAlert(alerts, "plate", `Placa de ${vehicle.name}`, vehicle.plateDueDate, `El pago de placa de ${vehicle.name}`);
  });

  state.rentals.forEach((rental) => {
    const dueDate = rentalDueDate(rental);
    if (!rentPaidForDueDate(rental, dueDate) && daysUntil(dueDate) < 0) {
      alerts.push({
        id: `rent-${rental.id}-${dueDate}`,
        type: "rent",
        title: `Alquiler vencido: ${rental.property}`,
        message: `No se ha registrado el pago de ${money(rental.monthlyRent)} con vencimiento ${dateText(dueDate)}.`,
        status: "Vencido",
        dueDate,
        roleIds: alertRoleIds("rent"),
      });
    }
  });
  return alerts.sort((a, b) => alertSortValue(a) - alertSortValue(b));
}

function addDateAlert(alerts, type, title, dueDate, messagePrefix) {
  if (!dueDate) return;
  const days = daysUntil(dueDate);
  if (days > state.alertSettings.daysBefore) return;
  alerts.push({
    id: `${type}-${title}`,
    type,
    title,
    message: days < 0 ? `${messagePrefix} esta vencido desde ${dateText(dueDate)}.` : `${messagePrefix} vence en ${days} dia(s).`,
    status: days < 0 ? "Vencido" : "Proximo",
    dueDate,
    roleIds: alertRoleIds(type),
  });
}

function alertRoleIds(type) {
  return state.alertSettings.recipientsByType?.[type] || [];
}

function alertRecipients(type) {
  const roleIds = alertRoleIds(type);
  return state.users.filter((user) => user.active && roleIds.includes(user.roleId));
}

function alertSortValue(alert) {
  if (alert.dueDate) return new Date(`${alert.dueDate}T00:00:00`).getTime();
  return alert.status === "Vencido" ? 0 : 1;
}

function rentalDueDate(rental) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), Number(rental.dueDay || 1));
  return date.toISOString().slice(0, 10);
}

function rentPaidForDueDate(rental, dueDate) {
  const due = new Date(`${dueDate}T00:00:00`);
  return rental.payments.some((payment) => {
    const paid = new Date(`${payment.date}T00:00:00`);
    return paid.getFullYear() === due.getFullYear() && paid.getMonth() === due.getMonth() && Number(payment.amount) >= Number(rental.monthlyRent || 0);
  });
}

function uberView() {
  const income = sum(state.uberIncome, "amount");
  const expenses = sum(state.expenses, "amount") + sum(state.maintenances, "cost");
  const goals = state.vehicles.reduce((total, vehicle) => total + vehicle.dailyGoal * 6, 0);
  return `
    ${hasPermission("accounting:view") ? `
      <div class="metrics">
        <div class="metric"><span>Ingresos registrados</span><strong>${money(income)}</strong></div>
        <div class="metric"><span>Gastos y mantenimiento</span><strong>${money(expenses)}</strong></div>
        <div class="metric"><span>Meta semanal</span><strong>${money(goals)}</strong></div>
        <div class="metric"><span>Resultado neto</span><strong>${money(income - expenses)}</strong></div>
      </div>
    ` : `<div class="empty">Tu rol permite registrar movimientos, pero no ver contabilidad consolidada.</div>`}
    <div class="vehicle-grid">
      ${state.vehicles.map(vehicleCard).join("")}
    </div>
    <section class="panel">
      <div class="tabs">
        ${state.vehicles.map((vehicle) => `<button class="${activeVehicle === vehicle.id ? "active" : ""}" data-vehicle="${vehicle.id}">${vehicle.name}</button>`).join("")}
      </div>
      ${vehicleDetail()}
    </section>
  `;
}

function vehicleCard(vehicle) {
  const vehicleIncome = state.uberIncome.filter((item) => item.vehicleId === vehicle.id);
  const total = sum(vehicleIncome, "amount");
  const goal = vehicle.dailyGoal * Math.max(vehicleIncome.length, 1);
  const percent = Math.min(100, Math.round((total / goal) * 100));
  const nextKm = Math.max(vehicle.nextMaintenanceKm - vehicle.currentKm, 0);
  const distributed = allocationBalanceTotal(vehicle);
  return `
    <article class="vehicle-card">
      <header>
        <div><h3>${vehicle.name}</h3><p class="hint">${vehicle.driver}</p></div>
        <span class="pill">${money(vehicle.dailyGoal)} diario</span>
      </header>
      <div class="progress" aria-label="Progreso de meta"><i style="--value:${percent}%"></i></div>
      <dl>
        <div><dt>Ingreso</dt><dd>${hasPermission("accounting:view") ? money(total) : "Restringido"}</dd></div>
        <div><dt>Meta</dt><dd>${percent}%</dd></div>
        <div><dt>Kilometraje</dt><dd>${vehicle.currentKm.toLocaleString("en-US")}</dd></div>
        <div><dt>Proximo mant.</dt><dd>${nextKm.toLocaleString("en-US")} km</dd></div>
      </dl>
      ${hasPermission("accounting:view") ? `<div class="allocation-grid">${allocationItems(vehicle, total)}</div><p class="hint">Acumulado distribuido: ${money(distributed)}</p>` : ""}
      <div class="actions">
        ${hasPermission("vehicles:manage") ? `<button class="ghost" data-drawer="vehicle" data-id="${vehicle.id}">Editar carro</button>` : ""}
        ${hasPermission("distribution:manage") ? `<button class="ghost" data-drawer="distribution" data-id="${vehicle.id}">Distribucion</button>` : ""}
      </div>
    </article>
  `;
}

function allocationItems(vehicle, total) {
  const assigned = allocationBalanceTotal(vehicle);
  const remainder = total - assigned;
  const rows = sortedAllocations(vehicle)
    .map((item) => `<div class="allocation"><span>${item.priority}. ${item.label}</span><strong>${money(item.balance)}</strong><small>${money(item.amount)} por ingreso</small></div>`)
    .join("");
  return `${rows}<div class="allocation ${remainder < 0 ? "negative" : ""}"><span>Sin distribuir</span><strong>${money(remainder)}</strong></div>`;
}

function sortedAllocations(vehicle) {
  return [...(vehicle.allocations || [])].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
}

function allocationBalanceTotal(vehicle) {
  return (vehicle.allocations || []).reduce((total, item) => total + Number(item.balance || 0), 0);
}

function vehicleDetail() {
  const vehicle = state.vehicles.find((item) => item.id === activeVehicle);
  const incomes = state.uberIncome.filter((item) => item.vehicleId === activeVehicle);
  const expenses = state.expenses.filter((item) => item.vehicleId === activeVehicle);
  const maintenances = state.maintenances.filter((item) => item.vehicleId === activeVehicle);
  return `
    <div class="section-title">
      <div><h2>${vehicle.name}</h2><p class="hint">Conductor: ${vehicle.driver} · Placa: ${vehicle.plate}</p></div>
      ${hasPermission("distribution:manage") ? `<button class="ghost" data-drawer="distribution" data-id="${vehicle.id}">Configurar rubros</button>` : ""}
    </div>
    <h3>Ingresos diarios</h3>
    <div class="records">${records(incomes, "income")}</div>
    <h3>Gastos</h3>
    <div class="records">${records(expenses, "expense")}</div>
    <h3>Mantenimientos</h3>
    <div class="records">${records(maintenances, "maintenance")}</div>
  `;
}

function records(items, type) {
  if (!items.length) return `<div class="empty">Todavia no hay registros.</div>`;
  return items
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((item) => {
      if (type === "maintenance") {
        return `<article class="record-row"><div><small>Servicio</small><strong>${item.service}</strong></div><div><small>Fecha</small><strong>${dateText(item.date)}</strong></div><div><small>Kilometraje</small><strong>${item.km.toLocaleString("en-US")} km</strong></div><strong>${hasPermission("accounting:view") ? money(item.cost) : "Restringido"}</strong>${deleteButton(type, item.id)}</article>`;
      }
      const label = type === "income" ? item.driver : item.category;
      const note = type === "income" ? item.notes : item.description;
      const amount = hasPermission("accounting:view") ? money(item.amount) : "Restringido";
      const distribution = type === "income" && hasPermission("accounting:view") ? `<small>${incomeDistributionText(item.id)}</small>` : "";
      return `<article class="record-row"><div><small>${label}</small><strong>${note || "Sin nota"}</strong>${distribution}</div><div><small>Fecha</small><strong>${dateText(item.date)}</strong></div><div><small>Monto</small><strong>${amount}</strong></div>${deleteButton(type, item.id)}</article>`;
    })
    .join("");
}

function incomeDistributionText(incomeId) {
  const movements = state.incomeDistributions.filter((item) => item.incomeId === incomeId);
  if (!movements.length) return "Sin distribucion registrada";
  return `Distribuido: ${money(sum(movements, "amount"))} en ${movements.length} rubro(s)`;
}

function rentalView() {
  const rental = state.rentals[0];
  const paid = sum(rental.payments, "amount");
  const expenses = sum(rental.expenses, "amount");
  return `
    ${hasPermission("accounting:view") ? `
      <div class="metrics">
        <div class="metric"><span>Renta mensual</span><strong>${money(rental.monthlyRent)}</strong></div>
        <div class="metric"><span>Pagos recibidos</span><strong>${money(paid)}</strong></div>
        <div class="metric"><span>Gastos</span><strong>${money(expenses)}</strong></div>
        <div class="metric"><span>Neto</span><strong>${money(paid - expenses)}</strong></div>
      </div>
    ` : `<div class="empty">Tu rol no tiene permiso para ver contabilidad de alquiler.</div>`}
    <section class="panel">
      <div class="section-title">
        <div><h2>${rental.property}</h2><p class="hint">Inquilina: ${rental.tenant} · Vence dia ${rental.dueDay} · ${rental.status}</p></div>
        ${hasPermission("rentals:manage") ? `<button class="ghost" data-drawer="rental">Editar alquiler</button>` : ""}
      </div>
      <h3>Pagos recibidos</h3>
      <div class="records">${rentalRecords(rental.payments, "payment")}</div>
      <h3>Gastos del alquiler</h3>
      <div class="records">${rentalRecords(rental.expenses, "rentExpense")}</div>
    </section>
  `;
}

function rentalRecords(items, type) {
  if (!items.length) return `<div class="empty">Todavia no hay registros.</div>`;
  return items
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((item) => `<article class="record-row"><div><small>Detalle</small><strong>${item.notes || item.description || "Registro"}</strong></div><div><small>Fecha</small><strong>${dateText(item.date)}</strong></div><div><small>Monto</small><strong>${hasPermission("accounting:view") ? money(item.amount) : "Restringido"}</strong></div>${deleteButton(type, item.id)}</article>`)
    .join("");
}

function settingsView() {
  if (!hasPermission("settings:access")) return `<div class="empty">Tu rol no tiene permiso para ingresar a parametria.</div>`;
  return `
    <section class="panel">
      <div class="tabs">
        <button class="${settingsTab === "users" ? "active" : ""}" data-settings-tab="users">Usuarios</button>
        <button class="${settingsTab === "roles" ? "active" : ""}" data-settings-tab="roles">Roles y permisos</button>
        <button class="${settingsTab === "transfers" ? "active" : ""}" data-settings-tab="transfers">Transferencias</button>
        <button class="${settingsTab === "alerts" ? "active" : ""}" data-settings-tab="alerts">Alertas</button>
      </div>
      ${settingsTab === "users" ? usersSettings() : ""}
      ${settingsTab === "roles" ? rolesSettings() : ""}
      ${settingsTab === "transfers" ? transfersSettings() : ""}
      ${settingsTab === "alerts" ? alertSettingsView() : ""}
    </section>
  `;
}

function usersSettings() {
  return `
    <div class="section-title">
      <div><h2>Usuarios</h2><p class="hint">Crea accesos y asigna roles predeterminados.</p></div>
      ${hasPermission("users:manage") ? `<button class="primary" data-drawer="user">Crear usuario</button>` : ""}
    </div>
    <div class="records">
      ${state.users.map((user) => {
        const role = state.roles.find((item) => item.id === user.roleId);
        return `<article class="record-row"><div><small>Usuario</small><strong>${user.name}</strong></div><div><small>Correo</small><strong>${user.email}</strong></div><div><small>Rol</small><strong>${role?.name || "Sin rol"}</strong></div>${hasPermission("users:manage") ? `<button class="ghost" data-drawer="user" data-id="${user.id}">Editar</button>` : ""}</article>`;
      }).join("")}
    </div>
  `;
}

function rolesSettings() {
  return `
    <div class="section-title">
      <div><h2>Roles y permisos</h2><p class="hint">Cada rol concentra funcionalidades para asignarlas rapido a nuevos usuarios.</p></div>
      ${hasPermission("users:manage") ? `<button class="primary" data-drawer="role">Crear rol</button>` : ""}
    </div>
    <div class="role-grid">
      ${state.roles.map((role) => `
        <article class="panel mini-panel">
          <div class="section-title compact">
            <div><h3>${role.name}</h3><p class="hint">${role.description || "Sin descripcion"}</p></div>
            ${hasPermission("users:manage") ? `<button class="ghost" data-drawer="role" data-id="${role.id}">Editar</button>` : ""}
          </div>
          <div class="permission-list">
            ${(role.permissions || []).map((permission) => `<span class="pill">${permissionLabel(permission)}</span>`).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function transfersSettings() {
  const total = sum(state.transfers.filter((item) => item.status === "Pendiente"), "amount");
  return `
    <div class="section-title">
      <div><h2>Transferencias</h2><p class="hint">Modulo inicial para solicitudes y autorizaciones segun permiso.</p></div>
      ${hasPermission("transfers:authorize") ? `<button class="primary" data-drawer="transfer">Registrar solicitud</button>` : ""}
    </div>
    <div class="metrics">
      <div class="metric"><span>Pendientes</span><strong>${state.transfers.filter((item) => item.status === "Pendiente").length}</strong></div>
      <div class="metric"><span>Monto pendiente</span><strong>${money(total)}</strong></div>
      <div class="metric"><span>Aprobadas</span><strong>${state.transfers.filter((item) => item.status === "Aprobada").length}</strong></div>
      <div class="metric"><span>Rechazadas</span><strong>${state.transfers.filter((item) => item.status === "Rechazada").length}</strong></div>
    </div>
    <div class="records">
      ${state.transfers.length ? state.transfers.map((item) => `<article class="record-row"><div><small>Destino</small><strong>${item.to}</strong></div><div><small>Monto</small><strong>${money(item.amount)}</strong></div><div><small>Estado</small><strong>${item.status}</strong></div>${hasPermission("transfers:authorize") && item.status === "Pendiente" ? `<button class="ghost" data-transfer="approve" data-id="${item.id}">Aprobar</button><button class="ghost" data-transfer="reject" data-id="${item.id}">Rechazar</button>` : ""}</article>`).join("") : `<div class="empty">No hay transferencias registradas.</div>`}
    </div>
  `;
}

function alertSettingsView() {
  const types = [
    ["maintenance", "Mantenimiento"],
    ["rent", "Alquiler vencido"],
    ["insurance", "Seguro de auto"],
    ["license", "Licencia conductor"],
    ["plate", "Pago de placa"],
  ];
  return `
    <div class="section-title">
      <div><h2>Alertas por correo</h2><p class="hint">Define anticipacion y roles destinatarios. El boton Correo de la bandeja prepara el mensaje para esos usuarios.</p></div>
      ${hasPermission("alerts:manage") ? `<button class="primary" data-drawer="alert-settings">Editar alertas</button>` : ""}
    </div>
    <div class="metrics">
      <div class="metric"><span>Dias antes</span><strong>${state.alertSettings.daysBefore}</strong></div>
      <div class="metric"><span>Km antes</span><strong>${state.alertSettings.maintenanceKmBefore}</strong></div>
      <div class="metric"><span>Tipos activos</span><strong>${types.length}</strong></div>
      <div class="metric"><span>Alertas actuales</span><strong>${allAlerts().length}</strong></div>
    </div>
    <div class="records">
      ${types.map(([type, label]) => `<article class="record-row"><div><small>Tipo</small><strong>${label}</strong></div><div><small>Roles</small><strong>${alertRoleIds(type).map(roleName).join(", ") || "Sin roles"}</strong></div><div><small>Correos</small><strong>${alertRecipients(type).length}</strong></div></article>`).join("")}
    </div>
  `;
}

function roleName(roleId) {
  return state.roles.find((role) => role.id === roleId)?.name || roleId;
}

function permissionLabel(permission) {
  return permissions.find((item) => item.id === permission)?.label || permission;
}

function deleteButton(type, id) {
  if (!hasPermission("records:delete")) return `<span class="pill">Registrado</span>`;
  return `<button class="ghost" data-delete="${type}" data-id="${id}">Borrar</button>`;
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function drawerTemplate() {
  const titles = {
    income: "Registrar ingreso",
    expense: "Registrar gasto",
    maintenance: "Registrar mantenimiento",
    vehicle: "Editar carro",
    distribution: "Distribucion por montos",
    rental: "Editar alquiler",
    "rent-payment": "Registrar pago",
    "rent-expense": "Registrar gasto",
    business: "Agregar negocio",
    user: drawer.id ? "Editar usuario" : "Crear usuario",
    role: drawer.id ? "Editar rol" : "Crear rol",
    transfer: "Registrar transferencia",
    "alert-settings": "Configurar alertas",
    loan: "Crear prestamo",
    "loan-payment": "Registrar pago de prestamo",
    "family-expense": "Registrar gasto familiar",
  };
  return `
    <div class="drawer-backdrop">
      <aside class="drawer">
        <header>
          <h2>${titles[drawer.type]}</h2>
          <button class="ghost" data-action="close-drawer">Cerrar</button>
        </header>
        ${drawerForm()}
      </aside>
    </div>
  `;
}

function vehicleOptions(selected = activeVehicle) {
  return state.vehicles.map((vehicle) => `<option value="${vehicle.id}" ${selected === vehicle.id ? "selected" : ""}>${vehicle.name}</option>`).join("");
}

function roleOptions(selected) {
  return state.roles.map((role) => `<option value="${role.id}" ${selected === role.id ? "selected" : ""}>${role.name}</option>`).join("");
}

function alertRecipientField(type, label) {
  const selected = state.alertSettings.recipientsByType?.[type] || [];
  return `
    <div class="field full">
      <label>${label}</label>
      <div class="permission-list">
        ${state.roles.map((role) => `<label class="check-card"><input type="checkbox" name="alert-${type}" value="${role.id}" ${selected.includes(role.id) ? "checked" : ""} /> <span>${role.name}</span></label>`).join("")}
      </div>
    </div>
  `;
}

function drawerForm() {
  if (drawer.type === "income") {
    return `<form id="drawerForm" data-form="income" class="form-grid">
      <div class="field"><label>Carro</label><select name="vehicleId">${vehicleOptions()}</select></div>
      <div class="field"><label>Fecha</label><input name="date" type="date" value="${today()}" required /></div>
      <div class="field"><label>Monto</label><input name="amount" type="number" step="0.01" min="0" required /></div>
      <div class="field"><label>Conductor</label><input name="driver" placeholder="Nombre" required /></div>
      <div class="field full"><label>Nota</label><textarea name="notes" placeholder="Meta cumplida, atraso, observacion"></textarea></div>
      <button class="primary full" type="submit">Guardar ingreso</button>
    </form>`;
  }
  if (drawer.type === "expense") {
    return `<form id="drawerForm" data-form="expense" class="form-grid">
      <div class="field"><label>Carro</label><select name="vehicleId">${vehicleOptions()}</select></div>
      <div class="field"><label>Fecha</label><input name="date" type="date" value="${today()}" required /></div>
      <div class="field"><label>Categoria</label><select name="category"><option>Combustible</option><option>Mantenimiento</option><option>Prestamo</option><option>Seguro</option><option>Otro</option></select></div>
      <div class="field"><label>Monto</label><input name="amount" type="number" step="0.01" min="0" required /></div>
      <div class="field full"><label>Descripcion</label><textarea name="description"></textarea></div>
      <button class="primary full" type="submit">Guardar gasto</button>
    </form>`;
  }
  if (drawer.type === "maintenance") {
    return `<form id="drawerForm" data-form="maintenance" class="form-grid">
      <div class="field"><label>Carro</label><select name="vehicleId">${vehicleOptions()}</select></div>
      <div class="field"><label>Fecha</label><input name="date" type="date" value="${today()}" required /></div>
      <div class="field"><label>Kilometraje</label><input name="km" type="number" min="0" required /></div>
      <div class="field"><label>Proximo km</label><input name="nextKm" type="number" min="0" required /></div>
      <div class="field"><label>Costo</label><input name="cost" type="number" step="0.01" min="0" required /></div>
      <div class="field"><label>Servicio</label><input name="service" placeholder="Aceite, filtros, frenos" required /></div>
      <button class="primary full" type="submit">Guardar mantenimiento</button>
    </form>`;
  }
  if (drawer.type === "vehicle") {
    const vehicle = state.vehicles.find((item) => item.id === drawer.id);
    return `<form id="drawerForm" data-form="vehicle" class="form-grid">
      <input type="hidden" name="id" value="${vehicle.id}" />
      <div class="field"><label>Nombre</label><input name="name" value="${vehicle.name}" required /></div>
      <div class="field"><label>Conductor</label><input name="driver" value="${vehicle.driver}" required /></div>
      <div class="field"><label>Placa</label><input name="plate" value="${vehicle.plate}" required /></div>
      <div class="field"><label>Meta diaria</label><input name="dailyGoal" type="number" step="0.01" value="${vehicle.dailyGoal}" required /></div>
      <div class="field"><label>Kilometraje</label><input name="currentKm" type="number" value="${vehicle.currentKm}" required /></div>
      <div class="field"><label>Proximo mantenimiento</label><input name="nextMaintenanceKm" type="number" value="${vehicle.nextMaintenanceKm}" required /></div>
      <div class="field"><label>Vence seguro</label><input name="insuranceDueDate" type="date" value="${vehicle.insuranceDueDate || today(30)}" required /></div>
      <div class="field"><label>Vence licencia</label><input name="driverLicenseDueDate" type="date" value="${vehicle.driverLicenseDueDate || today(30)}" required /></div>
      <div class="field"><label>Vence placa</label><input name="plateDueDate" type="date" value="${vehicle.plateDueDate || today(30)}" required /></div>
      <button class="primary full" type="submit">Guardar carro</button>
    </form>`;
  }
  if (drawer.type === "distribution") {
    const vehicle = state.vehicles.find((item) => item.id === drawer.id);
    return `
      <form id="drawerForm" data-form="distribution" class="form-grid">
        <input type="hidden" name="vehicleId" value="${vehicle.id}" />
        <div class="distribution-list full">
          ${sortedAllocations(vehicle).map((item) => `
            <div class="allocation-row">
              <input type="hidden" name="allocationId" value="${item.id}" />
              <input type="hidden" name="balance" value="${Number(item.balance || 0)}" />
              <div class="field"><label>Prioridad</label><input name="priority" type="number" min="1" value="${item.priority}" required /></div>
              <div class="field"><label>Rubro</label><input name="label" value="${item.label}" required /></div>
              <div class="field"><label>Monto por ingreso</label><input name="amount" type="number" step="0.01" min="0" value="${item.amount}" required /></div>
              <div><small>Saldo acumulado</small><strong>${money(item.balance)}</strong><button class="ghost" type="button" data-remove-allocation="${item.id}" data-vehicle-id="${vehicle.id}">Quitar</button></div>
            </div>
          `).join("")}
        </div>
        <div class="field"><label>Prioridad nueva</label><input name="newPriority" type="number" min="1" value="${(vehicle.allocations || []).length + 1}" /></div>
        <div class="field"><label>Rubro nuevo</label><input name="newLabel" placeholder="Prestamo, mantenimiento..." /></div>
        <div class="field"><label>Monto por ingreso</label><input name="newAmount" type="number" step="0.01" min="0" /></div>
        <button class="primary full" type="submit">Guardar distribucion</button>
      </form>
    `;
  }
  if (drawer.type === "rental") {
    const rental = state.rentals[0];
    return `<form id="drawerForm" data-form="rental" class="form-grid">
      <div class="field full"><label>Propiedad</label><input name="property" value="${rental.property}" required /></div>
      <div class="field"><label>Inquilina</label><input name="tenant" value="${rental.tenant}" required /></div>
      <div class="field"><label>Renta mensual</label><input name="monthlyRent" type="number" step="0.01" value="${rental.monthlyRent}" required /></div>
      <div class="field"><label>Dia de pago</label><input name="dueDay" type="number" min="1" max="31" value="${rental.dueDay}" required /></div>
      <div class="field"><label>Estado</label><select name="status"><option ${rental.status === "Al dia" ? "selected" : ""}>Al dia</option><option ${rental.status === "Pendiente" ? "selected" : ""}>Pendiente</option></select></div>
      <button class="primary full" type="submit">Guardar alquiler</button>
    </form>`;
  }
  if (drawer.type === "rent-payment") {
    return `<form id="drawerForm" data-form="rent-payment" class="form-grid">
      <div class="field"><label>Fecha</label><input name="date" type="date" value="${today()}" required /></div>
      <div class="field"><label>Monto</label><input name="amount" type="number" step="0.01" value="240" required /></div>
      <div class="field full"><label>Nota</label><textarea name="notes">Pago mensual</textarea></div>
      <button class="primary full" type="submit">Guardar pago</button>
    </form>`;
  }
  if (drawer.type === "rent-expense") {
    return `<form id="drawerForm" data-form="rent-expense" class="form-grid">
      <div class="field"><label>Fecha</label><input name="date" type="date" value="${today()}" required /></div>
      <div class="field"><label>Monto</label><input name="amount" type="number" step="0.01" required /></div>
      <div class="field full"><label>Descripcion</label><textarea name="description"></textarea></div>
      <button class="primary full" type="submit">Guardar gasto</button>
    </form>`;
  }
  if (drawer.type === "user") {
    const user = state.users.find((item) => item.id === drawer.id) || { id: "", name: "", email: "", password: "", roleId: state.roles[0]?.id, active: true };
    return `<form id="drawerForm" data-form="user" class="form-grid">
      <input type="hidden" name="id" value="${user.id}" />
      <div class="field"><label>Nombre</label><input name="name" value="${user.name}" required /></div>
      <div class="field"><label>Correo</label><input name="email" type="email" value="${user.email}" required /></div>
      <div class="field"><label>Contrasena local</label><input name="password" value="${user.password || ""}" placeholder="Solo para modo local" /></div>
      <div class="field"><label>Rol</label><select name="roleId">${roleOptions(user.roleId)}</select></div>
      <div class="field full"><label>Estado</label><select name="active"><option value="true" ${user.active ? "selected" : ""}>Activo</option><option value="false" ${!user.active ? "selected" : ""}>Inactivo</option></select></div>
      <button class="primary full" type="submit">Guardar usuario</button>
    </form>`;
  }
  if (drawer.type === "role") {
    const role = state.roles.find((item) => item.id === drawer.id) || { id: "", name: "", description: "", permissions: [] };
    return `<form id="drawerForm" data-form="role">
      <input type="hidden" name="id" value="${role.id}" />
      <div class="field"><label>Nombre del rol</label><input name="name" value="${role.name}" required /></div>
      <div class="field"><label>Descripcion</label><textarea name="description">${role.description || ""}</textarea></div>
      <div class="permission-list form-permissions">
        ${permissions.map((permission) => `<label class="check-card"><input type="checkbox" name="permissions" value="${permission.id}" ${(role.permissions || []).includes(permission.id) ? "checked" : ""} /> <span>${permission.label}</span></label>`).join("")}
      </div>
      <button class="primary full" type="submit">Guardar rol</button>
    </form>`;
  }
  if (drawer.type === "transfer") {
    return `<form id="drawerForm" data-form="transfer" class="form-grid">
      <div class="field"><label>Destino</label><input name="to" required /></div>
      <div class="field"><label>Monto</label><input name="amount" type="number" step="0.01" min="0" required /></div>
      <div class="field full"><label>Motivo</label><textarea name="reason"></textarea></div>
      <button class="primary full" type="submit">Guardar solicitud</button>
    </form>`;
  }
  if (drawer.type === "alert-settings") {
    return `<form id="drawerForm" data-form="alert-settings" class="form-grid">
      <div class="field"><label>Dias antes de vencimiento</label><input name="daysBefore" type="number" min="1" value="${state.alertSettings.daysBefore}" required /></div>
      <div class="field"><label>Km antes de mantenimiento</label><input name="maintenanceKmBefore" type="number" min="0" value="${state.alertSettings.maintenanceKmBefore}" required /></div>
      ${alertRecipientField("maintenance", "Mantenimiento")}
      ${alertRecipientField("rent", "Alquiler vencido")}
      ${alertRecipientField("insurance", "Seguro de auto")}
      ${alertRecipientField("license", "Licencia conductor")}
      ${alertRecipientField("plate", "Pago de placa")}
      <button class="primary full" type="submit">Guardar alertas</button>
    </form>`;
  }
  if (drawer.type === "loan") {
    return `<form id="drawerForm" data-form="loan" class="form-grid">
      <div class="field"><label>Persona</label><input name="borrower" placeholder="Familiar o tercero" required /></div>
      <div class="field"><label>Fuente del dinero</label><select name="source" required>${loanSourceOptions()}</select></div>
      <div class="field"><label>Monto prestado</label><input name="principal" type="number" step="0.01" min="0" required /></div>
      <div class="field"><label>Fecha inicio</label><input name="startDate" type="date" value="${today()}" required /></div>
      <div class="field"><label>Meses plazo</label><input name="termMonths" type="number" min="1" value="1" required /></div>
      <div class="field"><label>Dia de pago</label><input name="dueDay" type="number" min="1" max="31" value="30" required /></div>
      <div class="field"><label>Cobra interes</label><select name="interestEnabled"><option value="false">No</option><option value="true">Si</option></select></div>
      <div class="field"><label>% interes anual</label><input name="annualRate" type="number" step="0.01" min="0" value="0" /></div>
      <div class="field full"><label>Notas</label><textarea name="notes" placeholder="Condiciones, motivo, acuerdo de pago"></textarea></div>
      <button class="primary full" type="submit">Guardar prestamo</button>
    </form>`;
  }
  if (drawer.type === "loan-payment") {
    const loan = state.loans.find((item) => item.id === drawer.id);
    const next = nextLoanPayment(loan);
    return `<form id="drawerForm" data-form="loan-payment" class="form-grid">
      <input type="hidden" name="loanId" value="${loan.id}" />
      <div class="field"><label>Fecha</label><input name="date" type="date" value="${today()}" required /></div>
      <div class="field"><label>Monto</label><input name="amount" type="number" step="0.01" min="0" value="${next ? next.amount.toFixed(2) : loanBalance(loan).toFixed(2)}" required /></div>
      <div class="field full"><label>Nota</label><textarea name="notes">Pago de prestamo</textarea></div>
      <button class="primary full" type="submit">Guardar pago</button>
    </form>`;
  }
  if (drawer.type === "family-expense") {
    return `<form id="drawerForm" data-form="family-expense" class="form-grid">
      <div class="field"><label>Fecha</label><input name="date" type="date" value="${today()}" required /></div>
      <div class="field"><label>Monto</label><input name="amount" type="number" step="0.01" min="0" required /></div>
      <div class="field"><label>Categoria</label><select name="category"><option>Casa</option><option>Supermercado</option><option>Servicios</option><option>Educacion</option><option>Salud</option><option>Transporte</option><option>Otro</option></select></div>
      <div class="field"><label>Pagado desde</label><input name="source" placeholder="Efectivo, banco, tarjeta" /></div>
      <div class="field full"><label>Descripcion</label><textarea name="description"></textarea></div>
      <button class="primary full" type="submit">Guardar gasto familiar</button>
    </form>`;
  }
  return `<form id="drawerForm" data-form="business" class="form-grid">
    <div class="field"><label>Nombre</label><input name="name" required /></div>
    <div class="field"><label>Tipo</label><input name="type" placeholder="Venta, alquiler, servicio" required /></div>
    <div class="field full"><label>Estado</label><select name="status"><option>Activo</option><option>En pausa</option></select></div>
    <button class="primary full" type="submit">Guardar negocio</button>
  </form>`;
}

function bindEvents() {
  const loginForm = byId("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(loginForm);
      const email = form.get("email");
      const password = form.get("password");
      if (isSupabaseConfigured()) {
        try {
          await signInToCloud(email, password);
          await loadCloudState();
        } catch (error) {
          alert(`No se pudo iniciar sesion en Supabase. Verifica que el usuario exista en Supabase Auth.\n\nDetalle: ${error.message}`);
          return;
        }
      }
      const freshUser = state.users.find((item) => item.email === email && (isSupabaseConfigured() || item.password === password) && item.active);
      if (!freshUser) {
        alert(isSupabaseConfigured() ? "Usuario autenticado en Supabase, pero no existe o esta inactivo en Parametria." : "Usuario o contrasena incorrectos.");
        return;
      }
      saveSession(freshUser);
      render();
    });
  }

  document.querySelectorAll("[data-business]").forEach((button) => {
    button.addEventListener("click", () => {
      activeBusiness = button.dataset.business;
      view = "business";
      render();
    });
  });

  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      view = button.dataset.nav;
      activeBusiness = null;
      render();
    });
  });

  document.querySelectorAll("[data-settings-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsTab = button.dataset.settingsTab;
      render();
    });
  });

  document.querySelectorAll("[data-vehicle]").forEach((button) => {
    button.addEventListener("click", () => {
      activeVehicle = button.dataset.vehicle;
      render();
    });
  });

  document.querySelectorAll("[data-drawer]").forEach((button) => {
    button.addEventListener("click", () => {
      drawer = { type: button.dataset.drawer, id: button.dataset.id };
      render();
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteRecord(button.dataset.delete, button.dataset.id));
  });

  document.querySelectorAll("[data-remove-allocation]").forEach((button) => {
    button.addEventListener("click", () => removeAllocation(button.dataset.vehicleId, button.dataset.removeAllocation));
  });

  document.querySelectorAll("[data-transfer]").forEach((button) => {
    button.addEventListener("click", () => updateTransfer(button.dataset.id, button.dataset.transfer));
  });

  const drawerForm = byId("drawerForm");
  if (drawerForm) drawerForm.addEventListener("submit", handleForm);
}

function handleAction(action) {
  if (action === "logout") {
    localStorage.removeItem(SESSION_KEY);
    session = null;
    signOutFromCloud();
    cloudStatus = isSupabaseConfigured() ? "Supabase sin sesion" : "Local";
  }
  if (action === "close-drawer") drawer = null;
  if (action === "new-business" && hasPermission("business:manage")) drawer = { type: "business" };
  render();
}

function handleForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const type = form.dataset.form;
  if (!allowedForForm(type)) {
    alert("Tu rol no tiene permiso para esta accion.");
    drawer = null;
    render();
    return;
  }

  if (type === "income") {
    const income = { id: crypto.randomUUID(), ...data, amount: Number(data.amount) };
    state.uberIncome.push(income);
    distributeIncome(income);
  }
  if (type === "expense") state.expenses.push({ id: crypto.randomUUID(), ...data, amount: Number(data.amount) });
  if (type === "maintenance") {
    state.maintenances.push({ id: crypto.randomUUID(), ...data, km: Number(data.km), nextKm: Number(data.nextKm), cost: Number(data.cost) });
    const vehicle = state.vehicles.find((item) => item.id === data.vehicleId);
    vehicle.currentKm = Number(data.km);
    vehicle.nextMaintenanceKm = Number(data.nextKm);
  }
  if (type === "vehicle") {
    const vehicle = state.vehicles.find((item) => item.id === data.id);
    Object.assign(vehicle, {
      name: data.name,
      driver: data.driver,
      plate: data.plate,
      dailyGoal: Number(data.dailyGoal),
      currentKm: Number(data.currentKm),
      nextMaintenanceKm: Number(data.nextMaintenanceKm),
      insuranceDueDate: data.insuranceDueDate,
      driverLicenseDueDate: data.driverLicenseDueDate,
      plateDueDate: data.plateDueDate,
    });
  }
  if (type === "distribution") {
    const vehicle = state.vehicles.find((item) => item.id === data.vehicleId);
    saveDistribution(vehicle, new FormData(form));
  }
  if (type === "rental") Object.assign(state.rentals[0], { ...data, monthlyRent: Number(data.monthlyRent), dueDay: Number(data.dueDay) });
  if (type === "rent-payment") state.rentals[0].payments.push({ id: crypto.randomUUID(), ...data, amount: Number(data.amount) });
  if (type === "rent-expense") state.rentals[0].expenses.push({ id: crypto.randomUUID(), ...data, amount: Number(data.amount) });
  if (type === "business") state.businesses.push({ id: slug(data.name), name: data.name, type: data.type, status: data.status });
  if (type === "user") saveUser(data);
  if (type === "role") saveRole(new FormData(form), data);
  if (type === "transfer") state.transfers.push({ id: crypto.randomUUID(), ...data, amount: Number(data.amount), status: "Pendiente", requestedBy: session.email });
  if (type === "alert-settings") saveAlertSettings(new FormData(form), data);
  if (type === "loan") createLoan(data);
  if (type === "loan-payment") registerLoanPayment(data);
  if (type === "family-expense") state.familyExpenses.push({ id: crypto.randomUUID(), ...data, amount: Number(data.amount) });

  saveData();
  if (["user", "role"].includes(type) && data.email === session?.email) saveSession(state.users.find((item) => item.email === data.email));
  drawer = null;
  render();
}

function allowedForForm(type) {
  const rules = {
    income: "income:create",
    expense: "expense:create",
    maintenance: "maintenance:create",
    vehicle: "vehicles:manage",
    distribution: "distribution:manage",
    rental: "rentals:manage",
    "rent-payment": "income:create",
    "rent-expense": "expense:create",
    business: "business:manage",
    user: "users:manage",
    role: "users:manage",
    transfer: "transfers:authorize",
    "alert-settings": "alerts:manage",
    loan: "loans:manage",
    "loan-payment": "loans:manage",
    "family-expense": "family:manage",
  };
  return hasPermission(rules[type]);
}

function createLoan(data) {
  const source = parseLoanSource(data.source);
  const principal = Number(data.principal || 0);
  const loan = {
    id: crypto.randomUUID(),
    borrower: data.borrower,
    ...source,
    principal,
    startDate: data.startDate,
    termMonths: Number(data.termMonths || 1),
    dueDay: Number(data.dueDay || 30),
    interestEnabled: data.interestEnabled === "true",
    annualRate: Number(data.annualRate || 0),
    notes: data.notes,
    status: "Activo",
    payments: [],
    createdBy: session.email,
  };
  withdrawFromLoanSource(loan, principal);
  state.loans.push(loan);
}

function registerLoanPayment(data) {
  const loan = state.loans.find((item) => item.id === data.loanId);
  if (!loan) return;
  const amount = Number(data.amount || 0);
  loan.payments = loan.payments || [];
  loan.payments.push({ id: crypto.randomUUID(), date: data.date, amount, notes: data.notes });
  depositToLoanSource(loan, amount);
  if (loanBalance(loan) <= 0) loan.status = "Pagado";
}

function withdrawFromLoanSource(loan, amount) {
  const allocation = findLoanAllocation(loan);
  if (allocation) allocation.balance = Number(allocation.balance || 0) - amount;
}

function depositToLoanSource(loan, amount) {
  const allocation = findLoanAllocation(loan);
  if (allocation) allocation.balance = Number(allocation.balance || 0) + amount;
}

function findLoanAllocation(loan) {
  if (loan.sourceType !== "vehicle") return null;
  const vehicle = state.vehicles.find((item) => item.id === loan.sourceId);
  return vehicle?.allocations?.find((item) => item.id === loan.allocationId) || null;
}

function distributeIncome(income) {
  const vehicle = state.vehicles.find((item) => item.id === income.vehicleId);
  if (!vehicle) return;
  let remaining = Number(income.amount || 0);
  sortedAllocations(vehicle).forEach((allocation) => {
    if (remaining <= 0) return;
    const amount = Math.min(remaining, Number(allocation.amount || 0));
    if (amount <= 0) return;
    allocation.balance = Number(allocation.balance || 0) + amount;
    remaining -= amount;
    state.incomeDistributions.push({
      id: crypto.randomUUID(),
      incomeId: income.id,
      vehicleId: vehicle.id,
      allocationId: allocation.id,
      allocationLabel: allocation.label,
      amount,
      date: income.date,
    });
  });
}

function reverseIncomeDistribution(incomeId) {
  const movements = state.incomeDistributions.filter((item) => item.incomeId === incomeId);
  movements.forEach((movement) => {
    const vehicle = state.vehicles.find((item) => item.id === movement.vehicleId);
    const allocation = vehicle?.allocations?.find((item) => item.id === movement.allocationId);
    if (allocation) allocation.balance = Math.max(0, Number(allocation.balance || 0) - Number(movement.amount || 0));
  });
  state.incomeDistributions = state.incomeDistributions.filter((item) => item.incomeId !== incomeId);
}

function saveDistribution(vehicle, formData) {
  const ids = formData.getAll("allocationId");
  const labels = formData.getAll("label");
  const amounts = formData.getAll("amount");
  const priorities = formData.getAll("priority");
  const balances = formData.getAll("balance");
  vehicle.allocations = ids.map((id, index) => ({
    id,
    label: labels[index],
    amount: Number(amounts[index] || 0),
    priority: Number(priorities[index] || index + 1),
    balance: Number(balances[index] || 0),
  }));

  const newLabel = String(formData.get("newLabel") || "").trim();
  const newAmount = Number(formData.get("newAmount") || 0);
  if (newLabel && newAmount > 0) {
    vehicle.allocations.push({
      id: crypto.randomUUID(),
      label: newLabel,
      amount: newAmount,
      priority: Number(formData.get("newPriority") || vehicle.allocations.length + 1),
      balance: 0,
    });
  }
}

function saveUser(data) {
  const payload = { id: data.id || crypto.randomUUID(), name: data.name, email: data.email, password: data.password || "", roleId: data.roleId, active: data.active === "true" };
  const index = state.users.findIndex((item) => item.id === data.id);
  if (index >= 0) state.users[index] = payload;
  else state.users.push(payload);
}

function saveRole(formData, data) {
  const selectedPermissions = formData.getAll("permissions");
  const payload = { id: data.id || slug(data.name), name: data.name, description: data.description, permissions: selectedPermissions };
  const index = state.roles.findIndex((item) => item.id === data.id);
  if (index >= 0) state.roles[index] = payload;
  else state.roles.push(payload);
}

function saveAlertSettings(formData, data) {
  state.alertSettings = {
    daysBefore: Number(data.daysBefore),
    maintenanceKmBefore: Number(data.maintenanceKmBefore),
    recipientsByType: {
      maintenance: formData.getAll("alert-maintenance"),
      rent: formData.getAll("alert-rent"),
      insurance: formData.getAll("alert-insurance"),
      license: formData.getAll("alert-license"),
      plate: formData.getAll("alert-plate"),
    },
  };
}

function deleteRecord(type, id) {
  if (!hasPermission("records:delete")) {
    alert("Tu rol no tiene permiso para borrar registros.");
    return;
  }
  if (!confirm("Borrar este registro?")) return;
  if (type === "income") {
    reverseIncomeDistribution(id);
    state.uberIncome = state.uberIncome.filter((item) => item.id !== id);
  }
  if (type === "expense") state.expenses = state.expenses.filter((item) => item.id !== id);
  if (type === "maintenance") state.maintenances = state.maintenances.filter((item) => item.id !== id);
  if (type === "payment") state.rentals[0].payments = state.rentals[0].payments.filter((item) => item.id !== id);
  if (type === "rentExpense") state.rentals[0].expenses = state.rentals[0].expenses.filter((item) => item.id !== id);
  if (type === "familyExpense") state.familyExpenses = state.familyExpenses.filter((item) => item.id !== id);
  if (type === "loan") deleteLoan(id);
  saveData();
  render();
}

function deleteLoan(id) {
  const loan = state.loans.find((item) => item.id === id);
  if (!loan) return;
  const allocation = findLoanAllocation(loan);
  if (allocation) allocation.balance = Number(allocation.balance || 0) + Number(loan.principal || 0) - loanPaid(loan);
  state.loans = state.loans.filter((item) => item.id !== id);
}

function removeAllocation(vehicleId, allocationId) {
  if (!hasPermission("distribution:manage")) return;
  const vehicle = state.vehicles.find((item) => item.id === vehicleId);
  vehicle.allocations = vehicle.allocations.filter((item) => item.id !== allocationId);
  saveData();
  render();
}

function updateTransfer(id, action) {
  if (!hasPermission("transfers:authorize")) return;
  const transfer = state.transfers.find((item) => item.id === id);
  if (!transfer) return;
  transfer.status = action === "approve" ? "Aprobada" : "Rechazada";
  transfer.authorizedBy = session.email;
  saveData();
  render();
}

function slug(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function bootstrap() {
  const client = initSupabaseClient();
  if (client) {
    const { data } = await client.auth.getSession();
    cloudReady = Boolean(data.session);
    cloudStatus = cloudReady ? "Supabase conectado" : "Supabase sin sesion";
    if (cloudReady) {
      try {
        await loadCloudState();
        if (session) {
          const user = state.users.find((item) => item.email === session.email && item.active);
          if (user) saveSession(user);
        }
      } catch (error) {
        console.warn("No se pudo cargar Supabase", error);
      }
    }
  }
  render();
}

bootstrap();
