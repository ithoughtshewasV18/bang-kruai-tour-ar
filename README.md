# Bang Kruai Tour AR Starter Kit

Free browser-based image-tracking AR using MindAR and A-Frame.

## Included
- rear-camera WebAR;
- image/postcard tracking;
- transparent AR overlay;
- built-in shutter button;
- photo preview and Save Photo;
- no paid AR platform.

## Test the included demo

1. Upload the contents of this folder to GitHub Pages.
2. Open the published HTTPS page on your phone.
3. Tap **Start AR Camera**.
4. Point the phone at `assets/demo-marker.png`.
5. The placeholder Wat Chalo graphic appears.
6. Tap the round white shutter button.
7. Tap **Save Photo**.

## Replace the demo with Wat Chalo

### 1. Marker
Use the entire Wat Chalo postcard as the marker. Save it as:

`assets/wat-chalo-marker.jpg`

### 2. Compile the marker
Open the official MindAR compiler:

https://hiukim.github.io/mind-ar-js-doc/tools/compile/

Upload the postcard, click **Start**, download the `.mind` file, rename it:

`wat-chalo.mind`

Place it in:

`targets/wat-chalo.mind`

### 3. Replace the overlay
Replace:

`assets/ar-overlay.png`

with your transparent Wat Chalo master illustration.

### 4. Update index.html
Find the `imageTargetSrc:` line and replace the official demo URL with:

`imageTargetSrc: ./targets/wat-chalo.mind;`

## Publish with GitHub Pages

1. Create a public GitHub repository called `bang-kruai-tour-ar`.
2. Upload the contents of this folder. `index.html` must be at the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Select **main** and **/(root)**.
6. Save.
7. Use the HTTPS GitHub Pages link on your Google Sites camera icon.

## Six-attraction setup
For beginners, make one copy/repository per attraction. In each copy replace:
- the postcard marker;
- the `.mind` file;
- `assets/ar-overlay.png`;
- the page title.

## Testing
- Use Chrome on Android or Safari on iPhone.
- Allow camera access.
- Keep the postcard flat and well lit.
- Avoid glare.
- Keep the whole postcard visible until tracking begins.
- Camera access requires HTTPS; GitHub Pages provides it.
