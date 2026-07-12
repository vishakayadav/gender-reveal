// src/ui/qr.js
import QRCode from 'qrcode';
export async function renderQR(canvas, text) {
  await QRCode.toCanvas(canvas, text, { width: 200 });
}
