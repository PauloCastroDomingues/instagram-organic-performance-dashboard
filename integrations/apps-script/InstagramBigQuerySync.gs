/**
 * BigQuery SSOT -> Social-2026 spreadsheet.
 *
 * Required Apps Script services:
 * - Advanced Google service: BigQuery API
 *
 * Optional script properties:
 * - SOCIAL_BQ_PROJECT_ID (default: reise-ssot)
 * - SOCIAL_SPREADSHEET_ID (default: current Social-2026 workbook)
 * - SOCIAL_LOOKBACK_DAYS (default: 400)
 */

const SOCIAL_SYNC = {
  projectId: PropertiesService.getScriptProperties().getProperty('SOCIAL_BQ_PROJECT_ID') || 'reise-ssot',
  spreadsheetId: PropertiesService.getScriptProperties().getProperty('SOCIAL_SPREADSHEET_ID') || '10wKKS6BEWh0x-calS693AshC9TgYId_sH3pO3C7BkL0',
  lookbackDays: Number(PropertiesService.getScriptProperties().getProperty('SOCIAL_LOOKBACK_DAYS') || 400),
  location: 'US'
};

function SOCIAL_syncInstagramData() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sessions = SOCIAL_query_(SOCIAL_sessionsSql_());
    const paid = SOCIAL_query_(SOCIAL_paidSql_());

    // Sheets are replaced only after both BigQuery queries succeed.
    SOCIAL_replaceSheet_('instagram_sessions', SOCIAL_sessionHeaders_(), sessions);
    SOCIAL_replaceSheet_('instagram_paid', SOCIAL_paidHeaders_(), paid);

    PropertiesService.getScriptProperties().setProperty('SOCIAL_LAST_SUCCESS_AT', new Date().toISOString());
    return { sessionsRows: sessions.length, paidRows: paid.length, status: 'ok' };
  } finally {
    lock.releaseLock();
  }
}

function SOCIAL_installDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'SOCIAL_syncInstagramData')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('SOCIAL_syncInstagramData')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .inTimezone('America/Sao_Paulo')
    .create();
}

/**
 * Protected JSON endpoint consumed only by the dashboard server.
 * Set SOCIAL_API_TOKEN in Apps Script project properties before deployment.
 */
function doGet(event) {
  const expectedToken = PropertiesService.getScriptProperties().getProperty('SOCIAL_API_TOKEN') || '';
  const receivedToken = event && event.parameter ? String(event.parameter.token || '') : '';

  if (!expectedToken || receivedToken !== expectedToken) {
    return SOCIAL_json_({ ok: false, error: 'unauthorized' });
  }

  try {
    return SOCIAL_json_(SOCIAL_buildApiPayload_());
  } catch (error) {
    console.error(error);
    return SOCIAL_json_({ ok: false, error: 'data_unavailable' });
  }
}

function SOCIAL_previewApiPayload() {
  const payload = SOCIAL_buildApiPayload_();
  console.log(JSON.stringify({
    ok: payload.ok,
    generatedAt: payload.generatedAt,
    sourceUpdatedAt: payload.sourceUpdatedAt,
    coverage: payload.coverage,
    sessionsDays: payload.sessionsDaily.length,
    paidDays: payload.paidDaily.length,
    sessionsSample: payload.sessionsDaily.slice(-2),
    paidSample: payload.paidDaily.slice(-2),
    limitations: payload.limitations
  }, null, 2));
  return payload;
}

function SOCIAL_buildApiPayload_() {
  const spreadsheet = SpreadsheetApp.openById(SOCIAL_SYNC.spreadsheetId);
  const sessionsRows = SOCIAL_sheetObjects_(spreadsheet.getSheetByName('instagram_sessions'));
  const paidRows = SOCIAL_sheetObjects_(spreadsheet.getSheetByName('instagram_paid'));
  const sessionsByDate = {};
  const paidByDate = {};

  sessionsRows.forEach(row => {
    const date = SOCIAL_dateKey_(row.data);
    const type = String(row.tipo || 'unknown').toLowerCase();
    if (!date) return;
    if (!sessionsByDate[date]) {
      sessionsByDate[date] = { date, organic: 0, paid: 0, unknown: 0, total: 0, visitors: 0 };
    }
    const sessions = SOCIAL_number_(row.sessoes);
    const visitors = SOCIAL_number_(row.visitantes);
    if (type === 'organic' || type === 'paid') sessionsByDate[date][type] += sessions;
    else sessionsByDate[date].unknown += sessions;
    sessionsByDate[date].total += sessions;
    sessionsByDate[date].visitors += visitors;
  });

  paidRows.forEach(row => {
    const date = SOCIAL_dateKey_(row.data);
    if (!date) return;
    if (!paidByDate[date]) {
      paidByDate[date] = { date, spend: 0, clicks: 0, impressions: 0, reach: null, landingPageViews: null };
    }
    paidByDate[date].spend += SOCIAL_number_(row.investimento);
    paidByDate[date].clicks += SOCIAL_number_(row.cliques);
    paidByDate[date].impressions += SOCIAL_number_(row.impressoes);
  });

  const sessionDates = Object.keys(sessionsByDate).sort();
  const paidDates = Object.keys(paidByDate).sort();
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    sourceUpdatedAt: PropertiesService.getScriptProperties().getProperty('SOCIAL_LAST_SUCCESS_AT') || null,
    coverage: {
      sessions: { start: sessionDates[0] || null, end: sessionDates[sessionDates.length - 1] || null },
      paid: { start: paidDates[0] || null, end: paidDates[paidDates.length - 1] || null }
    },
    sessionsDaily: sessionDates.map(date => sessionsByDate[date]),
    paidDaily: paidDates.map(date => paidByDate[date]),
    limitations: ['paid_reach_unavailable', 'landing_page_views_unavailable', 'unknown_sessions_not_redistributed']
  };
}

