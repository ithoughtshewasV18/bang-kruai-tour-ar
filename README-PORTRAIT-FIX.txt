WAT CHALO PHONE PORTRAIT HOTFIX

WHY LAPTOP WORKED BUT PHONE DID NOT
The earlier app used MediaPipe's landscape selfie model for every device.
That model is optimized for landscape video-call frames. On a portrait phone,
it can repeatedly lose the same side of the head.

THIS FIX
- Uses the square/general selfie model on portrait phones.
- Keeps the landscape model on laptops and landscape screens.
- Requests a portrait camera stream on phones.
- Keeps the corrected matching crop for the camera image and mask.
- Retains more hair and ear edges.

INSTALL
1. Extract the ZIP.
2. Upload app.js to the GitHub repository root.
3. Replace the current app.js.
4. Commit to main.
5. In Netlify choose Trigger deploy > Deploy project without cache.
6. Wait for Published.
7. Test:
   https://bang-kruai-tour-ar.netlify.app/?v=portraitfix1
