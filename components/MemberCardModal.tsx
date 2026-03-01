import React, { useEffect, useState } from 'react';
import { X, Printer, CreditCard } from 'lucide-react';
import { Member } from '../types';
import { getChurchSettings } from '../lib/db';
import { formatFirstName } from '../utils';

interface Props {
  member: Member;
  isOpen: boolean;
  onClose: () => void;
}

const MemberCardModal: React.FC<Props> = ({ member, isOpen, onClose }) => {
  const [church, setChurch] = useState<any>(null);

  useEffect(() => {
    if (isOpen) getChurchSettings().then(setChurch);
  }, [isOpen]);

  if (!isOpen) return null;

  const fullName = `${formatFirstName(member.firstName)} ${member.lastName.toUpperCase()}`;
  const cardNumber = `MBR-${member.id.slice(-8, -4).toUpperCase()}-${member.id.slice(-4).toUpperCase()}`;
  const joinYear = member.joinDate ? new Date(member.joinDate).getFullYear() : new Date().getFullYear();
  const validYear = new Date().getFullYear() + 1;

  const churchName = church?.name || 'Vinea';
  const churchPhone = church?.phone || '';
  const churchEmail = church?.email || '';
  const churchAddress = church?.address || '';
  const churchLogo = church?.logoUrl || '';
  const pc = (church?.primaryColor || '#4f46e5');
  const pc1a = `${pc}1a`;

  const depts = (member.departments || []).slice(0, 3);

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=800');
    if (!w) return;
    w.document.write(buildPrintHTML());
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 600);
  };

  const buildPrintHTML = (): string => {
    const logoImg = churchLogo
      ? `<img src="${churchLogo}" style="width:8mm;height:8mm;object-fit:contain;border-radius:1mm;" />`
      : `<div style="width:8mm;height:8mm;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:3.5mm;font-weight:700;">${churchName.charAt(0)}</div>`;

    const photoFront = member.photoUrl
      ? `<img src="${member.photoUrl}" style="width:18mm;height:18mm;border-radius:50%;object-fit:cover;border:0.7mm solid white;display:block;box-shadow:0 1mm 4mm rgba(0,0,0,0.2);" />`
      : `<div style="width:18mm;height:18mm;border-radius:50%;background:${pc};border:0.7mm solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:6mm;font-weight:700;box-shadow:0 1mm 4mm rgba(0,0,0,0.2);">${member.firstName.charAt(0)}${member.lastName.charAt(0)}</div>`;

    const photoBack = member.photoUrl
      ? `<img src="${member.photoUrl}" style="position:absolute;right:5mm;top:50%;transform:translateY(-50%);width:11mm;height:11mm;border-radius:50%;object-fit:cover;border:0.5mm solid rgba(255,255,255,0.5);" />`
      : '';

    const deptsHTML = depts.length > 0
      ? depts.map(d => `<span style="display:inline-block;padding:0.5mm 2mm;background:${pc}22;color:${pc};border-radius:1mm;font-size:2.4mm;font-weight:600;margin-right:1.5mm;">${d}</span>`).join('')
      : '';

    const contactRows = [
      churchAddress ? `<div class="ir"><span class="ico">📍</span><span class="it">${churchAddress}</span></div>` : '',
      churchPhone   ? `<div class="ir"><span class="ico">📞</span><span class="it">${churchPhone}</span></div>` : '',
      churchEmail   ? `<div class="ir"><span class="ico">✉</span><span class="it">${churchEmail}</span></div>` : '',
    ].filter(Boolean).join('');

    const deptsRow = depts.length > 0
      ? `<div style="margin-top:1.5mm;display:flex;align-items:center;gap:1.5mm;flex-wrap:wrap;"><span class="ico">🏛</span>${deptsHTML}</div>`
      : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Carte de Membre — ${fullName}</title>
  <style>
    @page { size: 85.6mm 54mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; }
    html, body { width: 85.6mm; height: 54mm; background: white; overflow: hidden; }
    .card { width: 85.6mm; height: 54mm; overflow: hidden; position: relative; page-break-after: always; display: flex; flex-direction: column; }

    /* FRONT */
    .front { background: white; }
    .front-hd { background: linear-gradient(135deg, ${pc} 0%, ${pc}bb 100%); height: 16mm; display: flex; align-items: center; padding: 0 5mm; gap: 2.5mm; position: relative; }
    .front-hd-name { color: white; font-size: 4mm; font-weight: 800; letter-spacing: 0.1mm; flex: 1; }
    .front-hd-label { font-size: 2.2mm; color: rgba(255,255,255,0.65); letter-spacing: 0.8mm; text-transform: uppercase; }
    .front-bd { flex: 1; display: flex; align-items: center; padding: 0 5mm; gap: 4mm; }
    .front-name { font-size: 5.2mm; font-weight: 800; color: #0f172a; letter-spacing: -0.2mm; line-height: 1.15; }
    .front-role { display: inline-block; margin-top: 2mm; padding: 0.8mm 2.5mm; background: ${pc1a}; color: ${pc}; border-radius: 1.5mm; font-size: 2.8mm; font-weight: 700; }
    .front-ft { height: 12mm; background: #f8fafc; display: flex; align-items: center; justify-content: space-between; padding: 0 5mm; border-top: 0.3mm solid #e2e8f0; }
    .card-num { font-size: 2.5mm; color: #64748b; font-weight: 600; letter-spacing: 0.4mm; font-family: 'Courier New', monospace; }
    .valid-lbl { font-size: 1.9mm; color: #94a3b8; text-align: right; }
    .valid-val { font-size: 3.2mm; color: ${pc}; font-weight: 800; text-align: right; }

    /* BACK */
    .back { background: white; }
    .back-hd { background: linear-gradient(135deg, ${pc} 0%, ${pc}bb 100%); height: 16mm; display: flex; align-items: center; padding: 0 5mm; gap: 2.5mm; position: relative; }
    .back-hd-name { color: white; font-size: 4mm; font-weight: 800; flex: 1; }
    .back-member { color: rgba(255,255,255,0.9); font-size: 2.8mm; font-weight: 600; text-align: right; line-height: 1.4; }
    .back-sub { color: rgba(255,255,255,0.6); font-size: 2.2mm; }
    .back-bd { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 5mm; gap: 1.8mm; }
    .ir { display: flex; align-items: center; gap: 2mm; }
    .ico { font-size: 3mm; width: 4.5mm; flex-shrink: 0; }
    .it { font-size: 2.7mm; color: #334155; }
    .div { height: 0.2mm; background: #e2e8f0; margin: 1mm 0; }
    .back-ft { height: 10mm; background: #f8fafc; display: flex; align-items: center; justify-content: center; padding: 0 5mm; border-top: 0.3mm solid #e2e8f0; }
    .ft-note { font-size: 2.2mm; color: #94a3b8; text-align: center; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- PAGE 1 : RECTO -->
  <div class="card front">
    <div class="front-hd">
      ${logoImg}
      <span class="front-hd-name">${churchName.toUpperCase()}</span>
      <span class="front-hd-label">Carte Membre</span>
    </div>
    <div class="front-bd">
      <div>${photoFront}</div>
      <div>
        <div class="front-name">${fullName}</div>
        <div class="front-role">${member.type}</div>
      </div>
    </div>
    <div class="front-ft">
      <span class="card-num">${cardNumber}</span>
      <div>
        <div class="valid-lbl">Valide jusqu'au</div>
        <div class="valid-val">31/12/${validYear}</div>
      </div>
    </div>
  </div>

  <!-- PAGE 2 : VERSO -->
  <div class="card back" style="page-break-after:auto;">
    <div class="back-hd">
      ${logoImg}
      <span class="back-hd-name">${churchName.toUpperCase()}</span>
      <div class="back-member">
        <div>${fullName}</div>
        <div class="back-sub">Membre depuis ${joinYear}</div>
      </div>
      ${photoBack}
    </div>
    <div class="back-bd">
      ${contactRows}
      ${depts.length > 0 ? `<div class="div"></div>${deptsRow}` : ''}
    </div>
    <div class="back-ft">
      <p class="ft-note">Si trouvée, merci de retourner cette carte à l'église · ${cardNumber}</p>
    </div>
  </div>

</body>
</html>`;
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[460px] bg-white rounded-2xl shadow-2xl overflow-hidden my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${pc}1a` }}>
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

        {/* Preview area */}
        <div className="bg-slate-50 px-6 py-8 flex flex-col items-center gap-8">

          {/* FRONT PREVIEW */}
          <div className="w-full">
            <p className="text-[10px] text-slate-400 text-center mb-3 uppercase tracking-[0.2em]">Recto</p>
            <div className="w-full rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ height: '160px', background: 'white' }}>
              {/* Header */}
              <div className="h-[50px] flex items-center px-5 gap-3 flex-shrink-0"
                   style={{ background: `linear-gradient(135deg, ${pc}, ${pc}bb)` }}>
                {churchLogo
                  ? <img src={churchLogo} className="w-8 h-8 object-contain rounded flex-shrink-0" alt="" />
                  : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{churchName.charAt(0)}</div>
                }
                <span className="text-white font-bold text-sm tracking-wide flex-1 truncate">{churchName.toUpperCase()}</span>
                <span className="text-white/60 text-[9px] tracking-widest uppercase whitespace-nowrap">Carte Membre</span>
              </div>
              {/* Body */}
              <div className="flex-1 flex items-center px-5 gap-4 min-h-0">
                {member.photoUrl
                  ? <img src={member.photoUrl} className="w-[60px] h-[60px] rounded-full object-cover border-2 border-white shadow-lg flex-shrink-0" alt="" />
                  : <div className="w-[60px] h-[60px] rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold shadow-lg border-2 border-white"
                         style={{ background: pc }}>
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>
                }
                <div>
                  <div className="text-slate-900 font-extrabold text-lg leading-tight truncate">{fullName}</div>
                  <div className="inline-block mt-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
                       style={{ background: `${pc}1a`, color: pc }}>{member.type}</div>
                </div>
              </div>
              {/* Footer */}
              <div className="h-[37px] flex items-center justify-between px-5 border-t border-slate-100 flex-shrink-0"
                   style={{ background: '#f8fafc' }}>
                <span className="font-mono text-[10px] text-slate-500">{cardNumber}</span>
                <div className="text-right">
                  <div className="text-[8px] text-slate-400">Valide jusqu'au</div>
                  <div className="text-xs font-bold" style={{ color: pc }}>31/12/{validYear}</div>
                </div>
              </div>
            </div>
          </div>

          {/* BACK PREVIEW */}
          <div className="w-full">
            <p className="text-[10px] text-slate-400 text-center mb-3 uppercase tracking-[0.2em]">Verso</p>
            <div className="w-full rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ height: '160px', background: 'white' }}>
              {/* Header */}
              <div className="h-[50px] flex items-center px-5 gap-3 flex-shrink-0 relative"
                   style={{ background: `linear-gradient(135deg, ${pc}, ${pc}bb)` }}>
                {churchLogo
                  ? <img src={churchLogo} className="w-8 h-8 object-contain rounded flex-shrink-0" alt="" />
                  : <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{churchName.charAt(0)}</div>
                }
                <span className="text-white font-bold text-sm tracking-wide flex-1 truncate">{churchName.toUpperCase()}</span>
                <div className="text-right text-white/90 text-xs">
                  <div className="font-semibold">{fullName}</div>
                  <div className="text-white/60 text-[9px]">Depuis {joinYear}</div>
                </div>
              </div>
              {/* Body */}
              <div className="flex-1 flex flex-col justify-center px-5 gap-1.5 min-h-0">
                {churchAddress && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📍</span>
                    <span className="text-[11px] text-slate-600 truncate">{churchAddress}</span>
                  </div>
                )}
                {churchPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📞</span>
                    <span className="text-[11px] text-slate-600">{churchPhone}</span>
                  </div>
                )}
                {churchEmail && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">✉</span>
                    <span className="text-[11px] text-slate-600">{churchEmail}</span>
                  </div>
                )}
                {depts.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-xs">🏛</span>
                    {depts.map(d => (
                      <span key={d} className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                            style={{ background: `${pc}1a`, color: pc }}>{d}</span>
                    ))}
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="h-[32px] flex items-center justify-center px-5 border-t border-slate-100 flex-shrink-0"
                   style={{ background: '#f8fafc' }}>
                <p className="text-[8px] text-slate-400 text-center">
                  Si trouvée, merci de retourner cette carte à l'église · {cardNumber}
                </p>
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
            onClick={handlePrint}
            className="flex-1 py-3.5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
            style={{ background: `linear-gradient(135deg, ${pc}, ${pc}bb)` }}
          >
            <Printer size={15} />
            Générer PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberCardModal;
