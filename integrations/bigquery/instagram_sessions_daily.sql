-- Instagram sessions from the existing ShopifyQL SSOT.
-- Read-only query. Validate distinct channel values before treating the split as final.
SELECT
  data,
  plataforma_referencia,
  canal_origem,
  tipo,
  SUM(SAFE_CAST(visitantes AS INT64)) AS visitantes,
  SUM(SAFE_CAST(sessoes AS INT64)) AS sessoes,
  MAX(ingest_ts) AS ingest_ts,
  'shopify_sessions_channels_daily_hob_v' AS fonte,
  CASE
    WHEN LOWER(tipo) IN ('paid', 'organic') THEN 'classificado'
    ELSE 'revisar'
  END AS status_dado,
  CASE
    WHEN LOWER(tipo) IN ('paid', 'organic') THEN NULL
    ELSE 'Canal do Instagram sem classificacao paid/organic conclusiva'
  END AS observacao
FROM `reise-ssot.mart_growth_us.shopify_sessions_channels_daily_hob_v`
WHERE LOWER(human_or_bot_session) = 'human'
  AND (
    REGEXP_CONTAINS(LOWER(COALESCE(plataforma_referencia, '')), r'instagram|l\.instagram')
    OR REGEXP_CONTAINS(LOWER(COALESCE(canal_origem, '')), r'instagram|l\.instagram')
  )
GROUP BY 1, 2, 3, 4, 8, 9, 10
ORDER BY data, tipo, canal_origem;
