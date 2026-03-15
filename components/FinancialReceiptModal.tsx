import React, { useState } from 'react';
import { X, Download, Send, CheckCircle2, Printer } from 'lucide-react';
import { FinancialRecord, Member } from '../types';
import { formatFirstName } from '../utils';

interface ChurchInfo {
  name: string;
  slogan?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  currency?: string;
}

interface FinancialReceiptModalProps {
  operation: FinancialRecord;
  donor: { firstName: string; lastName: string } | null;
  church: ChurchInfo;
  onClose: () => void;
}

const PAYMENT_ICONS: Record<string, string> = {
  'Espèces': '💵',
  'Mobile Money': '📱',
  'Virement bancaire': '🏦',
  'Autre': '💳',
};

const CATEGORY_VERSES: Record<string, string> = {
  'Dîmes': '« Apportez toutes les dîmes dans la maison du trésor. » — Malachie 3:10',
  'Offrandes': '« Que chacun donne comme il l\'a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie. » — 2 Corinthiens 9:7',
  'Dons': '« Donnez et il vous sera donné : on versera dans votre sein une bonne mesure, serrée, secouée et débordante. » — Luc 6:38',
  'Soutien Projets': '« Faites du bien et prêtez sans rien espérer en retour. » — Luc 6:35',
};

const DEFAULT_VERSE = '« Que chacun donne comme il l\'a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie. » — 2 Corinthiens 9:7';

function getReceiptNumber(id: string): string {
  const num = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-8);
  return `REC-${num}`;
}

function formatAmountFR(val: number): string {
  return new Intl.NumberFormat('fr-FR', { useGrouping: true, minimumFractionDigits: 0 })
    .format(val).replace(/\u00a0/g, '\u00a0');
}

