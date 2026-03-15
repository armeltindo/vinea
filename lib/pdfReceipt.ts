/**
 * lib/pdfReceipt.ts
 * Génération de reçus PDF professionnels pour les dons de l'église.
 * Utilise jsPDF (client-side, sans serveur).
 */
import { jsPDF } from 'jspdf';
import { FinancialRecord } from '../types';

export interface ChurchInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  slogan?: string;
  currency?: string;
}

export interface DonorInfo {
  firstName?: string;
  lastName?: string;
  externalName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getDonorFullName(op: FinancialRecord, donor?: DonorInfo): string {
  if (donor?.firstName || donor?.lastName) {
    return `${donor.firstName ?? ''} ${(donor.lastName ?? '').toUpperCase()}`.trim();
  }
  if (donor?.externalName) return donor.externalName;
  if (op.externalName) return op.externalName;
  return 'Donateur Anonyme';
}

function generateReceiptNumber(opId: string, date: string): string {
  const year = new Date(date).getFullYear();
  const shortId = opId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${year}-${shortId}`;
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('fr-FR')} ${currency}`;
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawHorizontalLine(doc: jsPDF, y: number, x1 = 15, x2 = 195, width = 0.3) {
  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(width);
  doc.line(x1, y, x2, y);
}

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, fillColor: [number, number, number]) {
  doc.setFillColor(...fillColor);
  doc.setDrawColor(...fillColor);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateDonationReceiptPDF(
  op: FinancialRecord,
  donor: DonorInfo | undefined,
  church: ChurchInfo
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;

  const primaryRGB: [number, number, number] = [79, 70, 229];   // indigo-600
  const accentRGB: [number, number, number] = [16, 185, 129];   // emerald-500
  const lightBg: [number, number, number] = [248, 248, 255];
  const textDark: [number, number, number] = [15, 23, 42];
  const textMuted: [number, number, number] = [100, 116, 139];

  const donorName = getDonorFullName(op, donor);
  const receiptNumber = generateReceiptNumber(op.id, op.date);
  const currency = church.currency || 'F CFA';
  const emissionDate = formatDate(new Date().toISOString().split('T')[0]);

  // ── 1. Bande de couleur en en-tête ──────────────────────────────────────────
  doc.setFillColor(...primaryRGB);
  doc.rect(0, 0, pageW, 48, 'F');

  // Nom de l'église
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(church.name.toUpperCase(), pageW / 2, 22, { align: 'center' });

  // Slogan / adresse courte
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(199, 210, 254); // indigo-200
  const subtitle = church.slogan || 'Gestion Financière';
  doc.text(subtitle, pageW / 2, 30, { align: 'center' });

  // Contact ligne
  const contactParts: string[] = [];
  if (church.address) contactParts.push(church.address);
  if (church.phone) contactParts.push(church.phone);
  if (church.email) contactParts.push(church.email);
  if (contactParts.length > 0) {
    doc.setFontSize(8);
    doc.setTextColor(165, 180, 252); // indigo-300
    doc.text(contactParts.join('  |  '), pageW / 2, 38, { align: 'center', maxWidth: 160 });
  }

  // ── 2. Badge "REÇU DE DON" ──────────────────────────────────────────────────
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...primaryRGB);
  doc.text('REÇU DE DON', pageW / 2, y, { align: 'center' });

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...textMuted);
  doc.text(`N° ${receiptNumber}`, pageW / 2, y, { align: 'center' });

  y += 5;
  doc.setFontSize(8);
  doc.text(`Émis le ${emissionDate}`, pageW / 2, y, { align: 'center' });

  // Ligne décorative
  y += 6;
  doc.setDrawColor(...accentRGB);
  doc.setLineWidth(1.5);
  doc.line(pageW / 2 - 25, y, pageW / 2 + 25, y);

  // ── 3. Bloc Donateur ────────────────────────────────────────────────────────
  y += 12;
  drawRect(doc, margin, y, contentW, 22, lightBg);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text('DONATEUR', margin + 6, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...textDark);
  doc.text(donorName, margin + 6, y + 16);

