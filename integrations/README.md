# Instagram data integration

This integration reuses the existing BigQuery SSOT and keeps Google Sheets as the dashboard's auditable delivery layer.

## Sources

- Organic posts and stories: existing `posts ` and `Stories` tabs.
- Instagram sessions: `shopify_sessions_channels_daily_hob_v`, filtered to human Instagram traffic.
- Paid Instagram/Meta: `marketing_spend_campaign_daily_dedup`, filtered to `origem = 'meta_ads'`.

## Google Sheets destinations

- `instagram_sessions`
- `instagram_paid`

## Setup

1. Open the Apps Script project that already has BigQuery access to `reise-ssot`.
2. Add `InstagramBigQuerySync.gs`.
3. Enable the Advanced Google service `BigQuery API`.
4. Run `SOCIAL_syncInstagramData` once and authorize it.
5. Validate dates, channel values and freshness in both tabs.
6. Run `SOCIAL_installDailyTrigger` only after validation.

## Protected dashboard endpoint

1. Add a strong random value to the Apps Script property `SOCIAL_API_TOKEN`.
2. Run `SOCIAL_previewApiPayload` and inspect the execution log.
3. Deploy the script as a web app that executes as the owner.
4. Keep the deployment URL and token out of frontend code.
5. Configure them only as Vercel server environment variables:
   - `SOCIAL_DATA_API_URL`
   - `SOCIAL_DATA_API_TOKEN`

The endpoint exposes daily aggregates only. Campaign names are intentionally omitted. Invalid requests receive `{ "ok": false, "error": "unauthorized" }`.

The sync replaces sheet data only after both queries finish successfully. It does not delete or mutate BigQuery data.

## Known limitation

The current official Meta collector provides spend, clicks and impressions. `alcance` and `landing_page_views` remain blank until the existing collector is extended and validated.
