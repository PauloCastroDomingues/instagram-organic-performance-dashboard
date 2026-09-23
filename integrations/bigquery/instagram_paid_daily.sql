-- Meta Ads data already available in the SSOT official deduplicated view.
-- Reach and landing_page_views remain NULL because the current collector does not ingest them.
SELECT
  data,
  origem,
  campanha_id,
  campanha_nome,
  SAFE_CAST(investimento AS NUMERIC) AS investimento,
  SAFE_CAST(cliques AS INT64) AS cliques,
  SAFE_CAST(impressoes AS INT64) AS impressoes,
  CAST(NULL AS INT64) AS alcance,
  CAST(NULL AS INT64) AS landing_page_views,
  ingest_ts,
  'marketing_spend_campaign_daily_dedup' AS fonte,
  'parcial_sem_alcance_lpv' AS status_dado
FROM `reise-ssot.mart_growth_us.marketing_spend_campaign_daily_dedup`
WHERE origem = 'meta_ads'
ORDER BY data, campanha_nome;
