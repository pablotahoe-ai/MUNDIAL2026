# App Mundial Resumen - carpeta lista para GitHub

Esta carpeta es la que tenes que subir a GitHub:

`github-pages`

## Que subir

Subi todo el contenido de esta carpeta, no la carpeta `outputs` completa.

Archivos principales:

- `index.html`
- `app.js`
- `styles.css`
- `backend-config.js`
- `hotspots.json`
- `panels.json`
- carpeta `assets`
- carpeta `data`

## Como publicarlo con GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Subi todos los archivos que estan dentro de esta carpeta.
3. En GitHub entra a `Settings`.
4. Entra a `Pages`.
5. En `Build and deployment`, elegi:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Guarda.
7. GitHub te va a dar una URL publica.

## Importante

La app ya esta conectada al Google Sheet/App Script desde:

`backend-config.js`

Mientras esa URL siga publicada correctamente, cualquier persona que abra la app desde GitHub Pages va a ver los links cargados en la hoja.