function buildReceiptHTML(
  op: FinancialRecord,
  donor: { firstName: string; lastName: string } | null,
  church: ChurchInfo,
  logoB64: string,
): string {
  const pc = church.primaryColor || '#4f46e5';
  const receiptNum = getReceiptNumber(op.id);
  const dateStr = new Date(op.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const amountStr = `${formatAmountFR(op.amount)} ${church.currency || 'F CFA'}`;
  const donorName = donor
    ? `${formatFirstName(donor.firstName)} ${donor.lastName.toUpperCase()}`
    : 'Donateur anonyme';
  const verse = CATEGORY_VERSES[op.category] || DEFAULT_VERSE;
  const paymentIcon = PAYMENT_ICONS[op.paymentMethod] || '💳';

  return `
    <div style="width:680px;min-height:900px;background:#ffffff;font-family:'Segoe UI',Arial,Helvetica,sans-serif;box-sizing:border-box;position:relative;overflow:hidden;">

      <!-- Top accent bar -->
      <div style="height:6px;background:linear-gradient(90deg,${pc},${pc}cc,${pc}55);"></div>

      <!-- Header -->
      <div style="padding:36px 48px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;">
        <div style="display:flex;align-items:center;gap:20px;">
          ${logoB64
            ? `<img src="${logoB64}" style="width:64px;height:64px;object-fit:contain;border-radius:14px;" />`
            : `<div style="width:64px;height:64px;border-radius:14px;background:${pc};display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:white;letter-spacing:-1px;">${church.name.charAt(0).toUpperCase()}</div>`
          }
          <div>
            <div style="font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">${church.name}</div>
            ${church.slogan ? `<div style="font-size:12px;color:#94a3b8;font-style:italic;margin-top:2px;">${church.slogan}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${pc};text-transform:uppercase;margin-bottom:4px;">Reçu de Don</div>
          <div style="font-size:20px;font-weight:800;color:#0f172a;">${receiptNum}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${dateStr}</div>
        </div>
      </div>

      <!-- Amount Hero -->
      <div style="margin:32px 48px;padding:32px;background:linear-gradient(135deg,${pc}12,${pc}06);border-radius:20px;border:1.5px solid ${pc}22;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-20px;right:-20px;width:120px;height:120px;background:${pc}08;border-radius:50%;"></div>
        <div style="position:absolute;bottom:-30px;left:-10px;width:80px;height:80px;background:${pc}06;border-radius:50%;"></div>
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${pc};text-transform:uppercase;margin-bottom:8px;">Montant reçu</div>
        <div style="font-size:44px;font-weight:900;color:${pc};letter-spacing:-1px;line-height:1;">${amountStr}</div>
        <div style="display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:6px 16px;background:${pc}18;border-radius:100px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${pc};"></div>
          <span style="font-size:13px;font-weight:700;color:${pc};">${op.category}</span>
        </div>
      </div>

      <!-- Details grid -->
      <div style="margin:0 48px;display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <!-- Donor -->
        <div style="padding:20px;background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Donateur</div>
          <div style="font-size:16px;font-weight:700;color:#0f172a;">${donorName}</div>
        </div>
        <!-- Payment method -->
        <div style="padding:20px;background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Mode de paiement</div>
          <div style="font-size:15px;font-weight:700;color:#0f172a;">${paymentIcon} ${op.paymentMethod}</div>
        </div>
        ${op.description ? `
        <!-- Description -->
        <div style="padding:20px;background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;grid-column:1/-1;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">Désignation</div>
          <div style="font-size:14px;font-weight:600;color:#334155;">${op.description}</div>
        </div>` : ''}
      </div>

      <!-- Decorative divider -->
      <div style="margin:32px 48px;display:flex;align-items:center;gap:12px;">
        <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,#e2e8f0);"></div>
        <div style="font-size:18px;">✦</div>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,#e2e8f0,transparent);"></div>
      </div>

      <!-- Verse -->
      <div style="margin:0 48px;padding:20px 28px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 12px 12px 0;">
        <div style="font-size:12px;font-style:italic;color:#92400e;line-height:1.7;">${verse}</div>
      </div>

      <!-- Confirmation stamp -->
      <div style="margin:28px 48px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 18px;background:#dcfce7;border-radius:100px;border:1px solid #bbf7d0;">
          <div style="width:20px;height:20px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">✓</div>
          <span style="font-size:12px;font-weight:700;color:#15803d;">Don confirmé et enregistré</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">Signature autorisée</div>
          <div style="width:120px;height:1px;background:#0f172a;"></div>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top:24px;padding:20px 48px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:11px;color:#94a3b8;">
          ${church.address ? `📍 ${church.address}` : ''}
          ${church.phone ? ` &nbsp;•&nbsp; 📞 ${church.phone}` : ''}
          ${church.email ? ` &nbsp;•&nbsp; ✉ ${church.email}` : ''}
        </div>
        <div style="font-size:10px;color:#cbd5e1;font-style:italic;">Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
      </div>

      <!-- Bottom accent bar -->
      <div style="height:4px;background:linear-gradient(90deg,${pc}55,${pc}cc,${pc});"></div>
    </div>
  `;
}

async function fetchAsBase64(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

const FinancialReceiptModal: React.FC<FinancialReceiptModalProps> = ({ operation, donor, church, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  const pc = church.primaryColor || '#4f46e5';
  const receiptNum = getReceiptNumber(operation.id);
  const dateStr = new Date(operation.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const amountStr = `${formatAmountFR(operation.amount)} ${church.currency || 'F CFA'}`;
  const donorName = donor
    ? `${formatFirstName(donor.firstName)} ${donor.lastName.toUpperCase()}`
    : 'Donateur anonyme';
  const verse = CATEGORY_VERSES[operation.category] || DEFAULT_VERSE;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const logoB64 = church.logoUrl ? await fetchAsBase64(church.logoUrl) : '';
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;background:white;';
      container.innerHTML = buildReceiptHTML(operation, donor, church, logoB64);
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: false,
        backgroundColor: '#ffffff',
        logging: false,
      });
      document.body.removeChild(container);

      const pxW = canvas.width;
      const pxH = canvas.height;
      const pdfW = 190;
      const pdfH = Math.round((pxH / pxW) * pdfW);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW + 20, pdfH + 20] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 10, 10, pdfW, pdfH);
      pdf.save(`recu-${receiptNum.toLowerCase()}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF reçu:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*${church.name} — ${receiptNum}*\n\n✅ *Reçu de don confirmé*\n\n👤 Donateur : ${donorName}\n💰 Montant : *${amountStr}*\n🏷️ Catégorie : ${operation.category}\n💳 Paiement : ${operation.paymentMethod}\n📅 Date : ${dateStr}\n\n_${verse}_\n\n🙏 Merci pour votre générosité !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 fade-in duration-300">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${pc}18` }}>
              <CheckCircle2 size={18} style={{ color: pc }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Reçu de don</h3>
              <p className="text-xs text-slate-400">{receiptNum}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Receipt preview */}
        <div className="p-6 bg-slate-50 overflow-y-auto max-h-[70vh]">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

            {/* Top bar */}
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${pc}, ${pc}aa)` }} />

            {/* Header */}
            <div className="px-8 pt-7 pb-5 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-4">
                {church.logoUrl ? (
                  <img src={church.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain border border-slate-100" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black" style={{ background: pc }}>
                    {church.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-base font-extrabold text-slate-900 tracking-tight">{church.name}</p>
                  {church.slogan && <p className="text-xs text-slate-400 italic mt-0.5">{church.slogan}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: pc }}>Reçu de Don</p>
                <p className="text-base font-black text-slate-900">{receiptNum}</p>
                <p className="text-xs text-slate-400 mt-0.5">{dateStr}</p>
              </div>
            </div>

            {/* Amount hero */}
            <div className="mx-6 mt-6 rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${pc}12, ${pc}06)`, border: `1.5px solid ${pc}22` }}>
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20" style={{ background: pc }} />
              <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: pc }}>Montant reçu</p>
              <p className="text-4xl font-black tracking-tight" style={{ color: pc }}>{amountStr}</p>
              <span className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: `${pc}18`, color: pc }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: pc }} />
                {operation.category}
              </span>
            </div>

            {/* Details */}
            <div className="mx-6 mt-4 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">Donateur</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{donorName}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">Paiement</p>
                <p className="text-sm font-bold text-slate-900">{PAYMENT_ICONS[operation.paymentMethod] || '💳'} {operation.paymentMethod}</p>
              </div>
              {operation.description && (
                <div className="col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400 mb-1.5">Désignation</p>
                  <p className="text-sm font-semibold text-slate-700">{operation.description}</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-6 my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-100" />
              <span className="text-slate-300 text-sm">✦</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-100" />
            </div>

            {/* Verse */}
            <div className="mx-6 px-5 py-4 bg-amber-50 border-l-4 border-amber-300 rounded-r-xl">
              <p className="text-xs italic text-amber-800 leading-relaxed">{verse}</p>
            </div>

            {/* Confirmation */}
            <div className="mx-6 mt-5 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-full border border-emerald-100">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">Don confirmé et enregistré</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 mb-1">Signature autorisée</p>
                <div className="w-24 h-px bg-slate-800 ml-auto" />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 mx-0 px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[10px] text-slate-400 space-y-0.5">
                {church.address && <p>📍 {church.address}</p>}
                {church.phone && <p>📞 {church.phone}</p>}
                {church.email && <p>✉ {church.email}</p>}
              </div>
              <p className="text-[9px] text-slate-300 italic">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
            </div>

            {/* Bottom bar */}
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${pc}55, ${pc})` }} />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ background: pc }}
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {downloading ? 'Génération...' : 'Télécharger PDF'}
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:bg-emerald-700 transition-all active:scale-[0.98]"
          >
            <Send size={16} />
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialReceiptModal;
