import React, { useEffect, useState } from 'react';
import { X, Download, CreditCard } from 'lucide-react';
import { Member } from '../types';
import { getChurchSettings } from '../lib/db';
import { formatFirstName } from '../utils';

interface Props {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
}

// 1 mm → px at 96 dpi
const mm = (v: number) => Math.round(v * 3.779);

const MemberCardModal: React.FC<Props> = ({ member, isOpen, onClose }) => {
  const [church, setChurch] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) getChurchSettings().then(setChurch);
  }, [isOpen]);

  if (!isOpen) return null;

  const fullName = `${formatFirstName(member.firstName)} ${member.lastName.toUpperCase()}`;
  const cardNumber = `MBR-${member.id.slice(-8, -4).toUpperCase()}-${member.id.slice(-4).toUpperCase()}`;
  const validYear = new Date().getFullYear() + 1;

  const churchName   = church?.name || 'Vinea';
  const churchPhone  = church?.phone || '';
  const churchEmail  = church?.email || '';
  const churchAddress = church?.address || '';
  const churchLogo   = church?.logoUrl || '';
  const churchSlogan = church?.slogan || '';
  const pc    = church?.primaryColor || '#4f46e5';
  const pc1a  = `${pc}1a`;

  const depts = (member.departments || []).slice(0, 3);

  const fmtDate = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const qrData = `${cardNumber}|${fullName}|${churchName}`;
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=2&data=${encodeURIComponent(qrData)}`;

  // ─── helpers ────────────────────────────────────────────────────────────────

  const fetchAsBase64 = async (url: string): Promise<string> => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  // Hex #rrggbb → { r, g, b }
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
  };

  // ─── A4 HTML builder (for html2canvas rendering) ─────────────────────────────
  const buildA4HTML = (photoB64: string, logoB64: string, qrB64: string): string => {
    const { r, g, b } = hexToRgb(pc);
    const pcRgb   = `rgb(${r},${g},${b})`;
    const pcLight = `rgba(${r},${g},${b},0.12)`;

    // Card dimensions (px @ 96dpi)
    const cW = mm(85.6); // 323
    const cH = mm(54);   // 204
    const hH = mm(14);   // header height 53
    const bH = mm(28);   // body height
    const fH = cH - hH - bH; // footer height

    // Logo element
    const logoEl = logoB64
      ? `<img src="${logoB64}" style="width:${mm(8)}px;height:${mm(8)}px;object-fit:contain;flex-shrink:0;" />`
      : `<div style="width:${mm(8)}px;height:${mm(8)}px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:${mm(3.5)}px;font-weight:700;flex-shrink:0;">${churchName.charAt(0)}</div>`;

    // Photo – front
    const photoFront = photoB64
      ? `<img src="${photoB64}" style="width:${mm(16)}px;height:${mm(16)}px;border-radius:50%;object-fit:cover;border:2px solid white;flex-shrink:0;" />`
      : `<div style="width:${mm(16)}px;height:${mm(16)}px;border-radius:50%;background:${pcRgb};display:flex;align-items:center;justify-content:center;color:white;font-size:${mm(5.5)}px;font-weight:700;flex-shrink:0;">${member.firstName.charAt(0)}${member.lastName.charAt(0)}</div>`;

    // Photo – back (small)
    const photoBack = photoB64
      ? `<img src="${photoB64}" style="width:${mm(9)}px;height:${mm(9)}px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.5);flex-shrink:0;" />`
      : '';

    // Info rows (recto)
    const infoRows: string[] = [];
    const lbl = `font-size:${mm(1.8)}px;color:#94a3b8;white-space:nowrap;`;
    const val = `font-size:${mm(2)}px;color:#334155;font-weight:600;`;
    if (member.joinDate)
      infoRows.push(`<div style="display:flex;gap:${mm(1.5)}px;align-items:baseline;margin-top:${mm(0.7)}px;"><span style="${lbl}">Membre depuis</span><span style="${val}">${fmtDate(member.joinDate)}</span></div>`);
    if (member.baptized && member.baptizedDate)
      infoRows.push(`<div style="display:flex;gap:${mm(1.5)}px;align-items:baseline;margin-top:${mm(0.7)}px;"><span style="${lbl}">Baptise le</span><span style="${val}">${fmtDate(member.baptizedDate)}</span></div>`);
    if (member.phone)
      infoRows.push(`<div style="display:flex;gap:${mm(1.5)}px;align-items:baseline;margin-top:${mm(0.7)}px;"><span style="${lbl}">Tel.</span><span style="${val}">${member.phone}</span></div>`);

    // Contact rows (verso)
    const contacts: string[] = [];
    const ct = `font-size:${mm(2.3)}px;color:#334155;`;
    const ci = `font-size:${mm(2.3)}px;color:#888;width:${mm(5)}px;flex-shrink:0;`;
    if (churchAddress) contacts.push(`<div style="display:flex;gap:${mm(1.5)}px;align-items:flex-start;"><span style="${ci}">Adr</span><span style="${ct}">${churchAddress}</span></div>`);
    if (churchPhone)   contacts.push(`<div style="display:flex;gap:${mm(1.5)}px;align-items:flex-start;"><span style="${ci}">Tel</span><span style="${ct}">${churchPhone}</span></div>`);
    if (churchEmail)   contacts.push(`<div style="display:flex;gap:${mm(1.5)}px;align-items:flex-start;"><span style="${ci}">Email</span><span style="${ct}">${churchEmail}</span></div>`);

    const deptsEl = depts.length > 0
      ? `<div style="display:flex;gap:${mm(1.5)}px;flex-wrap:wrap;margin-top:${mm(1)}px;">${depts.map(d => `<span style="padding:${mm(0.4)}px ${mm(2)}px;background:${pcLight};color:${pcRgb};border-radius:${mm(1.5)}px;font-size:${mm(2.2)}px;font-weight:600;">${d}</span>`).join('')}</div>`
      : '';

    // Common styles
    const cardBase = `width:${cW}px;height:${cH}px;background:white;overflow:hidden;display:flex;flex-direction:column;border-radius:${mm(2)}px;`;
    const hdBase   = `height:${hH}px;background:${pcRgb};display:flex;align-items:center;padding:0 ${mm(4)}px;gap:${mm(2)}px;flex-shrink:0;`;
    const bdBase   = `height:${bH}px;display:flex;align-items:center;padding:0 ${mm(4)}px;gap:${mm(3.5)}px;flex-shrink:0;`;
    const ftBase   = `height:${fH}px;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;padding:0 ${mm(4)}px;border-top:1px solid #e2e8f0;flex-shrink:0;`;

    const RECTO = `
    <div style="${cardBase}box-shadow:0 4px 24px rgba(0,0,0,0.12);">
      <!-- header -->
      <div style="${hdBase}">
        ${logoEl}
        <span style="color:white;font-size:${mm(3.8)}px;font-weight:800;flex:1;">${churchName.toUpperCase()}</span>
        <span style="font-size:${mm(2)}px;color:rgba(255,255,255,0.65);letter-spacing:2px;text-transform:uppercase;white-space:nowrap;">CARTE MEMBRE</span>
      </div>
      <!-- body -->
      <div style="${bdBase}">
        ${photoFront}
        <div style="flex:1;min-width:0;">
          <div style="font-size:${mm(4.6)}px;font-weight:800;color:#0f172a;line-height:1.1;">${fullName}</div>
          <div style="display:inline-block;margin-top:${mm(1.5)}px;margin-bottom:${mm(1.5)}px;padding:${mm(0.4)}px ${mm(2)}px;background:${pcLight};color:${pcRgb};border-radius:${mm(1.5)}px;font-size:${mm(2.5)}px;font-weight:700;">${member.type}</div>
          ${infoRows.join('')}
        </div>
      </div>
      <!-- footer -->
      <div style="${ftBase}">
        <span style="font-size:${mm(2.3)}px;color:#64748b;font-weight:600;font-family:monospace;">${cardNumber}</span>
        <div style="text-align:right;">
          <div style="font-size:${mm(1.7)}px;color:#94a3b8;">Valide jusqu'au</div>
          <div style="font-size:${mm(3)}px;color:${pcRgb};font-weight:800;">31/12/${validYear}</div>
        </div>
      </div>
    </div>`;

    const backHH = mm(13);
    const backFH = mm(10);
    const backBH = cH - backHH - backFH;
    const bdBack = `height:${backBH}px;display:flex;align-items:stretch;padding:${mm(2)}px ${mm(4)}px;gap:${mm(2.5)}px;flex-shrink:0;`;
    const ftBack = `height:${backFH}px;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;padding:0 ${mm(4)}px;border-top:1px solid #e2e8f0;flex-shrink:0;`;

    const VERSO = `
    <div style="${cardBase}box-shadow:0 4px 24px rgba(0,0,0,0.12);">
      <!-- header -->
      <div style="height:${backHH}px;background:${pcRgb};display:flex;align-items:center;padding:0 ${mm(4)}px;gap:${mm(2)}px;flex-shrink:0;">
        ${logoEl}
        <span style="color:white;font-size:${mm(3.8)}px;font-weight:800;flex:1;">${churchName.toUpperCase()}</span>
        <div style="display:flex;align-items:center;gap:${mm(2)}px;">
          ${photoBack}
          <div style="text-align:right;">
            <div style="color:rgba(255,255,255,0.95);font-size:${mm(2.4)}px;font-weight:600;">${fullName}</div>
            ${member.joinDate ? `<div style="color:rgba(255,255,255,0.6);font-size:${mm(1.8)}px;">Depuis ${fmtDate(member.joinDate)}</div>` : ''}
          </div>
        </div>
      </div>
      <!-- body -->
      <div style="${bdBack}">
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:${mm(1.2)}px;">
          ${contacts.join('')}
          ${deptsEl}
        </div>
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${mm(0.5)}px;">
          ${qrB64 ? `<img src="${qrB64}" style="width:${mm(21)}px;height:${mm(21)}px;display:block;" />` : ''}
          <div style="font-size:${mm(1.7)}px;color:#94a3b8;text-align:center;">Scanner</div>
        </div>
      </div>
      <!-- footer -->
      <div style="${ftBack}">
        ${churchSlogan ? `<span style="font-size:${mm(2)}px;color:${pcRgb};font-style:italic;font-weight:600;">${churchSlogan}</span>` : '<span></span>'}
        <span style="font-size:${mm(1.9)}px;color:#94a3b8;">${cardNumber}</span>
      </div>
    </div>`;

    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:${mm(15)}px;padding:${mm(20)}px 0;">
        ${RECTO}
        ${VERSO}
      </div>`;
  };

  // ─── Download handler ─────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const [photoB64, logoB64, qrB64] = await Promise.all([
        member.photoUrl ? fetchAsBase64(member.photoUrl) : Promise.resolve(''),
        churchLogo      ? fetchAsBase64(churchLogo)      : Promise.resolve(''),
        fetchAsBase64(qrUrl),
      ]);

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF }   = await import('jspdf');

      // Off-screen container — same width as A4 at 96dpi
      const container = document.createElement('div');
      container.style.cssText = `
        position:fixed;left:-9999px;top:0;
        width:${mm(210)}px;
        background:white;
        font-family:'Segoe UI',Arial,Helvetica,sans-serif;
        box-sizing:border-box;
      `;
      container.innerHTML = buildA4HTML(photoB64, logoB64, qrB64);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: false,          // all images already base64
        backgroundColor: '#ffffff',
        logging: false,
      });
      document.body.removeChild(container);

      // Compute actual rendered height → map to A4 proportionally
      const pxW = canvas.width;
      const pxH = canvas.height;
      const pdfW = 210; // mm
      const pdfH = Math.round((pxH / pxW) * pdfW);

      const pdf = new jsPDF({ orientation: pdfH > pdfW ? 'portrait' : 'landscape', unit: 'mm', format: [pdfW, pdfH] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH);
      pdf.save(`carte-${member.lastName.toLowerCase()}-${member.firstName.toLowerCase()}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  // ─── JSX preview ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: pc1a }}>
              <CreditCard size={18} style={{ color: pc }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Carte de Membre</h3>
              <p className="text-[11px] text-slate-400">{fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Preview */}
        <div className="bg-slate-50 px-6 py-8 flex flex-col items-center gap-8">

          {/* RECTO */}
          <div className="w-full">
            <p className="text-[10px] text-slate-400 text-center mb-3 uppercase tracking-[0.2em]">Recto</p>
            <div className="w-full rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ height: '168px' }}>
              <div className="flex-shrink-0 h-[52px] flex items-center px-5 gap-3"
                   style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }}>
                {churchLogo
                  ? <img src={churchLogo} className="w-8 h-8 object-contain rounded flex-shrink-0" alt="" />
                  : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{churchName.charAt(0)}</div>}
                <span className="text-white font-bold text-sm flex-1 truncate">{churchName.toUpperCase()}</span>
                <span className="text-white/60 text-[9px] tracking-widest uppercase whitespace-nowrap">Carte Membre</span>
              </div>
              <div className="flex-1 flex items-center px-5 gap-4 min-h-0 bg-white">
                {member.photoUrl
                  ? <img src={member.photoUrl} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg flex-shrink-0" alt="" />
                  : <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold shadow-lg border-2 border-white"
                         style={{ background: pc }}>
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>}
                <div className="min-w-0 flex-1">
                  <div className="text-slate-900 font-extrabold text-base leading-tight truncate">{fullName}</div>
                  <div className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold mb-1"
                       style={{ background: pc1a, color: pc }}>{member.type}</div>
                  {member.joinDate && (
                    <div className="flex gap-1.5 items-baseline">
                      <span className="text-[9px] text-slate-400">Membre depuis</span>
                      <span className="text-[10px] text-slate-600 font-semibold">{fmtDate(member.joinDate)}</span>
                    </div>
                  )}
                  {member.baptized && member.baptizedDate && (
                    <div className="flex gap-1.5 items-baseline">
                      <span className="text-[9px] text-slate-400">Baptisé le</span>
                      <span className="text-[10px] text-slate-600 font-semibold">{fmtDate(member.baptizedDate)}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex gap-1.5 items-baseline">
                      <span className="text-[9px] text-slate-400">Tél.</span>
                      <span className="text-[10px] text-slate-600 font-semibold">{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 h-9 flex items-center justify-between px-5 border-t border-slate-100 bg-slate-50/80">
                <span className="font-mono text-[9px] text-slate-500">{cardNumber}</span>
                <div className="text-right">
                  <div className="text-[7px] text-slate-400">Valide jusqu'au</div>
                  <div className="text-[11px] font-bold" style={{ color: pc }}>31/12/{validYear}</div>
                </div>
              </div>
            </div>
          </div>

          {/* VERSO */}
          <div className="w-full">
            <p className="text-[10px] text-slate-400 text-center mb-3 uppercase tracking-[0.2em]">Verso</p>
            <div className="w-full rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ height: '168px' }}>
              <div className="flex-shrink-0 h-[48px] flex items-center px-5 gap-3"
                   style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }}>
                {churchLogo
                  ? <img src={churchLogo} className="w-7 h-7 object-contain rounded flex-shrink-0" alt="" />
                  : <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{churchName.charAt(0)}</div>}
                <span className="text-white font-bold text-sm flex-1 truncate">{churchName.toUpperCase()}</span>
                <div className="flex items-center gap-2">
                  {member.photoUrl && (
                    <img src={member.photoUrl} className="w-8 h-8 rounded-full object-cover border border-white/50 flex-shrink-0" alt="" />
                  )}
                  <div className="text-right text-white/90">
                    <div className="font-semibold text-xs">{fullName}</div>
                    {member.joinDate && <div className="text-white/60 text-[9px]">Depuis {fmtDate(member.joinDate)}</div>}
                  </div>
                </div>
              </div>
              <div className="flex-1 flex items-stretch px-5 gap-3 min-h-0 bg-white py-2">
                <div className="flex-1 flex flex-col justify-center gap-1">
                  {churchAddress && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">📍</span>
                      <span className="text-[10px] text-slate-600 truncate">{churchAddress}</span>
                    </div>
                  )}
                  {churchPhone && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">📞</span>
                      <span className="text-[10px] text-slate-600">{churchPhone}</span>
                    </div>
                  )}
                  {churchEmail && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">✉</span>
                      <span className="text-[10px] text-slate-600 truncate">{churchEmail}</span>
                    </div>
                  )}
                  {depts.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px]">🏛</span>
                      {depts.map(d => (
                        <span key={d} className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
                              style={{ background: pc1a, color: pc }}>{d}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1">
                  <img src={qrUrl} className="w-16 h-16" alt="QR" />
                  <span className="text-[8px] text-slate-400">Scanner</span>
                </div>
              </div>
              <div className="flex-shrink-0 h-8 flex items-center justify-between px-5 border-t border-slate-100 bg-slate-50/80">
                {churchSlogan
                  ? <span className="text-[9px] italic font-semibold truncate" style={{ color: pc }}>{churchSlogan}</span>
                  : <span />}
                <span className="text-[8px] text-slate-400 flex-shrink-0">{cardNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-7 py-5 border-t border-slate-100 flex gap-3 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3.5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }}
          >
            {downloading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Génération...
              </>
            ) : (
              <>
                <Download size={15} />
                Télécharger
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberCardModal;
