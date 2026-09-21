# Reise Social Performance

Dashboard web para análise de performance orgânica do Instagram da Reise.

## Rodar localmente

```bash
npm install
npm run dev
```

Depois abra `http://localhost:3000`.

## Fonte de dados

A fonte inicial é o arquivo `data/instagram-posts.csv`, exportado da planilha Google `Social-2026`.

As colunas de origem permanecem com os nomes originais da exportação da Meta. A aplicação normaliza os dados em `lib/parsers.ts` e calcula métricas em `lib/metrics.ts`.

Para atualizar manualmente:

1. Exporte a aba da planilha como CSV.
2. Substitua `data/instagram-posts.csv`.
3. Reinicie o servidor local se necessário.

## Trocar por Google Sheets ou API

Os componentes não dependem do CSV diretamente. A troca futura deve acontecer em `data/load-posts.ts`:

- manter o retorno como `InstagramPost[]`;
- preservar `normalizeRows`;
- substituir apenas a leitura do arquivo por Google Sheets, Apps Script ou endpoint próprio.

Não há integração com a API da Meta, autenticação, banco de dados ou CMS nesta versão.
