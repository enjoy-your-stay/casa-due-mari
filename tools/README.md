# tools/

Strumenti di sviluppo. **Non fanno parte del sito pubblicato** (`node_modules/` e
`shots/` sono in `.gitignore`).

## Setup (una volta)

```
cd tools
npm install
```

Usa il Google Chrome già installato sul Mac (`channel: 'chrome'`), non scarica browser.

## Screenshot di tutte le lingue

Due terminali dalla cartella `tools/`:

```
npm run serve      # server statico su http://localhost:8000
npm run shot       # genera tools/shots/<lang>-<mobile|desktop>.png
```

`node shot.mjs it de` per limitare a certe lingue.
Lo script segnala in console eventuali errori JS o risorse mancanti per ogni pagina
(il 404 di `favicon.ico` è atteso e innocuo).
