import { projectBounds } from './geometry';
import type { Project } from './types';

export type ExportFormat = 'png' | 'pdf';

const EXPORT_EVENT = 'roomly:export';
const FONT_STACK =
  "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif";

export function requestExport(format: ExportFormat) {
  window.dispatchEvent(new CustomEvent(EXPORT_EVENT, { detail: { format } }));
}

export function listenForExport(handler: (format: ExportFormat) => void): () => void {
  const listener = (event: Event) => {
    const format = (event as CustomEvent<{ format?: ExportFormat }>).detail?.format;
    if (format === 'png' || format === 'pdf') handler(format);
  };
  window.addEventListener(EXPORT_EVENT, listener);
  return () => window.removeEventListener(EXPORT_EVENT, listener);
}

function safeFileName(name: string): string {
  return (name || 'room-plan').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'room-plan';
}

function totalArea(project: Project): number {
  return project.rooms.reduce((sum, room) => sum + room.w * room.d, 0);
}

function withHeader(image: HTMLCanvasElement, project: Project): HTMLCanvasElement {
  const headerH = Math.max(58, Math.round(image.width * 0.072));
  const pad = Math.round(image.width * 0.032);
  const out = document.createElement('canvas');
  out.width = image.width;
  out.height = image.height + headerH;
  const ctx = out.getContext('2d');
  if (!ctx) return image;

  ctx.fillStyle = '#fbf8f2';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.fillStyle = '#eadfd2';
  ctx.fillRect(0, headerH - 1, out.width, 1);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#4e4a41';
  ctx.font = `600 ${Math.max(20, Math.round(headerH * 0.3))}px ${FONT_STACK}`;
  ctx.fillText(project.name, pad, Math.round(headerH * 0.49));

  ctx.fillStyle = '#8a8173';
  ctx.font = `400 ${Math.max(11, Math.round(headerH * 0.17))}px ${FONT_STACK}`;
  const summary = `${project.rooms.length} 个房间 · ${totalArea(project).toFixed(1)} m² · 栖居 Roomly`;
  ctx.fillText(summary, pad, Math.round(headerH * 0.78));

  const date = new Date().toLocaleDateString('zh-CN');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a59b8c';
  ctx.font = `400 ${Math.max(10, Math.round(headerH * 0.14))}px ${FONT_STACK}`;
  ctx.fillText(date, out.width - pad, Math.round(headerH * 0.78));
  ctx.textAlign = 'left';

  ctx.drawImage(image, 0, headerH);
  return out;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildPdf(jpegDataUrl: string, imgW: number, imgH: number): Blob {
  const base64 = jpegDataUrl.slice(jpegDataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const jpeg = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) jpeg[i] = binary.charCodeAt(i);

  const landscape = imgW >= imgH;
  const pageW = landscape ? 842 : 595;
  const pageH = landscape ? 595 : 842;
  const margin = 24;
  const scale = Math.min((pageW - margin * 2) / imgW, (pageH - margin * 2) / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const drawX = (pageW - drawW) / 2;
  const drawY = (pageH - drawH) / 2;
  const content = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im0 Do\nQ\n`;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (number: number) => {
    offsets[number] = length;
  };

  push('%PDF-1.4\n');

  startObject(1);
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  startObject(3);
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
  );

  const contentBytes = encoder.encode(content);
  startObject(4);
  push(`4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  push(contentBytes);
  push('endstream\nendobj\n');

  startObject(5);
  push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  push(jpeg);
  push('\nendstream\nendobj\n');

  const xref = length;
  push('xref\n0 6\n0000000000 65535 f \n');
  for (let n = 1; n <= 5; n += 1) {
    push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
}

function downloadCanvas(canvas: HTMLCanvasElement, project: Project, format: ExportFormat) {
  const composed = withHeader(canvas, project);
  const base = safeFileName(project.name);
  if (format === 'png') {
    return new Promise<void>((resolve, reject) => {
      composed.toBlob((blob) => {
        if (!blob) {
          reject(new Error('导出 PNG 失败'));
          return;
        }
        triggerDownload(blob, `${base}.png`);
        resolve();
      }, 'image/png');
    });
  }
  const jpeg = composed.toDataURL('image/jpeg', 0.92);
  triggerDownload(buildPdf(jpeg, composed.width, composed.height), `${base}.pdf`);
  return Promise.resolve();
}

function loadSvgImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('无法渲染平面图'));
    img.src = url;
  });
}

export async function exportPlanImage(
  svg: SVGSVGElement,
  project: Project,
  format: ExportFormat,
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export-hide]').forEach((el) => el.remove());
  clone.querySelector('.plan-world')?.setAttribute('transform', '');

  const bounds = projectBounds(project);
  const padding = 1.1;
  const vbX = bounds.minX - padding;
  const vbZ = bounds.minZ - padding;
  const vbW = Math.max(1, bounds.w + padding * 2);
  const vbH = Math.max(1, bounds.d + padding * 2);
  const pixelScale = Math.min(240, Math.max(24, 1800 / Math.max(vbW, vbH)));
  const pixelW = Math.max(1, Math.round(vbW * pixelScale));
  const pixelH = Math.max(1, Math.round(vbH * pixelScale));

  clone.querySelectorAll('.plan-export-bg, .plan-export-grid').forEach((rect) => {
    rect.setAttribute('x', String(vbX));
    rect.setAttribute('y', String(vbZ));
    rect.setAttribute('width', String(vbW));
    rect.setAttribute('height', String(vbH));
  });

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', `${vbX} ${vbZ} ${vbW} ${vbH}`);
  clone.setAttribute('width', String(pixelW));
  clone.setAttribute('height', String(pixelH));

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `text { font-family: ${FONT_STACK}; }`;
  clone.insertBefore(style, clone.firstChild);

  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await loadSvgImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = pixelW;
    canvas.height = pixelH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建画布');
    ctx.fillStyle = '#f7f4ee';
    ctx.fillRect(0, 0, pixelW, pixelH);
    ctx.drawImage(img, 0, 0);
    await downloadCanvas(canvas, project, format);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportThreeCanvas(
  canvas: HTMLCanvasElement,
  project: Project,
  format: ExportFormat,
): Promise<void> {
  if (!canvas.width || !canvas.height) throw new Error('3D 场景还没有准备好');
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const ctx = copy.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');
  ctx.drawImage(canvas, 0, 0);
  await downloadCanvas(copy, project, format);
}
