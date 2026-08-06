# Wat Chalo Markerless AR Photo — Replacement Files

This version removes postcard recognition completely.

It opens the front camera, separates the visitor from the real background using MediaPipe person segmentation, places the visitor in front of the supplied Wat Chalo photograph, and provides a shutter and Save Photo button.

## Replace the current GitHub repository files

Upload these files to the root of your existing `bang-kruai-tour-ar` repository:

- `index.html`
- `style.css`
- `app.js`
- `wat-chalo-background.jpg`
- `.nojekyll`

When GitHub asks, replace the existing `index.html`, `style.css`, and `app.js`.

The old marker files can remain temporarily, but they are no longer used:
- `demo-marker.png`
- `ar-overlay.png`
- `PUT-YOUR-MIND-FILE-HERE.txt`

## Publish

GitHub Pages will redeploy automatically after the commit.

After the Pages workflow turns green, open:

`https://ithoughtshewasv18.github.io/bang-kruai-tour-ar/?v=markerless1`

## Test on phone

1. Open the GitHub Pages link on a phone.
2. Tap **Start AR Camera**.
3. Allow camera access.
4. Stand in the camera view.
5. Wat Chalo should replace the real background.
6. Tap the white shutter.
7. Tap **Save Photo**.

## Notes

- The first load can take several seconds because the MediaPipe model is downloaded.
- The AI runs in the browser on the visitor's device.
- Front camera is the default.
- The circular-arrow button changes cameras.
- Strong, even lighting improves the person's cutout.
- Chrome on Android is recommended. Safari on iPhone should also be tested before the exhibit.
