# BrisKola

I punti della **briscola**, sul telefono. Niente account, niente server: partite, giocatori e storico
restano nel browser del dispositivo e l'app funziona anche offline una volta installata.

## Cosa fa

- **Partite** singolo (1v1), a coppie (2v2) e in tre (1v1v1).
- **Mano per mano**: a fine mano scrivi i punti carta con il tastierino numerico dell'iPhone.
  Una mano vale sempre 120: scrivi un lato e l'altro si calcola da solo (con tre giocatori ne scrivi due).
- **Due modi di contare**: *a mani* (1 punto a chi vince la mano, 2 per il cappotto) oppure *a carte* (somma dei punti carta). Opzionale: "prima a N".
- **Storico a tabella** pensato per chi gioca sempre con la stessa coppia, anche con 30+ partite:
  - elenco di coppie, sfide e tavoli in tre ordinabile (partite, V-P-N, Δ, forma) con ricerca per nome;
  - dettaglio con partite, % vittorie, serie in corso, migliore serie, mani vinte e carte;
  - barre della differenza per partita e linea cumulata;
  - risultati contro ogni coppia avversaria;
  - tabella di tutte le partite, filtrabile, con le mani di ogni partita espandibili.
- **Dati tuoi**: esporta/importa un backup `briskola.json` dalle Impostazioni. Tema chiaro/scuro.

## Installare su iPhone

L'app è una PWA. iOS richiede un indirizzo **HTTPS** per farla funzionare offline, quindi va pubblicata
una sola volta. Il modo più semplice è GitHub Pages, già configurato in questa repo:

1. Fai il push su GitHub (branch `main`).
2. Nel repo: **Settings → Pages → Source: GitHub Actions**.
3. Alla fine del workflow *Pubblica su GitHub Pages* l'indirizzo è `https://<utente>.github.io/<repo>/`.
4. Sull'iPhone apri il link in **Safari** → Condividi → **Aggiungi a Home**.
5. Apri BrisKola **sempre dall'icona in Home**: da qui in poi funziona anche in modalità aereo.

Note:

- I dati stanno nel telefono (`localStorage`). Usa l'icona in Home, non Safari, e non cancellare i dati dei siti.
- Fai ogni tanto **Impostazioni → Esporta**: è il tuo backup.
- Alternative a GitHub Pages: Netlify Drop o Cloudflare Pages con la cartella `out/` (vedi sotto).
  Se il sito non sta alla radice del dominio, builda con `BASE_PATH=/sottocartella`.

## Sviluppo

Richiede Node 22.

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run build        # genera il sito statico in out/
npm start            # serve out/ in locale
```

Stack: Next.js (export statico), React 19, Tailwind CSS 4, componenti base-ui / shadcn.

## Struttura

```
app/                    layout, stili, pagina
components/briscola/    schermate (tavolo, partita, storico, gruppo, impostazioni)
  hand-pad.tsx          inserimento punti con tastierino nativo
  history-view.tsx      storico: tabella dei gruppi
  group-view.tsx        dettaglio gruppo: KPI, grafici, tabelle
lib/game.ts             regole (120 a mano, cappotto) e statistiche
lib/storage.ts          salvataggio e validazione del backup
public/sw.js            service worker (cache-first, offline)
```

I dati sono salvati con la chiave `briscola.tavolo.v1`. Per forzare l'aggiornamento della cache
dopo una release cambia `VERSION` in `public/sw.js`.

## Licenza

MIT, vedi [LICENSE](LICENSE).
