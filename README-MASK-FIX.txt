WAT CHALO MASK ALIGNMENT HOTFIX

This fixes the repeated missing side of the head.

CAUSE
The camera was center-cropped to fill the phone screen, but the person mask was stretched across the whole screen without using the same crop. This caused one side of the face/head to be removed consistently.

CHANGES
- Applies the exact same crop coordinates to the video and mask.
- Mirrors both consistently for the front camera.
- Lowers the edge threshold slightly to retain hair and ears.
- Adds a very small edge blur for smoother hair and shoulder outlines.

INSTALL
1. Extract this ZIP.
2. Upload app.js to the root of the GitHub repository.
3. Replace the existing app.js.
4. Commit to main.
5. In Netlify choose Trigger deploy > Deploy project without cache.
6. Wait for Published.
7. Test:
   https://bang-kruai-tour-ar.netlify.app/?v=maskfix1