  // ── 4. Tableau des détails ──────────────────────────────────────────────────
  y += 30;
  const rows: [string, string][] = [
    ['Montant du don', formatAmount(op.amount, currency)],
    ['Catégorie', op.category],
    ['Mode de paiement', op.paymentMethod],
    ['Date du don', formatDate(op.date)],
    ['Référence transaction', op.id.replace(/-/g, '').slice(0, 12).toUpperCase()],
  ];
  if (op.description) {
    rows.push(['Motif / Notes', op.description]);
  }

  const rowH = 12;
  const labelW = 70;

  rows.forEach(([label, value], i) => {
    const rowY = y + i * rowH;
    const isEven = i % 2 === 0;

    // Fond alterné
    if (isEven) {
      doc.setFillColor(245, 245, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(230, 230, 240);
    doc.setLineWidth(0.1);
    doc.rect(margin, rowY, contentW, rowH, 'FD');

    // Séparateur vertical
    doc.setDrawColor(210, 210, 230);
    doc.setLineWidth(0.3);
    doc.line(margin + labelW, rowY, margin + labelW, rowY + rowH);

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(label, margin + 4, rowY + 8);

    // Valeur (highlight si montant)
    if (label === 'Montant du don') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...accentRGB);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...textDark);
    }
    doc.text(value, margin + labelW + 4, rowY + 8, { maxWidth: contentW - labelW - 6 });
  });

  y += rows.length * rowH + 14;

  // ── 5. Message de remerciement ──────────────────────────────────────────────
  drawRect(doc, margin, y, contentW, 32, [236, 253, 245]); // emerald-50
  doc.setDrawColor(...accentRGB);
  doc.setLineWidth(1.5);
  doc.line(margin, y, margin, y + 32); // barre verte gauche

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...accentRGB);
  doc.text('MESSAGE DE REMERCIEMENT', margin + 6, y + 8);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70); // emerald-900
  const thankMsg = `Au nom de ${church.name}, nous vous adressons notre profonde gratitude pour votre don de ${formatAmount(op.amount, currency)}. Votre générosité contribue à l'avancement du Royaume de Dieu et à la croissance de notre communauté. Que l'Éternel vous bénisse abondamment !`;
  const thankLines = doc.splitTextToSize(thankMsg, contentW - 12);
  doc.text(thankLines, margin + 6, y + 15);

  y += 42;

  // ── 6. Zone de signature ────────────────────────────────────────────────────
  drawHorizontalLine(doc, y);
  y += 10;

  const colW = contentW / 2;

  // Colonne gauche : Signature du donateur
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text('Signature du donateur', margin + colW / 2, y, { align: 'center' });
  y += 14;
  doc.setDrawColor(180, 180, 200);
  doc.setLineWidth(0.5);
  doc.line(margin + 10, y, margin + colW - 10, y);
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text(donorName, margin + colW / 2, y + 5, { align: 'center' });

  // Colonne droite : Cachet de l'église
  y -= 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text(`Cachet & Signature — ${church.name}`, margin + colW + colW / 2, y, { align: 'center' });
  y += 14;
  doc.line(margin + colW + 10, y, pageW - margin - 10, y);
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text('Responsable financier', margin + colW + colW / 2, y + 5, { align: 'center' });

  y += 18;

  // ── 7. Pied de page légal ───────────────────────────────────────────────────
  drawHorizontalLine(doc, pageH - 22, margin, pageW - margin);

  // Bande bas
  doc.setFillColor(...primaryRGB);
  doc.rect(0, pageH - 16, pageW, 16, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(199, 210, 254);
  const legal = `Ce reçu est un document officiel émis par ${church.name} et certifie la bonne réception du don ci-dessus. Il est valable comme justificatif de contribution.`;
  doc.text(legal, pageW / 2, pageH - 9, { align: 'center', maxWidth: 170 });

  // Numéro de page
  doc.setFontSize(7);
  doc.setTextColor(165, 180, 252);
  doc.text(`Reçu N° ${receiptNumber} — ${church.name}`, pageW / 2, pageH - 4, { align: 'center' });

  // ── 8. Décoration : cercle en arrière-plan ──────────────────────────────────
  doc.setDrawColor(230, 230, 250);
  doc.setLineWidth(0.3);
  doc.setFillColor(248, 248, 255);

  // ── 9. Sauvegarde ───────────────────────────────────────────────────────────
  const filename = `recu-don-${receiptNumber}.pdf`;
  doc.save(filename);
}
