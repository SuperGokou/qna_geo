# GEO Executive Workspace

Private decision workspace for Yangzhou / Taizhou GEO supplier and regional-agent evaluation. React frontend on GitHub Pages; authenticated Cloudflare Worker backend; DeepSeek answers grounded in a private document library.

## Security boundaries

- GitHub contains application code, not `.env`, access passwords, raw PDFs, extracted evidence, or Worker assets. Some overview text is part of the public frontend bundle; do not put confidential information in frontend source.
- DeepSeek credentials exist only in the local `.env` and Cloudflare Secrets. Never use a `VITE_` variable for secrets.
- The shared access password is in local `.access.txt`. Authentication is password possession, not verified personal identity. Tokens stay in browser memory and expire after two hours. Logout forgets the token; rotate `SESSION_SECRET` to revoke all issued tokens immediately.
- Every private asset request passes through Worker authentication. CORS is restricted to the GitHub Pages origin; authentication is still required without an Origin header.
- Login and chat requests are rate limited. Cloudflare rate-limit counters are location-scoped and are not a strict global spending cap. Set provider billing alerts separately.
- The consent checkbox discloses that questions, recent conversation and retrieved evidence are sent to DeepSeek. Browser speech recognition can send audio to the browser vendor's service, not DeepSeek.

## Local development

Requires Node 22+, and the locally retained private `data/`, `knowledge/`, `private/` and preview files. A fresh clone intentionally does not contain those materials. Restore them only from an authorized private backup.

```sh
npm ci
npm run build
npm start
```

The server binds to `127.0.0.1` starting at port 4317 and writes the chosen URL to `tmp/server.json`. The local `.env` uses the keys in `.env.example`.

## Production deployment

```sh
node scripts/prepare-worker.js
node scripts/publish-worker-secrets.js
npx wrangler deploy --config worker/wrangler.jsonc
```

The secret publisher reads the three server credentials from `.env` and sends them over stdin without logging their values. Authenticate Wrangler first. `prepare-worker.js` splits large PDFs into protected 8 MB assets; the Worker streams them back as a PDF.

Set GitHub repository variable `VITE_API_BASE_URL` to the deployed Worker HTTPS origin. Enable GitHub Pages with source GitHub Actions. Push to `main` to publish the frontend. If changing the frontend domain, update the Worker `ALLOWED_ORIGIN` setting as well.

For content changes, update the private corpus, rerun ingestion/corrections as needed, prepare Worker assets, then deploy the Worker. The frontend workflow never uploads the private corpus. For rollback, restore a known-good code revision and redeploy with its matching private corpus; retain private versioned backups separately.

## Answer policy

The scope guard and server prompt restrict the assistant to GEO technology, supplier diligence and Yangzhou / Taizhou agency cooperation. Answers distinguish project facts, vendor claims, analysis and unknowns; citations must resolve to the retrieved corpus. Vendor claims are not independent verification. The assistant has no live web search and cannot guarantee factual correctness or resist every adversarial prompt. Recheck commercial terms and material decisions against original documents and current contracts.

## Voice and connectivity

Voice input uses browser SpeechRecognition in Chinese; answer read-aloud uses speechSynthesis. Support varies by browser, installed voices and network. Voice is user-initiated and never auto-submits a transcript. Text input remains available when recognition fails. GitHub Pages, workers.dev and browser speech services require testing on the recipient's actual mainland China network; this deployment is not a mainland availability guarantee.

## Verification

```sh
npm test
npm run build
node scripts/browser-qa.mjs
```

Corpus tests require the local private files. Browser QA additionally requires Playwright with Chrome and a running local server; `QA_URL` can target the deployed frontend. Real model smoke tests use the configured account and incur normal API usage. Physical microphone capture and real speaker output require manual verification.
