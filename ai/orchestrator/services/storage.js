export function createStorageService({
  supabaseUrl,
  supabaseServiceRoleKey,
  supabaseTable
}) {
  const supabaseEnabled = Boolean(supabaseUrl && supabaseServiceRoleKey);

  async function supabaseRequest(path, { method = "GET", body, preferReturn } = {}) {
    if (!supabaseEnabled) {
      return null;
    }
    const url = `${supabaseUrl}/rest/v1/${path}`;
    const headers = {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`
    };
    if (preferReturn) {
      headers.Prefer = "return=representation";
    }
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Supabase request failed (${response.status}): ${text || response.statusText}`
      );
    }
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  async function fetchLatestRecord(projectId) {
    if (!supabaseEnabled) {
      return null;
    }
    const projectFilter = projectId ? `&project_id=eq.${projectId}` : "";
    const rows = await supabaseRequest(
      `${supabaseTable}?select=version,record&order=version.desc&limit=1${projectFilter}`
    );
    if (!rows || !rows.length) {
      return null;
    }
    const row = rows[0];
    if (!row.record) {
      return null;
    }
    return {
      ...row.record,
      version: row.version
    };
  }

  async function fetchRecordByVersion(version) {
    if (!supabaseEnabled) {
      return null;
    }
    const rows = await supabaseRequest(
      `${supabaseTable}?select=version,record&version=eq.${version}&limit=1`
    );
    if (!rows || !rows.length) {
      return null;
    }
    const row = rows[0];
    if (!row.record) {
      return null;
    }
    return {
      ...row.record,
      version: row.version
    };
  }

  async function insertRecord(version, record) {
    if (!supabaseEnabled) {
      return null;
    }
    const rows = await supabaseRequest(supabaseTable, {
      method: "POST",
      preferReturn: true,
      body: {
        version,
        project_id: record.projectId || null,
        record,
        updated_at: new Date().toISOString()
      }
    });
    if (!rows || !rows.length) {
      return null;
    }
    const row = rows[0];
    return {
      ...row.record,
      version: row.version
    };
  }

  async function updateRecord(version, record) {
    if (!supabaseEnabled) {
      return null;
    }
    const rows = await supabaseRequest(`${supabaseTable}?version=eq.${version}`, {
      method: "PATCH",
      preferReturn: true,
      body: {
        project_id: record.projectId || null,
        record,
        updated_at: new Date().toISOString()
      }
    });
    if (!rows || !rows.length) {
      return null;
    }
    const row = rows[0];
    return {
      ...row.record,
      version: row.version
    };
  }

  async function getLatestRecord(projectId) {
    if (!supabaseEnabled) {
      throw new Error(
        "Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    return fetchLatestRecord(projectId);
  }

  async function loadDiscoveryRecord(version) {
    if (!supabaseEnabled) {
      throw new Error(
        "Supabase is required for persistence. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
      );
    }
    return fetchRecordByVersion(version);
  }

  return {
    supabaseEnabled,
    fetchLatestRecord,
    fetchRecordByVersion,
    insertRecord,
    updateRecord,
    getLatestRecord,
    loadDiscoveryRecord
  };
}
