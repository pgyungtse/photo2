# photo2

A small Node.js/HTML project for viewing or serving a `photos/` directory.

## Quick description

This repository contains a minimal web app to display photos from the `photos/` folder. It uses a simple static HTML frontend (`index.html`) and a small Node.js server (`app.js`) when you want to serve the site locally.

## Files

- `app.js`: (optional) Node.js server to serve the app.
- `index.html`: Frontend UI for viewing photos.
- `package.json`: Node.js metadata and scripts.
- `photos/`: Place your image files here (jpg, png, gif).

## Prerequisites

- Node.js (LTS recommended)

## Install & run

1. Install dependencies (if any):

```
npm install
```

2. Start the app (if `app.js` provides a server):

```
npm start
```

3. Or open `index.html` directly in your browser to view photos from the `photos/` folder.

## Notes

- Add your images to the `photos/` directory. Filenames should not contain spaces for best compatibility.
- If `npm start` fails, check `app.js` and `package.json` scripts for required configuration.

If you want, I can add a simple Express server or instructions to automatically list the images — tell me which you'd prefer.

## re-build in ubuntu local server (docker)

sudo docker stop takephoto

sudo docker rm takephoto

sudo docker build -t takephoto-app .

sudo docker run -d -p 3003:3003 --name takephoto --restart always -v /home/takephoto/photos:/app/photos takephoto-app