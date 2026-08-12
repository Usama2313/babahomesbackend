# Fix Image Loading and Watermark, Update QR & WhatsApp Display

## Goal Description

Address the persistent "Could not load any images" error during video conversion, ensure the watermark appears on front pictures with a 25x25 px size, and apply the requested UI changes:
- QR code should be displayed as a static image (no click interaction).
- WhatsApp number should be shown as plain text (no tel: link).

## User Review Required

> [!IMPORTANT]
> Verify that the watermark size (25 px × 25 px) matches the design expectations and that the QR code remains a static image.
>
> Confirm that the WhatsApp number displayed in the payment modal is plain text and not clickable.

## Open Questions

> [!QUESTION]
> Do you want the watermark to be overlaid on *all* property images (including gallery thumbnails) or only the main/front image displayed in the hero section?
>
> Should the watermark be applied client‑side during video conversion, or should it be pre‑applied to the stored images on the backend?

## Proposed Changes

---
### Frontend (React – `PropertyDetails.jsx`)

#### Image Loading Fix
- Refactor `loadImg` to always use an absolute URL pointing to the backend (`http://localhost:5000/...`).
- Set `crossOrigin = 'anonymous'` on the `Image` element before assigning `src`.
- Add robust error handling and console warnings for failed loads.
- Ensure the function returns `null` on failure so the caller can filter out bad images.

#### Watermark Integration
- Import the watermark PNG (e.g., `src/assets/watermark.png`).
- In the canvas drawing loop, after `ctx.drawImage(img, ...)`, draw the watermark:
  ```js
  const wm = new Image();
  wm.src = watermarkUrl; // imported URL
  wm.onload = () => {
    const wmW = 25;
    const wmH = 25;
    const padding = 8; // 8px from right/bottom edges
    ctx.drawImage(wm, canvasW - wmW - padding, canvasH - hmH - padding, wmW, wmH);
  };
  ```
- Apply this for every frame (including the first front image) before the video recorder captures the canvas.

#### QR Code Display
- In `post-property` modal component, replace any `<a>` wrapper around the QR image with a plain `<img>`.
- Ensure CSS `cursor: default;` so it feels non‑interactive.

#### WhatsApp Number Display
- Locate the JSX where the WhatsApp number is rendered in the payment modal.
- Change from `<a href="tel:...">` to a simple `<span>` or `<p>` with the number text.
- Remove any `onClick` handlers.

---
### Backend (Express – `index.js`)

- Verify static file serving of `/uploads` includes CORS headers (already reordered). No further changes needed unless additional caching headers are desired.

---
### Assets

- Add `watermark.png` (25 × 25 px, transparent PNG) to `frontend/src/assets/`.

## Verification Plan

### Automated Tests
- Run the app locally and click **Convert Images to Video**.
- Confirm the toast no longer shows "Could not load any images".
- Verify the generated video preview contains the watermark in the bottom‑right corner.

### Manual Checks
- Open the property page, ensure the watermark overlays the main image.
- Open the payment modal (`/post-property`), confirm:
  - QR code is a static image (cursor remains default, clicking does nothing).
  - WhatsApp number appears as plain text.
- Inspect network tab to see image requests succeed with `200 OK` and CORS headers.

---
### Rollback
- All changes are confined to the `PropertyDetails.jsx` component and modal component; revert by restoring previous file versions if needed.
