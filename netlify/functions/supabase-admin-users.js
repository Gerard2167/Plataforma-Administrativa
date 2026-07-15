const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
  body: JSON.stringify(body),
});

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Metodo no permitido." });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Netlify." });
  }

  const token = String(event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Sesion requerida." });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Solicitud invalida." });
  }

  try {
    const caller = await currentUser(supabaseUrl, serviceRoleKey, token);
    const state = await loadAppState(supabaseUrl, serviceRoleKey, body.stateId || process.env.SUPABASE_STATE_ID || "familia-principal");
    if (!canManageUsers(state, caller.email)) {
      return json(403, { error: "Tu rol no tiene permiso para administrar usuarios." });
    }

    if (body.action === "upsert") {
      const user = await upsertAuthUser(supabaseUrl, serviceRoleKey, body.user || {});
      return json(200, { ok: true, user });
    }

    if (body.action === "delete") {
      const result = await deleteAuthUser(supabaseUrl, serviceRoleKey, body.user || {});
      return json(200, { ok: true, ...result });
    }

    return json(400, { error: "Accion no reconocida." });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || "Error inesperado." });
  }
};

async function currentUser(supabaseUrl, serviceRoleKey, token) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.msg || data.message || "Sesion invalida."), { statusCode: 401 });
  return data;
}

async function loadAppState(supabaseUrl, serviceRoleKey, stateId) {
  const response = await fetch(`${supabaseUrl}/rest/v1/app_state?id=eq.${encodeURIComponent(stateId)}&select=data`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
    },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error("No se pudo leer la parametria de permisos.");
  return data[0]?.data || {};
}

function canManageUsers(state, email) {
  const callerEmail = normalizeEmail(email);
  const user = (state.users || []).find((item) => normalizeEmail(item.email) === callerEmail && item.active);
  const role = (state.roles || []).find((item) => item.id === user?.roleId);
  return Boolean(role?.permissions?.includes("users:manage"));
}

async function upsertAuthUser(supabaseUrl, serviceRoleKey, input) {
  const email = normalizeEmail(input.email);
  if (!email) throw Object.assign(new Error("El correo es obligatorio."), { statusCode: 400 });

  const existing = input.id ? { id: input.id } : await findAuthUserByEmail(supabaseUrl, serviceRoleKey, email);
  const payload = {
    email,
    email_confirm: true,
    user_metadata: { name: input.name || email },
  };
  if (input.password) payload.password = input.password;

  if (existing?.id) {
    const response = await adminFetch(supabaseUrl, serviceRoleKey, `/auth/v1/admin/users/${existing.id}`, "PUT", payload);
    return compactUser(response);
  }

  if (!input.password) throw Object.assign(new Error("La contrasena inicial es obligatoria para crear el usuario."), { statusCode: 400 });
  const response = await adminFetch(supabaseUrl, serviceRoleKey, "/auth/v1/admin/users", "POST", payload);
  return compactUser(response);
}

async function deleteAuthUser(supabaseUrl, serviceRoleKey, input) {
  const email = normalizeEmail(input.email);
  const existing = input.id ? { id: input.id } : await findAuthUserByEmail(supabaseUrl, serviceRoleKey, email);
  if (!existing?.id) return { deleted: false };
  await adminFetch(supabaseUrl, serviceRoleKey, `/auth/v1/admin/users/${existing.id}`, "DELETE");
  return { deleted: true };
}

async function findAuthUserByEmail(supabaseUrl, serviceRoleKey, email) {
  const response = await adminFetch(supabaseUrl, serviceRoleKey, "/auth/v1/admin/users?page=1&per_page=1000", "GET");
  const users = Array.isArray(response) ? response : response.users || [];
  return users.find((item) => normalizeEmail(item.email) === email) || null;
}

async function adminFetch(supabaseUrl, serviceRoleKey, path, method, payload) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.msg || data.message || data.error_description || "Supabase Auth rechazo la operacion."), { statusCode: response.status });
  }
  return data;
}

function compactUser(user) {
  return {
    id: user.id,
    email: user.email,
  };
}
