// Client adapté de KOTP, secrets exclusivement côté serveur.
const DEFAULT_PROXY='https://ranking-stalking-proxy.vercel.app';
const MAX_ATTEMPTS=4;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class ApiError extends Error {
  constructor(status, context) { super(`${context}: HTTP ${status}`); this.status = status; }
}

export async function makeFfbClient({ email, password, firebaseApiKey, fetchImpl = fetch, proxy = DEFAULT_PROXY, pause = wait }) {
  if (!email || !email.includes('@') || !password) throw new Error('Renseigner l’adresse e-mail FFB et le mot de passe');
  const apiKey = typeof firebaseApiKey === 'string' ? firebaseApiKey.trim() : '';
  if (!apiKey) throw new Error('Renseigner la clé Firebase FFB');
  let token = '', refreshToken = '', expiry = 0, easi = '';

  async function request(url, opts = {}, context = 'API') {
    let last;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetchImpl(url, { ...opts, signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new ApiError(res.status, context);
        return await res.json();
      } catch (e) {
        last = e;
        const temporary = !(e instanceof ApiError) || [408, 425, 429, 500, 502, 503, 504].includes(e.status);
        if (!temporary || attempt === MAX_ATTEMPTS) break;
        await pause(Math.min(12000, 700 * 2 ** (attempt - 1)));
      }
    }
    throw last;
  }

  async function signin() {
    const data = await request('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + encodeURIComponent(apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true, clientType: 'CLIENT_TYPE_WEB' })
    }, 'Authentification FFB');
    if (!data?.idToken || !data?.refreshToken) throw new Error('Connexion FFB : jetons manquants');
    token = data.idToken; refreshToken = data.refreshToken;
    expiry = Date.now() + Math.max(60, Number(data.expiresIn) || 3600) * 1000 - 60000;
    easi = '';
  }

  async function ensureToken() {
    if (token && Date.now() < expiry) return;
    if (!refreshToken) return signin();
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
    const data = await request('https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString()
    }, 'Renouvellement FFB');
    if (!data?.id_token) throw new Error('Impossible de renouveler la session FFB');
    token = data.id_token; refreshToken = data.refresh_token || refreshToken;
    expiry = Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000 - 60000;
    easi = '';
  }

  async function call(base, path, params = {}, bearer = null) {
    await ensureToken();
    const doCall = async tok => request(proxy.replace(/\/$/, '') + '/api/ffb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify({ base, path, params })
    }, `FFB ${base}/${path}`);
    try { return await doCall(bearer || token); }
    catch (e) {
      if (e.status !== 401) throw e;
      // Le jeton FFB est devenu invalide pendant la lecture : renouveler puis retenter.
      expiry = 0; await ensureToken(); return doCall(token);
    }
  }

  async function easiToken() {
    if (easi) return easi;
    const data = await call('lancelot', 'users/me/easi-token');
    easi = typeof data === 'string' ? data : data?.token || data?.easi_token || data?.easiToken || '';
    return easi;
  }

  async function ranking(pid, seasonId) {
    const path = `api/persons/${pid}/ranking-page`, params = { seasonId };
    let error;
    try { return await call('www', path, params); }
    catch (e) { error = e; }
    // En cas de 401/403 sur www, l'API accepte parfois le jeton EASI.
    if ([401, 403].includes(error?.status)) {
      try {
        const et = await easiToken();
        if (et) {
          // Essayer l'ancien jeton directement, puis le jeton EASI, sans écraser la session.
          return await request(proxy.replace(/\/$/, '') + '/api/ffb', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + et },
            body: JSON.stringify({ base: 'www', path, params })
          }, 'FFB classement EASI');
        }
      } catch { /* lancelot est une alternative existante dans KOTP */ }
    }
    try { return await call('lancelot', `persons/${pid}/ranking-page`, params); }
    catch { throw error; }
  }

  async function registration(pid) {
    // Historique FFB, consulté uniquement pour les licences actuellement masquées.
    return call('www', `api/persons/${pid}/registrations`);
  }

  await signin();
  return {
    currentSeason: () => call('lancelot', 'seasons/current'),
    ranking,
    registration,
    sessions: (id,currentPage=1,maxPerPage=80) => call('www', `api/competitions/simultaneous/${id}/sessions`, {currentPage,maxPerPage}),
    sessionRanking: (id, currentPage=1, maxPerPage=80, route='results') => { if (!['results','competitions'].includes(route)) throw Error('Route invalide'); return call('www', `api/${route}/sessions/${id}/ranking`, {paginate:true,currentPage,maxPerPage}); }
  };
}

