# Fabric Video Editor

The code for the [Fabric Video Editor](https://medium.com/@hamza201001/fabric-video-editor-part-1-setting-up-your-canvas-for-creativity-4ee014c0fe47) tutorial series on Medium, which builds a browser video editor on top of [Fabric.js](https://fabricjs.com) one part at a time. The articles are where the explanation lives, so the code here is kept deliberately light on comments.

Every part has a branch named after it, such as `Part-1-Setting-Up-Your-Canvas-for-Creativity` and `Part-2-Going-Beyond-Rectangles`, holding the repository exactly as it stood at the end of that part. `main` tracks the latest published part.

## Running it

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` if the renderer runs somewhere other than the default.

### Exporting to MP4

Export runs in a separate Node process that lives in `renderer/`. It has its own dependencies, so install it separately:

```bash
cd renderer
npm install
npm start
```

It listens on port 4000 and needs no FFmpeg install of its own. Media that only exists in the browser, such as uploaded files, cannot be exported until it is uploaded to the server.

## Licence

The code is MIT licensed. The bundled font and sample media carry their own notes next to the files.