function SOCIAL_sheetObjects_(sheet) {
  if (!sheet) throw new Error('Required integration sheet is missing');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(row => row.some(value => value !== '')).map(row => {
    const item = {};
    headers.forEach((header, index) => { item[header] = row[index]; });
    return item;
  });
}

function SOCIAL_dateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, 'America/Sao_Paulo', 'yyyy-MM-dd');
  }
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? '' : Utilities.formatDate(parsed, 'America/Sao_Paulo', 'yyyy-MM-dd');
}

function SOCIAL_number_(value) {
  if (value instanceof Date) return 0;
  const number = Number(value || 0);
  return isFinite(number) ? number : 0;
}

function SOCIAL_json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function SOCIAL_query_(query) {
  let result = BigQuery.Jobs.query({ query, useLegacySql: false, location: SOCIAL_SYNC.location }, SOCIAL_SYNC.projectId);
  const jobId = result.jobReference.jobId;

  while (!result.jobComplete) {
    Utilities.sleep(500);
    result = BigQuery.Jobs.getQueryResults(SOCIAL_SYNC.projectId, jobId, { location: SOCIAL_SYNC.location });
  }

  const rows = [];
  let page = result;
  do {
    (page.rows || []).forEach(row => rows.push(row.f.map(cell => cell.v === null ? '' : cell.v)));
    page = page.pageToken
      ? BigQuery.Jobs.getQueryResults(SOCIAL_SYNC.projectId, jobId, { location: SOCIAL_SYNC.location, pageToken: page.pageToken })
      : null;
  } while (page);

  return rows;
}

function SOCIAL_replaceSheet_(sheetName, headers, rows) {
  const spreadsheet = SpreadsheetApp.openById(SOCIAL_SYNC.spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Missing sheet: ${sheetName}`);

  const width = headers.length;
  if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
  if (sheet.getMaxRows() < rows.length + 1) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length + 1 - sheet.getMaxRows());

  const existingRows = Math.max(sheet.getLastRow() - 1, 0);
  if (existingRows) sheet.getRange(2, 1, existingRows, width).clearContent();
  sheet.getRange(1, 1, 1, width).setValues([headers]);
  const normalizedRows = SOCIAL_normalizeRows_(sheetName, rows);
  if (normalizedRows.length) sheet.getRange(2, 1, normalizedRows.length, width).setValues(normalizedRows);
  sheet.setFrozenRows(1);
}

function SOCIAL_normalizeRows_(sheetName, rows) {
  const numericIndexes = sheetName === 'instagram_sessions'
    ? [4, 5]
    : [4, 5, 6, 7, 8];

  return rows.map(row => row.map((value, index) => {
    if (!numericIndexes.includes(index)) return value;
    if (value === '' || value === null || value === undefined) return '';
    const number = Number(value);
    return isFinite(number) ? number : '';
  }));
}

function SOCIAL_sessionsSql_() {
  return `
    SELECT
      FORMAT_DATE('%Y-%m-%d', data) AS data,
      plataforma_referencia,
      canal_origem,
      tipo,
      SUM(SAFE_CAST(visitantes AS INT64)) AS visitantes,
      SUM(SAFE_CAST(sessoes AS INT64)) AS sessoes,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', MAX(ingest_ts)) AS ingest_ts,
      'shopify_sessions_channels_daily_hob_v' AS fonte,
      IF(LOWER(tipo) IN ('paid', 'organic'), 'classificado', 'revisar') AS status_dado,
      IF(LOWER(tipo) IN ('paid', 'organic'), NULL, 'Canal do Instagram sem classificacao paid/organic conclusiva') AS observacao
    FROM \`reise-ssot.mart_growth_us.shopify_sessions_channels_daily_hob_v\`
    WHERE LOWER(human_or_bot_session) = 'human'
      AND data >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL ${SOCIAL_SYNC.lookbackDays} DAY)
      AND (
        REGEXP_CONTAINS(LOWER(COALESCE(plataforma_referencia, '')), r'instagram|l\\.instagram')
        OR REGEXP_CONTAINS(LOWER(COALESCE(canal_origem, '')), r'instagram|l\\.instagram')
      )
    GROUP BY 1, 2, 3, 4, 8, 9, 10
    ORDER BY data, tipo, canal_origem
  `;
}

function SOCIAL_paidSql_() {
  return `
    SELECT
      FORMAT_DATE('%Y-%m-%d', data) AS data,
      origem,
      campanha_id,
      campanha_nome,
      investimento,
      cliques,
      impressoes,
      NULL AS alcance,
      NULL AS landing_page_views,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', ingest_ts) AS ingest_ts,
      'marketing_spend_campaign_daily_dedup' AS fonte,
      'parcial_sem_alcance_lpv' AS status_dado
    FROM \`reise-ssot.mart_growth_us.marketing_spend_campaign_daily_dedup\`
    WHERE origem = 'meta_ads'
      AND data >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL ${SOCIAL_SYNC.lookbackDays} DAY)
    ORDER BY data, campanha_nome
  `;
}

function SOCIAL_sessionHeaders_() {
  return ['data', 'plataforma_referencia', 'canal_origem', 'tipo', 'visitantes', 'sessoes', 'ingest_ts', 'fonte', 'status_dado', 'observacao'];
}

function SOCIAL_paidHeaders_() {
  return ['data', 'origem', 'campanha_id', 'campanha_nome', 'investimento', 'cliques', 'impressoes', 'alcance', 'landing_page_views', 'ingest_ts', 'fonte', 'status_dado'];
}
