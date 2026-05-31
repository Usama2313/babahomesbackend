/**
 * Watermark utility for property4-u.com
 * Applies a professional diagonal repeating watermark pattern on images and videos.
 */

const WATERMARK_TEXT = 'www.property4-u.com';

const loadLogoImage = (logoUrl) => {
  if (!logoUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
};

/**
 * Draw repeating diagonal watermark pattern on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width  - canvas width
 * @param {number} height - canvas height
 * @param {HTMLImageElement|null} logoImg - optional logo image to use instead of text
 */
const drawWatermarkPattern = (ctx, width, height, logoImg = null) => {
  if (logoImg) {
    ctx.save();
    // Bounding box size (approx 15% of canvas width for professional balance)
    const maxSize = Math.max(80, width * 0.15);
    let newWidth, newHeight;

    // Proportionally calculate both height and width based on logo aspect ratio
    if (logoImg.width >= logoImg.height) {
      newWidth = maxSize;
      newHeight = logoImg.height * (maxSize / logoImg.width);
    } else {
      newHeight = maxSize;
      newWidth = logoImg.width * (maxSize / logoImg.height);
    }

    // Position with 2% padding, shifted to the left by 15% of width to avoid card overlays (like wishlist heart)
    const padding = Math.max(10, width * 0.02);
    const x = width - newWidth - padding - (width * 0.15);
    const y = padding;

    ctx.globalAlpha = 0.45; // decreased opacity for a softer blend
    ctx.drawImage(logoImg, x, y, newWidth, newHeight);
    ctx.restore();
    return;
  }


  const fontSize = Math.max(10, Math.round(Math.min(width, height) / 35));
  ctx.save();

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate spacing for the repeating pattern
  const textWidth = ctx.measureText(WATERMARK_TEXT).width;
  const spacingX = textWidth + fontSize * 3;
  const spacingY = fontSize * 4;

  // Rotate -30 degrees for diagonal effect
  const angle = -30 * (Math.PI / 180);

  // We need to cover the entire canvas even after rotation,
  // so expand the area we iterate over
  const diagonal = Math.sqrt(width * width + height * height);

  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);

  const startX = -diagonal;
  const endX = diagonal;
  const startY = -diagonal;
  const endY = diagonal;

  for (let y = startY; y < endY; y += spacingY) {
    for (let x = startX; x < endX; x += spacingX) {
      ctx.strokeText(WATERMARK_TEXT, x, y);
      ctx.fillText(WATERMARK_TEXT, x, y);
    }
  }

  ctx.restore();

  // Also draw a larger, more prominent centered watermark
  ctx.save();
  const centerFontSize = Math.max(14, Math.round(Math.min(width, height) / 25));
  ctx.font = `bold ${centerFontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.lineWidth = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle);
  ctx.strokeText(WATERMARK_TEXT, 0, 0);
  ctx.fillText(WATERMARK_TEXT, 0, 0);
  ctx.restore();
};

/**
 * Apply watermark to an image File.
 * @param {File} file - The image file
 * @param {string} logoUrl - Optional logo URL for watermarking
 * @returns {Promise<File>} - Watermarked image file
 */
export const applyImageWatermark = (file, logoUrl = null) => {
  return new Promise((resolve, reject) => {
    loadLogoImage(logoUrl).then(logoImg => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Draw the original image
        ctx.drawImage(img, 0, 0);

        // Draw the watermark pattern on top
        drawWatermarkPattern(ctx, img.width, img.height, logoImg);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create watermarked image blob'));
              return;
            }
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            URL.revokeObjectURL(url);
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  });
};

/**
 * Apply watermark to a video File by extracting a frame, watermarking it,
 * and overlaying the watermark on each rendered frame using canvas + captureStream.
 *
 * NOTE: Full client-side video re-encoding with watermark overlay is complex and
 * resource-heavy. This implementation draws the watermark on video frames via
 * canvas + MediaRecorder. For very large videos this may be slow.
 *
 * @param {File} file - The video file
 * @param {string} logoUrl - Optional logo URL for watermarking
 * @returns {Promise<File>} - Watermarked video file
 */
export const applyVideoWatermark = (file, logoUrl = null) => {
  return new Promise((resolve, reject) => {
    loadLogoImage(logoUrl).then(logoImg => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        // Set up MediaRecorder to capture the canvas stream
        const stream = canvas.captureStream(30); // 30 fps

        // Try to add audio track from the video if available
        try {
          const audioCtx = new AudioContext();
          const source = audioCtx.createMediaElementSource(video);
          const destination = audioCtx.createMediaStreamDestination();
          source.connect(destination);
          source.connect(audioCtx.destination);
          destination.stream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
        } catch (e) {
          // No audio or audio context not supported, continue without audio
        }

        // Determine supported MIME type
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 2500000
        });

        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          URL.revokeObjectURL(url);
          const blob = new Blob(chunks, { type: 'video/webm' });
          const watermarkedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, '.webm'),
            { type: 'video/webm', lastModified: Date.now() }
          );
          resolve(watermarkedFile);
        };

        recorder.onerror = (e) => {
          URL.revokeObjectURL(url);
          reject(e.error || new Error('MediaRecorder error'));
        };

        // Start recording
        recorder.start();

        // Draw frames with watermark
        const drawFrame = () => {
          if (video.paused || video.ended) {
            recorder.stop();
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          drawWatermarkPattern(ctx, canvas.width, canvas.height, logoImg);
          requestAnimationFrame(drawFrame);
        };

        video.onplay = () => {
          drawFrame();
        };

        video.onended = () => {
          // Give the recorder a moment to capture the last frame
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 200);
        };

        // Start playing the video
        video.play().catch(err => {
          URL.revokeObjectURL(url);
          reject(err);
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video for watermarking'));
      };

      video.src = url;
    });
  });
};
