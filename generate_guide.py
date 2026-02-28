#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Guide d'utilisation de Vinea - Générateur PDF
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import (
    HexColor, white, black, Color
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib import colors
import os

# ─── Palette de couleurs ────────────────────────────────────────────────────────
INDIGO       = HexColor('#2563EB')   # primaire
INDIGO_DARK  = HexColor('#1E40AF')
INDIGO_LIGHT = HexColor('#EEF2FF')
PURPLE       = HexColor('#7C3AED')
EMERALD      = HexColor('#059669')
AMBER        = HexColor('#D97706')
ROSE         = HexColor('#E11D48')
GRAY_900     = HexColor('#111827')
GRAY_700     = HexColor('#374151')
GRAY_500     = HexColor('#6B7280')
GRAY_200     = HexColor('#E5E7EB')
GRAY_100     = HexColor('#F3F4F6')
UPCOMING     = HexColor('#7C3AED')   # violet pour fonctionnalités à venir

PAGE_W, PAGE_H = A4

# ─── Styles ─────────────────────────────────────────────────────────────────────
def build_styles():
    styles = getSampleStyleSheet()

    def add(name, **kw):
        if name in styles:
            styles[name].fontName      = kw.get('fontName', 'Helvetica')
            styles[name].fontSize      = kw.get('fontSize', 10)
            styles[name].textColor     = kw.get('textColor', GRAY_700)
            styles[name].leading       = kw.get('leading', 14)
            styles[name].spaceAfter    = kw.get('spaceAfter', 6)
            styles[name].spaceBefore   = kw.get('spaceBefore', 0)
            styles[name].leftIndent    = kw.get('leftIndent', 0)
            styles[name].alignment     = kw.get('alignment', TA_LEFT)
        else:
            styles.add(ParagraphStyle(name=name, **kw))
        return styles[name]

    add('Normal',
        fontName='Helvetica', fontSize=10, textColor=GRAY_700,
        leading=15, spaceAfter=6, alignment=TA_JUSTIFY)

    styles.add(ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=24,
        textColor=white, leading=30, spaceAfter=4, spaceBefore=0, alignment=TA_LEFT))

    styles.add(ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=16,
        textColor=INDIGO, leading=22, spaceAfter=8, spaceBefore=14, alignment=TA_LEFT))

    styles.add(ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=13,
        textColor=GRAY_900, leading=18, spaceAfter=6, spaceBefore=10, alignment=TA_LEFT))

    styles.add(ParagraphStyle('H4', fontName='Helvetica-Bold', fontSize=11,
        textColor=INDIGO_DARK, leading=16, spaceAfter=4, spaceBefore=8, alignment=TA_LEFT))

    styles.add(ParagraphStyle('Body', fontName='Helvetica', fontSize=10,
        textColor=GRAY_700, leading=15, spaceAfter=6, alignment=TA_JUSTIFY))

    styles.add(ParagraphStyle('VBullet', fontName='Helvetica', fontSize=10,
        textColor=GRAY_700, leading=14, spaceAfter=3, leftIndent=16,
        bulletIndent=4, alignment=TA_LEFT))

    styles.add(ParagraphStyle('SubBullet', fontName='Helvetica', fontSize=9.5,
        textColor=GRAY_500, leading=13, spaceAfter=2, leftIndent=32,
        bulletIndent=20, alignment=TA_LEFT))

    styles.add(ParagraphStyle('Note', fontName='Helvetica-Oblique', fontSize=9,
        textColor=GRAY_500, leading=13, spaceAfter=4, leftIndent=8, alignment=TA_LEFT))

    styles.add(ParagraphStyle('Upcoming', fontName='Helvetica-Bold', fontSize=10,
        textColor=UPCOMING, leading=14, spaceAfter=3, leftIndent=16,
        bulletIndent=4, alignment=TA_LEFT))

    styles.add(ParagraphStyle('TOC1', fontName='Helvetica-Bold', fontSize=11,
        textColor=INDIGO, leading=18, spaceAfter=3, spaceBefore=6, alignment=TA_LEFT))

    styles.add(ParagraphStyle('TOC2', fontName='Helvetica', fontSize=10,
        textColor=GRAY_700, leading=15, spaceAfter=2, leftIndent=14, alignment=TA_LEFT))

    styles.add(ParagraphStyle('Caption', fontName='Helvetica-Oblique', fontSize=8.5,
        textColor=GRAY_500, leading=12, spaceAfter=4, alignment=TA_CENTER))

    styles.add(ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=8,
        textColor=white, leading=10, spaceAfter=0, alignment=TA_CENTER))

    return styles

S = build_styles()

# ─── Helpers ─────────────────────────────────────────────────────────────────────
def h1(text): return Paragraph(text, S['H1'])
def h2(text): return Paragraph(text, S['H2'])
def h3(text): return Paragraph(text, S['H3'])
def h4(text): return Paragraph(text, S['H4'])
def body(text): return Paragraph(text, S['Body'])
def note(text): return Paragraph(f"💡 {text}", S['Note'])
def sp(h=0.3): return Spacer(1, h * cm)
def hr(): return HRFlowable(width='100%', thickness=1, color=GRAY_200, spaceAfter=6)

def bullet(text, sub=False):
    style = S['SubBullet'] if sub else S['VBullet']
    return Paragraph(f'• {text}', style)

def upcoming(text):
    return Paragraph(f"🔮 {text}", S['Upcoming'])

def section_header(text, color=INDIGO):
    """Bloc coloré pour les titres de section."""
    data = [[Paragraph(text, S['H2'])]]
    t = Table(data, colWidths=[PAGE_W - 4*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), INDIGO_LIGHT),
        ('LEFTPADDING',  (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING',   (0,0), (-1,-1), 6),
        ('BOTTOMPADDING',(0,0), (-1,-1), 6),
        ('LINEBELOW',    (0,0), (-1,-1), 2, INDIGO),
    ]))
    return t

def info_box(title, items, color=INDIGO_LIGHT, border=INDIGO):
    """Encadré informatif."""
    rows = [[Paragraph(f"<b>{title}</b>", S['H4'])]]
    for item in items:
        rows.append([Paragraph(f"• {item}", S['VBullet'])])
    t = Table(rows, colWidths=[PAGE_W - 4*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), color),
        ('BACKGROUND', (0,1), (-1,-1), HexColor('#FAFAFA')),
        ('LEFTPADDING',  (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('BOX', (0,0), (-1,-1), 1, border),
        ('LINEBELOW', (0,0), (0,0), 1, border),
    ]))
    return t

def upcoming_box(title, items):
    """Encadré violet pour les fonctionnalités à venir."""
    rows = [[Paragraph(f"🔮 {title}", ParagraphStyle('UBTitle',
        fontName='Helvetica-Bold', fontSize=11, textColor=UPCOMING, leading=16))]]
    for item in items:
        rows.append([Paragraph(f"→ {item}", ParagraphStyle('UBItem',
            fontName='Helvetica', fontSize=10, textColor=GRAY_700, leading=14, leftIndent=6))])
    t = Table(rows, colWidths=[PAGE_W - 4*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), HexColor('#F5F3FF')),
        ('BACKGROUND', (0,1), (-1,-1), HexColor('#FAFAFE')),
        ('LEFTPADDING',  (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('BOX', (0,0), (-1,-1), 1.5, UPCOMING),
        ('LINEBELOW', (0,0), (0,0), 1, UPCOMING),
        ('DASHEDLINE', (0,1), (-1,-1), 0.5, GRAY_200),
    ]))
    return t

# ─── En-tête / pied de page ──────────────────────────────────────────────────────
def on_first_page(canvas, doc):
    pass  # couverture gérée dans le contenu

def on_later_pages(canvas, doc):
    canvas.saveState()
    # Bandeau supérieur
    canvas.setFillColor(INDIGO)
    canvas.rect(0, PAGE_H - 1.2*cm, PAGE_W, 1.2*cm, fill=True, stroke=False)
    canvas.setFont('Helvetica-Bold', 9)
    canvas.setFillColor(white)
    canvas.drawString(2*cm, PAGE_H - 0.8*cm, "VINEA — Guide d'utilisation")
    canvas.drawRightString(PAGE_W - 2*cm, PAGE_H - 0.8*cm, "v1.7.0 | Février 2026")

    # Pied de page
    canvas.setFillColor(GRAY_200)
    canvas.rect(0, 0, PAGE_W, 1*cm, fill=True, stroke=False)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(GRAY_500)
    canvas.drawString(2*cm, 0.35*cm, "© 2026 Vinea – Gestion d'Église. Tous droits réservés.")
    canvas.drawRightString(PAGE_W - 2*cm, 0.35*cm, f"Page {doc.page}")
    canvas.restoreState()

# ─── COUVERTURE ──────────────────────────────────────────────────────────────────
def cover_page():
    elems = []

    # Fond bleu
    elems.append(Table(
        [[' ']],
        colWidths=[PAGE_W],
        rowHeights=[10*cm]
    ))
    # On construit la couverture avec un grand tableau
    cover_title = ParagraphStyle('CoverTitle',
        fontName='Helvetica-Bold', fontSize=36, textColor=white,
        leading=44, alignment=TA_CENTER, spaceAfter=6)
    cover_sub = ParagraphStyle('CoverSub',
        fontName='Helvetica', fontSize=14, textColor=HexColor('#C7D2FE'),
        leading=20, alignment=TA_CENTER, spaceAfter=4)
    cover_ver = ParagraphStyle('CoverVer',
        fontName='Helvetica-Bold', fontSize=11, textColor=HexColor('#A5B4FC'),
        leading=16, alignment=TA_CENTER)

    header_data = [[
        Paragraph("VINEA", cover_title),
    ],[
        Paragraph("Guide d'Utilisation Complet", cover_sub),
    ],[
        Paragraph("Système de Gestion d'Église", cover_sub),
    ],[
        Paragraph("Version 1.7.0  •  Février 2026", cover_ver),
    ]]

    header_table = Table(header_data, colWidths=[PAGE_W - 2*cm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), INDIGO),
        ('TOPPADDING',   (0,0), (0,0), 2.5*cm),
        ('BOTTOMPADDING',(0,-1), (-1,-1), 2*cm),
        ('LEFTPADDING',  (0,0), (-1,-1), 1*cm),
        ('RIGHTPADDING', (0,0), (-1,-1), 1*cm),
        ('TOPPADDING',   (0,1), (-1,-2), 0.2*cm),
        ('BOTTOMPADDING',(0,1), (-1,-2), 0.2*cm),
    ]))
    elems[0] = header_table

    elems.append(sp(1.2))

    # Résumé de l'application
    intro_style = ParagraphStyle('CoverIntro',
        fontName='Helvetica', fontSize=12, textColor=GRAY_700,
        leading=18, alignment=TA_CENTER, spaceAfter=6)
    elems.append(Paragraph(
        "Solution complète de gestion administrative et spirituelle pour les Églises<br/>"
        "francophones. Piloté par l'IA, intégrant membres, finances,<br/>"
        "présences, disciples, réunions et bien plus.",
        intro_style))

    elems.append(sp(1))

    # Modules en grille
    modules = [
        ("👥", "Membres"),       ("🧭", "Visiteurs"),
        ("📈", "Croissance"),    ("🤝", "Discipolat"),
        ("✅", "Présences"),     ("💰", "Finances"),
        ("📅", "Planning"),      ("🎤", "Services"),
        ("📋", "Réunions"),      ("🌿", "Méditations"),
        ("📊", "Rapports"),      ("⚙️",  "Paramètres"),
    ]
    rows = []
    row = []
    for i, (icon, label) in enumerate(modules):
        cell_style = ParagraphStyle('ModCell',
            fontName='Helvetica-Bold', fontSize=10, textColor=INDIGO,
            leading=14, alignment=TA_CENTER)
        cell = Table(
            [[Paragraph(icon, ParagraphStyle('MI', fontName='Helvetica', fontSize=18,
                         alignment=TA_CENTER, leading=22))],
             [Paragraph(label, cell_style)]],
            colWidths=[3.5*cm]
        )
        cell.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), INDIGO_LIGHT),
            ('BOX', (0,0), (-1,-1), 1, GRAY_200),
            ('TOPPADDING',    (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        row.append(cell)
        if (i+1) % 4 == 0:
            rows.append(row)
            row = []
    if row:
        rows.append(row)

    grid = Table(rows, colWidths=[3.5*cm]*4, hAlign='CENTER')
    grid.setStyle(TableStyle([
        ('ALIGN',  (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('INNERGRID', (0,0), (-1,-1), 0.5, white),
        ('BOX', (0,0), (-1,-1), 0, white),
        ('LEFTPADDING',  (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
    ]))
    elems.append(grid)

    elems.append(sp(1.5))
    elems.append(HRFlowable(width='100%', thickness=1.5, color=INDIGO))
    elems.append(sp(0.4))

    footer_style = ParagraphStyle('CoverFooter',
        fontName='Helvetica', fontSize=9, textColor=GRAY_500,
        leading=13, alignment=TA_CENTER)
    elems.append(Paragraph(
        "Propulsé par React · TypeScript · Supabase · Google Gemini AI<br/>"
        "© 2026 Vinea – Tous droits réservés",
        footer_style))

    elems.append(PageBreak())
    return elems

# ─── TABLE DES MATIÈRES ──────────────────────────────────────────────────────────
def toc_page():
    elems = []
    elems.append(Paragraph("Table des Matières", S['H2']))
    elems.append(HRFlowable(width='100%', thickness=2, color=INDIGO, spaceAfter=10))

    sections = [
        ("1.", "Introduction", [
            ("1.1", "À propos de Vinea"),
            ("1.2", "Prérequis et accès"),
            ("1.3", "Navigation générale"),
        ]),
        ("2.", "Tableau de Bord", []),
        ("3.", "Gestion des Membres", [
            ("3.1", "Ajouter un membre"),
            ("3.2", "Modifier un profil"),
            ("3.3", "Suivre les contributions"),
        ]),
        ("4.", "Gestion des Visiteurs", [
            ("4.1", "Enregistrer un visiteur"),
            ("4.2", "Suivi et relance"),
            ("4.3", "Conversion en membre"),
        ]),
        ("5.", "Croissance Spirituelle", [
            ("5.1", "Définir des objectifs annuels"),
            ("5.2", "Saisie des points mensuels"),
        ]),
        ("6.", "Discipolat", [
            ("6.1", "Parcours disponibles"),
            ("6.2", "Gérer les paires"),
        ]),
        ("7.", "Gestion des Présences", [
            ("7.1", "Enregistrer une présence"),
            ("7.2", "Alertes d'absences"),
        ]),
        ("8.", "Finances", [
            ("8.1", "Revenus et Dépenses"),
            ("8.2", "Campagnes de dons"),
            ("8.3", "Prédiction IA"),
        ]),
        ("9.", "Planning & Départements", [
            ("9.1", "Gérer les départements"),
            ("9.2", "Activités et tâches"),
        ]),
        ("10.", "Services & Sermons", [
            ("10.1", "Planifier un service"),
            ("10.2", "Analyse IA du sermon"),
        ]),
        ("11.", "Événements", []),
        ("12.", "Réunions & Procès-Verbaux", [
            ("12.1", "Créer une réunion"),
            ("12.2", "Générer un PV avec l'IA"),
        ]),
        ("13.", "Méditations", [
            ("13.1", "Créer une méditation"),
            ("13.2", "Génération IA"),
        ]),
        ("14.", "Rapports & Analytiques", []),
        ("15.", "Paramètres", [
            ("15.1", "Informations de l'Église"),
            ("15.2", "Gestion des collaborateurs"),
            ("15.3", "Notifications"),
        ]),
        ("16.", "Intelligence Artificielle", []),
        ("17.", "Fonctionnalités à Venir", []),
        ("18.", "Questions Fréquentes (FAQ)", []),
    ]

    for num, title, subs in sections:
        row_data = [[
            Paragraph(f"<b>{num}</b>", ParagraphStyle('TN', fontName='Helvetica-Bold',
                fontSize=11, textColor=INDIGO, leading=16)),
            Paragraph(f"<b>{title}</b>", S['TOC1']),
        ]]
        for snum, stitle in subs:
            row_data.append([
                Paragraph(snum, ParagraphStyle('TSN', fontName='Helvetica',
                    fontSize=10, textColor=GRAY_500, leading=14, leftIndent=10)),
                Paragraph(stitle, S['TOC2']),
            ])

        t = Table(row_data, colWidths=[1.2*cm, PAGE_W - 5.2*cm])
        t.setStyle(TableStyle([
            ('TOPPADDING',    (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING',   (0,0), (-1,-1), 4),
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elems.append(t)

    elems.append(PageBreak())
    return elems

# ─── CONTENU PRINCIPAL ───────────────────────────────────────────────────────────
def content():
    elems = []

    # ── 1. Introduction ──────────────────────────────────────────────────────────
    elems.append(section_header("1. Introduction"))
    elems.append(sp(0.3))

    elems.append(h3("1.1 À propos de Vinea"))
    elems.append(body(
        "<b>Vinea</b> est un système complet de gestion d'Église (ERP) conçu pour les "
        "communautés chrétiennes francophones. Son nom évoque la vigne — symbole de "
        "croissance organique, de soin et de fructification spirituelle."))
    elems.append(body(
        "L'application centralise en un seul endroit tous les aspects de la vie "
        "administrative et spirituelle d'une Église : gestion des membres, finances, "
        "présences, discipolat, réunions, méditations et bien plus, le tout enrichi "
        "par l'Intelligence Artificielle."))

    elems.append(info_box("Points clés", [
        "Interface 100 % en français, adaptée aux Églises africaines francophones",
        "Accessibilité sur navigateur web (ordinateur, tablette, smartphone)",
        "Données hébergées en sécurité sur Supabase (PostgreSQL)",
        "IA Google Gemini intégrée pour la génération de contenus et l'analyse",
        "Gestion multi-utilisateurs avec rôles et permissions granulaires",
        "Monnaie F CFA prise en charge nativement",
    ]))

    elems.append(sp(0.3))
    elems.append(h3("1.2 Prérequis et accès"))
    elems.append(body("Pour utiliser Vinea, vous avez besoin de :"))
    elems.append(bullet("Un navigateur web moderne (Chrome, Firefox, Edge, Safari)"))
    elems.append(bullet("Une connexion internet stable"))
    elems.append(bullet("Des identifiants fournis par votre administrateur"))
    elems.append(sp(0.2))
    elems.append(body("<b>Connexion :</b> Saisissez votre adresse e-mail et mot de passe "
        "sur la page de connexion. En cas de perte de mot de passe, contactez votre super-administrateur."))
    elems.append(note("La session reste active tant que vous ne vous déconnectez pas. "
        "Utilisez toujours le bouton de déconnexion sur les appareils partagés."))

    elems.append(sp(0.3))
    elems.append(h3("1.3 Navigation générale"))
    elems.append(body("L'interface se compose de trois zones principales :"))
    elems.append(bullet("<b>Barre latérale (sidebar)</b> — navigation entre les modules. "
        "Sur mobile, cliquez sur l'icône menu ☰ pour l'afficher."))
    elems.append(bullet("<b>Zone de contenu</b> — affiche le module actif."))
    elems.append(bullet("<b>En-tête</b> — cloche de notifications 🔔, profil utilisateur, "
        "et raccourcis d'actions rapides."))
    elems.append(sp(0.2))
    elems.append(body("Les <b>rôles disponibles</b> sont : Super Administrateur, Administrateur, "
        "Secrétaire, Trésorier, et autres rôles personnalisés. Chaque rôle détermine les "
        "modules accessibles."))

    elems.append(PageBreak())

    # ── 2. Tableau de bord ───────────────────────────────────────────────────────
    elems.append(section_header("2. Tableau de Bord"))
    elems.append(sp(0.3))
    elems.append(body(
        "Le tableau de bord est la page d'accueil après connexion. Il offre une vue "
        "d'ensemble synthétique de l'activité de l'Église."))

    elems.append(h3("Statistiques clés"))
    stats = [
        ["Indicateur", "Description"],
        ["Membres actifs",        "Nombre de membres avec statut « Actif »"],
        ["Revenus du mois",       "Total des entrées financières du mois en cours (F CFA)"],
        ["Dépenses du mois",      "Total des sorties financières du mois en cours"],
        ["Tendance de présence",  "Évolution de la fréquentation par rapport au mois précédent"],
    ]
    t = Table(stats, colWidths=[5*cm, PAGE_W - 9*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INDIGO),
        ('TEXTCOLOR',  (0,0), (-1,0), white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9.5),
        ('BACKGROUND', (0,1), (-1,-1), GRAY_100),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, GRAY_100]),
        ('GRID',       (0,0), (-1,-1), 0.5, GRAY_200),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elems.append(t)

    elems.append(sp(0.3))
    elems.append(h3("Graphiques et sections"))
    elems.append(bullet("<b>Graphique de tendance financière</b> — évolution mensuelle sur 6 mois"))
    elems.append(bullet("<b>Activités à venir</b> — prochaines activités des départements"))
    elems.append(bullet("<b>Analyse IA</b> — bouton « Analyser avec l'IA » pour obtenir des "
        "recommandations stratégiques basées sur les données du tableau de bord"))
    elems.append(note("L'IA contextualise son analyse avec l'heure de la journée et vous "
        "salue par votre prénom."))

    elems.append(upcoming_box("Fonctionnalités à venir — Tableau de bord", [
        "Widgets personnalisables par glisser-déposer",
        "Tableaux de bord distincts par rôle (Pasteur, Trésorier, Secrétaire…)",
        "Objectifs annuels de l'Église avec indicateurs de progression",
        "Flux d'actualités internes de l'Église",
    ]))

    elems.append(PageBreak())

    # ── 3. Gestion des Membres ───────────────────────────────────────────────────
    elems.append(section_header("3. Gestion des Membres"))
    elems.append(sp(0.3))
    elems.append(body(
        "Le module Membres est le cœur du système. Il centralise toutes les informations "
        "sur les fidèles de l'Église : identité, contacts, vie spirituelle, financière et relationnelle."))

    elems.append(h3("3.1 Ajouter un membre"))
    elems.append(body("Cliquez sur le bouton <b>+ Nouveau Membre</b>. Le formulaire comprend :"))

    fields_data = [
        ["Catégorie", "Champs"],
        ["Identité",        "Prénom, Nom, Surnom, Genre, Date de naissance"],
        ["Statut",          "Type (Pasteur, Ouvrier, Membre simple…), Statut (Actif, Inactif…)"],
        ["Situation",       "Statut matrimonial, Date de mariage, Profession, Compétences"],
        ["Contacts",        "Téléphone, WhatsApp, E-mail, Adresse, Contact d'urgence"],
        ["Vie spirituelle", "Date de baptême, Date d'adhésion, Département(s), Parrain/Disciple"],
        ["Notes",           "Source de recrutement, Remarques libres"],
        ["Photo",           "Téléchargement d'une photo de profil"],
    ]
    t = Table(fields_data, colWidths=[4*cm, PAGE_W - 8*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INDIGO),
        ('TEXTCOLOR',  (0,0), (-1,0), white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, GRAY_100]),
        ('GRID',       (0,0), (-1,-1), 0.5, GRAY_200),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
    ]))
    elems.append(t)

    elems.append(sp(0.3))
    elems.append(h3("3.2 Modifier et consulter un profil"))
    elems.append(bullet("Cliquez sur un membre dans la liste pour ouvrir sa fiche détaillée"))
    elems.append(bullet("Onglet <b>Informations</b> — données personnelles et contacts"))
    elems.append(bullet("Onglet <b>Contributions</b> — historique des transactions financières du membre"))
    elems.append(bullet("Onglet <b>Présences</b> — statistiques de fréquentation aux services"))
    elems.append(bullet("Utilisez l'icône ✏️ pour éditer, 🗑️ pour supprimer (avec confirmation)"))

    elems.append(sp(0.2))
    elems.append(h3("3.3 Recherche, filtres et export"))
    elems.append(bullet("Barre de recherche : par nom, prénom ou surnom"))
    elems.append(bullet("Filtres : par type de membre, statut, département, genre"))
    elems.append(bullet("Tri : ordre alphabétique, date d'adhésion, date de naissance"))
    elems.append(bullet("Export : téléchargez la liste en JSON pour sauvegarde"))
    elems.append(bullet("Import : importez une liste de membres depuis un fichier JSON"))

    elems.append(sp(0.2))
    elems.append(h3("3.4 Types et statuts de membres"))
    types_data = [
        ["Type", "Description"],
        ["Pasteur",       "Responsable principal de l'Église"],
        ["Assistant",     "Bras droit du pasteur"],
        ["Co-dirigeant",  "Membre de l'équipe de direction"],
        ["Ouvrier",       "Serviteur actif dans un ministère"],
        ["Membre simple", "Membre régulier de la communauté"],
    ]
    t = Table(types_data, colWidths=[3.5*cm, PAGE_W - 7.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INDIGO_DARK),
        ('TEXTCOLOR',  (0,0), (-1,0), white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, GRAY_100]),
        ('GRID',       (0,0), (-1,-1), 0.5, GRAY_200),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
    ]))
    elems.append(t)

    elems.append(upcoming_box("Fonctionnalités à venir — Membres", [
        "Application mobile membre : accès au profil personnel et exercices spirituels",
        "Code QR par membre pour pointage rapide aux présences",
        "Envoi de SMS/WhatsApp directement depuis la fiche membre",
        "Historique de déplacement géographique et affectation multi-sites",
        "Génération automatique de la carte de membre imprimable",
    ]))

    elems.append(PageBreak())

    # ── 4. Gestion des Visiteurs ─────────────────────────────────────────────────
    elems.append(section_header("4. Gestion des Visiteurs"))
    elems.append(sp(0.3))
    elems.append(body(
        "Le module Visiteurs permet de gérer le suivi pastoral des personnes qui découvrent l'Église. "
        "L'objectif est de les accompagner de leur première visite jusqu'à leur intégration en tant que membres."))

    elems.append(h3("4.1 Enregistrer un visiteur"))
    elems.append(body("Cliquez sur <b>+ Nouveau Visiteur</b>. Renseignez :"))
    elems.append(bullet("Nom, Prénom, Téléphone, E-mail, Adresse"))
    elems.append(bullet("Comment a-t-il entendu parler de l'Église ?"))
    elems.append(bullet("Questionnaire d'intégration : cherche-t-il une Église ? a-t-il des enfants ? "
        "veut-il servir ? est-il nouvellement converti ?"))
    elems.append(bullet("Assignation d'un parrain (membre responsable du suivi)"))

    elems.append(sp(0.2))
    elems.append(h3("4.2 Progression du suivi"))
    statuses = [
        ["Statut", "Signification"],
        ["En attente",       "Visiteur enregistré, pas encore contacté"],
        ["1er Contact",      "Premier appel ou message effectué"],
        ["Visite/Rencontre", "Rencontre physique planifiée ou réalisée"],
        ["Intégration",      "En cours d'intégration dans la communauté"],
        ["Membre",           "Converti en membre officiel de l'Église"],
    ]
    t = Table(statuses, colWidths=[4*cm, PAGE_W - 8*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), EMERALD),
        ('TEXTCOLOR',  (0,0), (-1,0), white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#F0FDF4')]),
        ('GRID',       (0,0), (-1,-1), 0.5, GRAY_200),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
    ]))
    elems.append(t)

    elems.append(sp(0.2))
    elems.append(h3("4.3 Fonctions IA pour les visiteurs"))
    elems.append(bullet("Génération de <b>message de bienvenue personnalisé</b> par l'IA"))
    elems.append(bullet("Suggestions de <b>prochaines étapes pastorales</b> selon le profil"))
    elems.append(bullet("Historique complet des actions de suivi avec dates et notes"))

    elems.append(upcoming_box("Fonctionnalités à venir — Visiteurs", [
        "Formulaire d'inscription visiteur accessible via QR code (kiosque d'accueil)",
        "Intégration WhatsApp Business API pour suivi automatisé",
        "Rapport mensuel d'évolution du pipeline visiteurs → membres",
        "Rappels automatiques par SMS au parrain assigné",
    ]))

    elems.append(PageBreak())

    # ── 5. Croissance Spirituelle ────────────────────────────────────────────────
    elems.append(section_header("5. Croissance Spirituelle"))
    elems.append(sp(0.3))
    elems.append(body(
        "Ce module permet de fixer des objectifs spirituels annuels pour chaque membre "
        "et de suivre leur progression mensuelle à travers 13 disciplines spirituelles."))

    elems.append(h3("5.1 Définir des objectifs annuels"))
    elems.append(body(
        "Depuis la fiche d'un membre, accédez à l'onglet <b>Croissance</b>. "
        "Pour chaque année, définissez des cibles pour les 13 disciplines suivantes :"))

    disciplines = [
        ("Prière",              "Nombre d'heures quotidiennes"),
        ("Jeûne",               "Fréquence hebdomadaire"),
        ("Lecture biblique",    "Fréquence annuelle (lectures complètes)"),
        ("Versets mémorisés",   "Versets par mois"),
        ("Livres chrétiens",    "Livres lus par an"),
        ("Méditation",          "Fois par semaine"),
        ("Évangélisation",      "Fois par mois"),
        ("Veillées",            "Fois par semaine"),
        ("Dîmes",               "Régularité mensuelle (Oui / Non)"),
        ("Retraites spirituelles", "Nombre et durée en jours"),
        ("Forum MIDC",          "Participation mensuelle (Oui / Non)"),
        ("Cellules dirigées",   "Animation mensuelle (Oui / Non)"),
    ]

    disc_data = [["Discipline", "Indicateur"]] + [[d, i] for d, i in disciplines]
    t = Table(disc_data, colWidths=[5*cm, PAGE_W - 9*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INDIGO),
        ('TEXTCOLOR',  (0,0), (-1,0), white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, GRAY_100]),
        ('GRID',       (0,0), (-1,-1), 0.5, GRAY_200),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 3),
        ('BOTTOMPADDING',(0,0), (-1,-1), 3),
    ]))
    elems.append(t)

    elems.append(sp(0.3))
    elems.append(h3("5.2 Saisie des points mensuels"))
    elems.append(body(
        "Chaque mois, saisissez les réalisations effectives de chaque membre. "
        "Le système calcule automatiquement un <b>score de 0 à 100</b> basé sur "
        "l'atteinte des objectifs fixés. Les données sont conservées dans l'historique."))

    elems.append(upcoming_box("Fonctionnalités à venir — Croissance Spirituelle", [
        "Auto-saisie par le membre lui-même via l'application mobile",
        "Graphiques d'évolution personnelle sur plusieurs années",
        "Comparaison anonymisée avec la moyenne de l'Église",
        "Badges de récompense spirituelle (Gamification)",
        "Rapport de groupe par cellule ou département",
    ]))

    elems.append(PageBreak())

    # ── 6. Discipolat ────────────────────────────────────────────────────────────
    elems.append(section_header("6. Discipolat"))
    elems.append(sp(0.3))
    elems.append(body(
        "Le module de Discipolat structure le programme de mentorat spirituel de l'Église. "
        "Il met en relation des mentors expérimentés avec des disciples et suit leur progression."))

    elems.append(h3("6.1 Les quatre parcours"))
    parcours = [
        ("Nouveaux Convertis",      "Pour les personnes nouvellement converties — fondements de la foi",       EMERALD),
        ("Affermissement",           "Approfondissement de la vie chrétienne — croissance et stabilité",         INDIGO),
        ("Leadership",               "Formation des futurs leaders et responsables de l'Église",                 AMBER),
        ("Service & Ministère",      "Équipement pour servir dans un ministère ou département spécifique",       ROSE),
    ]
    for name, desc, color in parcours:
        p_data = [[
            Paragraph(f"<b>{name}</b>", ParagraphStyle('PName',
                fontName='Helvetica-Bold', fontSize=10.5, textColor=white, leading=14)),
            Paragraph(desc, ParagraphStyle('PDesc',
                fontName='Helvetica', fontSize=9.5, textColor=white, leading=14)),
        ]]
        p = Table(p_data, colWidths=[5*cm, PAGE_W - 9*cm])
        p.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), color),
            ('LEFTPADDING',  (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING',   (0,0), (-1,-1), 6),
            ('BOTTOMPADDING',(0,0), (-1,-1), 6),
        ]))
        elems.append(p)
        elems.append(sp(0.1))

    elems.append(sp(0.2))
    elems.append(h3("6.2 Gérer les paires mentor-disciple"))
    elems.append(bullet("Créez une paire en sélectionnant un mentor et un disciple"))
    elems.append(bullet("Assignez le parcours et définissez la date de début"))
    elems.append(bullet("Suivez la progression (0–100%) et les statuts : Actif, En pause, Terminé"))
    elems.append(bullet("Consultez l'historique des séances et enregistrez les compte-rendus"))

    elems.append(upcoming_box("Fonctionnalités à venir — Discipolat", [
        "Curriculum structuré par parcours avec ressources PDF téléchargeables",
        "Agenda des séances avec rappels automatiques",
        "Évaluation en ligne du disciple à chaque étape du parcours",
        "Tableau de bord du mentor avec toutes ses paires actives",
        "Certification numérique à la fin de chaque parcours",
    ]))

    elems.append(PageBreak())

    # ── 7. Présences ─────────────────────────────────────────────────────────────
    elems.append(section_header("7. Gestion des Présences"))
    elems.append(sp(0.3))
    elems.append(body(
        "Ce module enregistre la fréquentation à chaque service ou activité de l'Église "
        "et génère automatiquement des alertes pastorales en cas d'absences répétées."))

    elems.append(h3("7.1 Enregistrer une session de présence"))
    elems.append(bullet("Cliquez sur <b>Nouvelle Présence</b>"))
    elems.append(bullet("Sélectionnez le type de service : Culte dominical, Enseignement, "
        "Veillée de prière, Jeûne, Convention…"))
    elems.append(bullet("Saisissez les effectifs : <b>Hommes</b>, <b>Femmes</b>, <b>Enfants</b>"))
    elems.append(bullet("Renseignez les membres absents pour un suivi nominatif"))
    elems.append(bullet("Ajoutez des observations (conditions météo, événement spécial…)"))

    elems.append(sp(0.2))
    elems.append(h3("7.2 Alertes automatiques"))
    elems.append(body(
        "Le système détecte automatiquement les absences critiques :"))
    elems.append(bullet("<b>2 absences consécutives</b> → Notification de suivi pastoral générée"))
    elems.append(bullet("Les notifications apparaissent dans la cloche 🔔 de l'en-tête"))
    elems.append(bullet("Historique complet des présences par service et par membre"))
    elems.append(note("Les statistiques de présence sont accessibles dans la fiche de chaque membre."))

    elems.append(upcoming_box("Fonctionnalités à venir — Présences", [
        "Pointage par code QR : le membre scanne depuis son téléphone",
        "Reconnaissance des membres par identifiant NFC/badge",
        "Présences en ligne pour les membres qui suivent à distance (streaming)",
        "Rapport hebdomadaire automatique envoyé au pasteur",
    ]))

    elems.append(PageBreak())

    # ── 8. Finances ───────────────────────────────────────────────────────────────
    elems.append(section_header("8. Finances"))
    elems.append(sp(0.3))
    elems.append(body(
        "Le module Finances offre une comptabilité complète de l'Église : revenus, dépenses, "
        "campagnes de dons, promesses de don et prédictions financières par l'IA."))

    elems.append(h3("8.1 Enregistrer une transaction"))
    elems.append(bullet("Cliquez sur <b>+ Nouvelle Opération</b>"))
    elems.append(bullet("Sélectionnez le type : <b>Revenu</b> (Entrée) ou <b>Dépense</b> (Sortie)"))
    elems.append(bullet("Catégories disponibles :"))
    elems.append(bullet("Revenus : Dîmes, Offrandes, Dons, Subventions…", sub=True))
    elems.append(bullet("Dépenses : Loyer, Électricité, Eau, Social, Mission, Maintenance…", sub=True))
    elems.append(bullet("Modes de paiement : Espèces, Mobile Money, Virement bancaire"))
    elems.append(bullet("Liaison possible avec un membre pour traçabilité individuelle"))

    elems.append(sp(0.2))
    elems.append(h3("8.2 Campagnes de dons"))
    elems.append(body("Créez des campagnes de collecte avec :"))
    elems.append(bullet("Un nom, une description et un montant cible"))
    elems.append(bullet("Une date de début et une date de fin"))
    elems.append(bullet("Un statut (Active / Terminée)"))
    elems.append(bullet("Une barre de progression automatique basée sur les dons reçus"))
    elems.append(body("Les <b>promesses de don</b> permettent aux membres de s'engager sur un montant "
        "futur, avec suivi de l'encaissement."))

    elems.append(sp(0.2))
    elems.append(h3("8.3 Reçu de don et analyse IA"))
    elems.append(bullet("Génération automatique d'un <b>reçu de don officiel</b> via l'IA"))
    elems.append(bullet("Analyse des tendances financières et <b>prédiction</b> pour le mois suivant"))
    elems.append(bullet("Détection des anomalies financières (variations inhabituelles)"))
    elems.append(bullet("Graphiques : répartition par catégorie (camembert) et évolution mensuelle"))

    elems.append(upcoming_box("Fonctionnalités à venir — Finances", [
        "Intégration Mobile Money (Orange Money, MTN MoMo, Wave) pour réception en temps réel",
        "Budget annuel prévisionnel avec alertes en cas de dépassement",
        "Rapport fiscal automatique conforme à la réglementation locale",
        "Module de paie pour les employés de l'Église",
        "Tableaux de bord financiers distincts par ministère/département",
        "Export Excel/CSV des états financiers",
    ]))

    elems.append(PageBreak())

    # ── 9. Planning & Départements ───────────────────────────────────────────────
    elems.append(section_header("9. Planning & Départements"))
    elems.append(sp(0.3))
    elems.append(body(
        "Ce module organise la vie des 16 départements de l'Église et planifie leurs activités."))

    elems.append(h3("9.1 Les 16 départements"))
    depts = [
        "Accueil & Protocole",       "Enfants",
        "Entretien et décoration",   "Évangélisation",
        "Femmes",                    "Finance",
        "Formation théologique",     "Formations et orientations",
        "Hommes",                    "Intercession",
        "Jeunes",                    "Louange et adoration",
        "Modération",                "Interprétation",
        "Œuvres sociales",           "Secrétariat, Médias & Communication",
    ]
    dept_rows = []
    for i in range(0, len(depts), 2):
        dept_rows.append([
            Paragraph(f"• {depts[i]}",   S['VBullet']),
            Paragraph(f"• {depts[i+1]}", S['VBullet']) if i+1 < len(depts) else Paragraph("", S['VBullet']),
        ])
    dt = Table(dept_rows, colWidths=[(PAGE_W-4*cm)/2]*2)
    dt.setStyle(TableStyle([
        ('TOPPADDING',    (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING',   (0,0), (-1,-1), 4),
    ]))
    elems.append(dt)

    elems.append(sp(0.2))
    elems.append(body("Chaque département dispose de : Président, Assistant, liste des membres, "
        "couleur personnalisée et statut (Actif/Inactif)."))

    elems.append(sp(0.2))
    elems.append(h3("9.2 Activités et tâches"))
    elems.append(bullet("Créez des activités avec titre, description, date limite, responsable"))
    elems.append(bullet("Récurrences disponibles : Ponctuelle, Quotidienne, Hebdomadaire, "
        "Mensuelle, Trimestrielle, Semestrielle, Annuelle"))
    elems.append(bullet("Statuts : Planifiée, En cours, Réalisée, Reportée, Annulée"))
    elems.append(bullet("Suivi des coûts associés à chaque activité"))
    elems.append(bullet("Calcul automatique de la prochaine occurrence pour les activités récurrentes"))

    elems.append(upcoming_box("Fonctionnalités à venir — Planning", [
        "Calendrier interactif mensuel / hebdomadaire avec vue Gantt",
        "Partage du planning des départements avec les membres via l'app mobile",
        "Intégration Google Calendar / Outlook",
        "Attribution de budgets par département avec suivi des dépenses",
        "Modèles d'activités réutilisables (ex. : Culte type dominical)",
    ]))

    elems.append(PageBreak())

    # ── 10. Services & Sermons ───────────────────────────────────────────────────
    elems.append(section_header("10. Services & Sermons"))
    elems.append(sp(0.3))
    elems.append(body(
        "Ce module archive tous les services religieux de l'Église et offre des outils "
        "IA pour analyser et valoriser les sermons."))

    elems.append(h3("10.1 Planifier un service"))
    elems.append(bullet("Date, heure et type de service"))
    elems.append(bullet("Série de prédication (optionnel)"))
    elems.append(bullet("Prédicateur, chef de louange, modérateur"))
    elems.append(bullet("Thème du sermon, références bibliques, contenu complet"))
    elems.append(bullet("Liens médias : YouTube, Facebook, audio"))

    elems.append(sp(0.2))
    elems.append(h3("10.2 Analyse IA du sermon"))
    elems.append(body("Depuis la fiche d'un service, cliquez sur <b>Analyser avec l'IA</b> :"))
    elems.append(bullet("Extraction des <b>points clés</b> du sermon"))
    elems.append(bullet("Suggestions de <b>questions de réflexion</b> pour les cellules"))
    elems.append(bullet("Génération d'un <b>résumé réseaux sociaux</b> (50 mots + hashtags)"))
    elems.append(bullet("Proposition de <b>mots-clés / tags</b> pour l'archivage"))
    elems.append(note("L'IA utilise exclusivement la version Louis Segond 1910 pour les références bibliques."))

    elems.append(upcoming_box("Fonctionnalités à venir — Services", [
        "Lecteur audio/vidéo intégré pour réécouter les sermons archivés",
        "Transcription automatique du sermon depuis un fichier audio",
        "Bibliothèque de sermons searchable par thème, référence biblique ou prédicateur",
        "Partage automatique sur les réseaux sociaux (Facebook, Instagram, WhatsApp)",
        "Téléchargement de la présentation PowerPoint du sermon",
    ]))

    elems.append(PageBreak())

    # ── 11. Événements ───────────────────────────────────────────────────────────
    elems.append(section_header("11. Événements"))
    elems.append(sp(0.3))
    elems.append(body(
        "Gérez les événements spéciaux de l'Église : conventions, retraites, concerts de louange, "
        "activités communautaires, etc."))

    elems.append(h3("Créer et gérer un événement"))
    elems.append(bullet("Titre, description, date et lieu de l'événement"))
    elems.append(bullet("Liste des participants attendus"))
    elems.append(bullet("Catégorisation de l'événement"))
    elems.append(bullet("Les rappels automatiques sont envoyés X jours avant (configurable dans Paramètres)"))
    elems.append(bullet("Basculement entre vue <b>À venir</b> et vue <b>Archive</b>"))

    elems.append(upcoming_box("Fonctionnalités à venir — Événements", [
        "Billetterie en ligne avec QR code de vérification à l'entrée",
        "Inscription des membres aux événements depuis l'application",
        "Gestion des intervenants extérieurs (invités, prédicateurs invités)",
        "Budget et gestion logistique de l'événement intégrés",
        "Publication automatique de l'affiche de l'événement sur les réseaux sociaux",
    ]))

    elems.append(PageBreak())

    # ── 12. Réunions & PV ────────────────────────────────────────────────────────
    elems.append(section_header("12. Réunions & Procès-Verbaux"))
    elems.append(sp(0.3))
    elems.append(body(
        "Planifiez, archivez et documentez toutes les réunions de l'Église. "
        "L'IA génère automatiquement les procès-verbaux officiels."))

    elems.append(h3("12.1 Créer une réunion"))
    elems.append(bullet("Titre, date, heure, lieu"))
    elems.append(bullet("Catégorie et priorité (Basse / Moyenne / Élevée)"))
    elems.append(bullet("Liste des participants et absents"))
    elems.append(bullet("Ordre du jour, résumé et décisions prises"))
    elems.append(bullet("Statuts : Programmé → Réalisé / Reporté / Annulé"))

    elems.append(sp(0.2))
    elems.append(h3("12.2 Générer un PV avec l'IA"))
    elems.append(body("Cliquez sur <b>Générer le PV</b> pour produire automatiquement :"))
    elems.append(bullet("Un <b>procès-verbal officiel</b> avec en-tête, liste de présences, "
        "points traités, résolutions et signature"))
    elems.append(bullet("Un <b>Flash Info</b> résumé formaté pour WhatsApp"))
    elems.append(bullet("L'extraction automatique des <b>tâches</b> avec responsables et délais"))
    elems.append(note("Le modèle Gemini Pro est utilisé pour les PV afin d'assurer un niveau "
        "de rédaction professionnelle élevé."))

    elems.append(upcoming_box("Fonctionnalités à venir — Réunions", [
        "Enregistrement audio de la réunion avec transcription automatique",
        "Visioconférence intégrée (Google Meet / Zoom) pour les réunions hybrides",
        "Suivi des tâches issues du PV avec tableau de bord des actions en cours",
        "Signature électronique des procès-verbaux",
        "Envoi automatique du PV par e-mail aux participants",
    ]))

    elems.append(PageBreak())

    # ── 13. Méditations ──────────────────────────────────────────────────────────
    elems.append(section_header("13. Méditations"))
    elems.append(sp(0.3))
    elems.append(body(
        "Constituez une bibliothèque de méditations spirituelles pour nourrir la communauté "
        "au quotidien. L'IA assiste la rédaction et propose des contenus inspirants."))

    elems.append(h3("13.1 Créer une méditation"))
    elems.append(bullet("Titre et résumé accrocheur"))
    elems.append(bullet("Référence et texte biblique (Louis Segond 1910)"))
    elems.append(bullet("Contenu développé de la méditation"))
    elems.append(bullet("Questions de réflexion pour les cellules ou le suivi personnel"))
    elems.append(bullet("Suivi de l'engagement : vues et « J'aime »"))

    elems.append(sp(0.2))
    elems.append(h3("13.2 Génération IA"))
    elems.append(bullet("Saisissez un thème ou un verset → l'IA rédige la méditation complète"))
    elems.append(bullet("Suggestions de titres accrocheurs selon le contenu"))
    elems.append(bullet("Génération de la <b>Pensée du Leader</b> : citation inspirante quotidienne"))

    elems.append(upcoming_box("Fonctionnalités à venir — Méditations", [
        "Notification push quotidienne « Méditation du jour » aux membres",
        "Partage de la méditation sur WhatsApp, Facebook et Instagram en un clic",
        "Podcast audio de la méditation généré par synthèse vocale",
        "Abonnement par e-mail à la méditation hebdomadaire",
        "Méditations catégorisées par thème, livre biblique ou saison liturgique",
    ]))

    elems.append(PageBreak())

    # ── 14. Rapports ─────────────────────────────────────────────────────────────
    elems.append(section_header("14. Rapports & Analytiques"))
    elems.append(sp(0.3))
    elems.append(body(
        "Consultez et exportez des synthèses analytiques sur tous les aspects de la vie de l'Église."))

    elems.append(h3("Rapports disponibles"))
    reports = [
        ("Membres",        "Statistiques démographiques, distribution par type/genre/âge"),
        ("Finances",       "Bilan revenus-dépenses, répartition par catégorie, tendances"),
        ("Présences",      "Fréquentation par service, évolution mensuelle, taux d'absence"),
        ("Départements",   "Performance des activités, taux de réalisation par département"),
        ("Croissance",     "Scores spirituels moyens, répartition par discipline"),
        ("Visiteurs",      "Taux de conversion, distribution par statut de suivi"),
    ]
    for title, desc in reports:
        elems.append(bullet(f"<b>{title}</b> — {desc}"))

    elems.append(upcoming_box("Fonctionnalités à venir — Rapports", [
        "Export PDF et Excel des rapports en un clic",
        "Rapport mensuel automatique envoyé au pasteur par e-mail",
        "Tableau de bord analytique interactif (filtrage dynamique)",
        "Comparaison annuelle N vs N-1 pour toutes les métriques",
        "Rapport personnalisé : sélection des indicateurs à inclure",
    ]))

    elems.append(PageBreak())

    # ── 15. Paramètres ───────────────────────────────────────────────────────────
    elems.append(section_header("15. Paramètres"))
    elems.append(sp(0.3))
    elems.append(body(
        "Configurez Vinea selon les spécificités de votre Église. "
        "Accessible uniquement aux Super Administrateurs et Administrateurs."))

    elems.append(h3("15.1 Informations de l'Église"))
    elems.append(bullet("Nom, logo, slogan, couleur principale"))
    elems.append(bullet("Téléphone, e-mail, adresse"))
    elems.append(bullet("Devise (F CFA par défaut), fuseau horaire, langue"))

    elems.append(sp(0.2))
    elems.append(h3("15.2 Gestion des collaborateurs"))
    roles_data = [
        ["Rôle", "Accès"],
        ["Super Administrateur", "Tous les modules + gestion des utilisateurs"],
        ["Administrateur",       "Tous les modules sauf gestion des utilisateurs"],
        ["Secrétaire",           "Membres, Visiteurs, Réunions, Événements"],
        ["Trésorier",            "Finances, Rapports"],
        ["Rôle personnalisé",    "Permissions granulaires par module"],
    ]
    t = Table(roles_data, colWidths=[5*cm, PAGE_W - 9*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), INDIGO),
        ('TEXTCOLOR',  (0,0), (-1,0), white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, GRAY_100]),
        ('GRID',       (0,0), (-1,-1), 0.5, GRAY_200),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
    ]))
    elems.append(t)

    elems.append(sp(0.2))
    elems.append(h3("15.3 Notifications"))
    elems.append(bullet("Activer/désactiver les alertes d'anniversaires, d'événements, de relances visiteurs"))
    elems.append(bullet("Configurer le nombre de jours avant pour les rappels d'événements"))
    elems.append(bullet("Notifications système pour les actions critiques (absences, etc.)"))

    elems.append(sp(0.2))
    elems.append(h3("15.4 Sauvegarde et restauration"))
    elems.append(bullet("Export complet des données en JSON (backup manuel)"))
    elems.append(bullet("Import et restauration depuis un fichier de sauvegarde"))
    elems.append(note("Effectuez une sauvegarde avant toute opération d'import ou de restauration."))

    elems.append(upcoming_box("Fonctionnalités à venir — Paramètres", [
        "Sauvegarde automatique programmée (quotidienne, hebdomadaire)",
        "Multi-sites : gestion de plusieurs succursales depuis un seul compte",
        "Thèmes visuels personnalisables (couleurs, polices)",
        "Audit complet des actions utilisateurs avec horodatage",
        "Intégration d'une API REST pour connexion à des systèmes externes",
    ]))

    elems.append(PageBreak())

    # ── 16. Intelligence Artificielle ────────────────────────────────────────────
    elems.append(section_header("16. Intelligence Artificielle (Google Gemini)"))
    elems.append(sp(0.3))
    elems.append(body(
        "Vinea intègre nativement <b>Google Gemini</b>, l'un des modèles d'IA les plus avancés au monde, "
        "pour augmenter les capacités de l'équipe pastorale et administrative."))

    elems.append(h3("Fonctions IA disponibles"))
    ai_features = [
        ("Tableau de bord",    "Analyse stratégique de la situation de l'Église"),
        ("Visiteurs",          "Message de bienvenue personnalisé, suggestions pastorales"),
        ("Services",           "Analyse du sermon, résumé réseaux sociaux, tags automatiques"),
        ("Réunions",           "Rédaction du PV officiel, Flash Info WhatsApp, extraction de tâches"),
        ("Méditations",        "Rédaction complète, titre, résumé, Pensée du Leader"),
        ("Finances",           "Reçu de don, prédiction financière, détection d'anomalies"),
    ]
    ai_data = [["Module", "Fonctions IA"]] + [[m, f] for m, f in ai_features]
    t = Table(ai_data, colWidths=[4*cm, PAGE_W - 8*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PURPLE),
        ('TEXTCOLOR',  (0,0), (-1,0), white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#F5F3FF')]),
        ('GRID',       (0,0), (-1,-1), 0.5, GRAY_200),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('VALIGN',     (0,0), (-1,-1), 'TOP'),
    ]))
    elems.append(t)

    elems.append(sp(0.2))
    elems.append(note(
        "Tous les contenus générés par l'IA peuvent être modifiés avant d'être utilisés. "
        "L'IA est un assistant, pas un remplaçant du jugement pastoral."))

    elems.append(upcoming_box("Fonctionnalités IA à venir", [
        "Assistant conversationnel intégré (chatbot) pour répondre aux questions de l'équipe",
        "Transcription automatique des sermons et réunions (Speech-to-Text)",
        "Analyse sentimentale des retours de membres",
        "Recommandations de parcours de discipolat personnalisées par profil spirituel",
        "Génération automatique du bulletin hebdomadaire de l'Église",
        "Traduction automatique des contenus en plusieurs langues",
    ]))

    elems.append(PageBreak())

    # ── 17. Fonctionnalités à venir (vue globale) ─────────────────────────────────
    elems.append(section_header("17. Feuille de Route — Fonctionnalités à Venir"))
    elems.append(sp(0.3))
    elems.append(body(
        "Le développement de Vinea est continu. Voici les grandes évolutions planifiées, "
        "classées par priorité et horizon temporel."))

    roadmap = [
        ("Court terme (3–6 mois)", EMERALD, [
            "Application mobile membre (iOS & Android) — profil, présences, méditations, croissance spirituelle",
            "Pointage par QR Code aux services",
            "Intégration Mobile Money (Orange, MTN, Wave) pour les collectes",
            "Export Excel/PDF des rapports et états financiers",
            "Envoi de messages WhatsApp depuis les fiches membres et visiteurs",
        ]),
        ("Moyen terme (6–12 mois)", AMBER, [
            "Calendrier interactif unifié (planning + événements + services)",
            "Billetterie événementielle avec QR code d'entrée",
            "Module de budget annuel prévisionnel par département",
            "Notification push vers l'application mobile",
            "Transcription automatique des sermons et réunions",
            "Tableau de bord personnalisable par rôle",
        ]),
        ("Long terme (12–24 mois)", INDIGO, [
            "Multi-sites : gestion de plusieurs succursales depuis un seul compte",
            "API REST publique pour intégration avec des systèmes tiers",
            "Assistant IA conversationnel (chatbot pastoral)",
            "Module de formation en ligne (e-learning) pour les membres",
            "Signature électronique des documents officiels",
            "Rapport fiscal automatique conforme à la réglementation",
            "Certification numérique des parcours de discipolat",
        ]),
    ]

    for horizon, color, items in roadmap:
        elems.append(KeepTogether([
            Table([[Paragraph(f"<b>{horizon}</b>",
                ParagraphStyle('HZN', fontName='Helvetica-Bold', fontSize=11,
                    textColor=white, leading=16))]],
                colWidths=[PAGE_W - 4*cm]
            ),
        ]))
        # Build the horizon header table
        h_data = [[Paragraph(f"<b>{'  ' + horizon}</b>",
            ParagraphStyle('HZ2', fontName='Helvetica-Bold', fontSize=11,
                textColor=white, leading=16, leftIndent=6))]]
        ht = Table(h_data, colWidths=[PAGE_W - 4*cm])
        ht.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), color),
            ('LEFTPADDING',  (0,0), (-1,-1), 8),
            ('TOPPADDING',   (0,0), (-1,-1), 6),
            ('BOTTOMPADDING',(0,0), (-1,-1), 6),
        ]))
        elems.append(ht)
        for item in items:
            elems.append(Paragraph(f"  🔮  {item}",
                ParagraphStyle('RM', fontName='Helvetica', fontSize=10,
                    textColor=GRAY_700, leading=14, spaceAfter=3, leftIndent=8)))
        elems.append(sp(0.3))

    elems.append(PageBreak())

    # ── 18. FAQ ───────────────────────────────────────────────────────────────────
    elems.append(section_header("18. Questions Fréquentes (FAQ)"))
    elems.append(sp(0.3))

    faqs = [
        ("Comment réinitialiser mon mot de passe ?",
         "Contactez votre Super Administrateur. Il peut réinitialiser votre mot de passe "
         "depuis le module Paramètres > Collaborateurs."),

        ("Comment ajouter un nouveau département ?",
         "Allez dans Paramètres > Départements et cliquez sur « + Département ». "
         "Vous pouvez configurer le nom, la couleur, le président et les membres."),

        ("L'IA ne génère pas de contenu, que faire ?",
         "Vérifiez que la clé API Google Gemini est correctement configurée dans "
         "Paramètres > Configuration IA. En cas de quota dépassé, patientez quelques minutes."),

        ("Comment sauvegarder mes données ?",
         "Allez dans Paramètres > Données et cliquez sur « Exporter ». "
         "Un fichier JSON complet de toutes vos données sera téléchargé."),

        ("Un membre est affiché en double, que faire ?",
         "Vérifiez si deux profils distincts ont été créés. Fusionnez les données manuellement "
         "en reportant les informations de l'un vers l'autre, puis supprimez le doublon."),

        ("Comment changer la devise affichée ?",
         "Dans Paramètres > Informations de l'Église, modifiez le champ Devise. "
         "Par défaut, l'application utilise le F CFA."),

        ("Puis-je accéder à Vinea depuis mon téléphone ?",
         "Oui, l'interface est responsive et s'adapte aux smartphones et tablettes. "
         "Une application mobile dédiée est en cours de développement."),

        ("Comment désactiver les notifications d'anniversaire ?",
         "Dans Paramètres > Notifications, décochez l'option « Anniversaires des membres »."),
    ]

    for q, a in faqs:
        q_para = Paragraph(f"❓ {q}",
            ParagraphStyle('FAQ_Q', fontName='Helvetica-Bold', fontSize=10.5,
                textColor=INDIGO_DARK, leading=15, spaceAfter=2, spaceBefore=8))
        a_para = Paragraph(a,
            ParagraphStyle('FAQ_A', fontName='Helvetica', fontSize=10,
                textColor=GRAY_700, leading=14, spaceAfter=2, leftIndent=16))
        elems.extend([q_para, a_para])
        elems.append(HRFlowable(width='100%', thickness=0.5, color=GRAY_200, spaceAfter=4))

    elems.append(sp(0.5))
    elems.append(HRFlowable(width='100%', thickness=1.5, color=INDIGO))
    elems.append(sp(0.3))

    contact_style = ParagraphStyle('Contact', fontName='Helvetica', fontSize=10,
        textColor=GRAY_700, leading=15, alignment=TA_CENTER)
    elems.append(Paragraph(
        "Pour toute assistance supplémentaire, contactez l'équipe de support Vinea.<br/>"
        "<b>© 2026 Vinea – Système de Gestion d'Église. Tous droits réservés.</b>",
        contact_style))

    return elems

# ─── CONSTRUCTION DU PDF ─────────────────────────────────────────────────────────
def generate_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=1.8*cm,
        bottomMargin=1.8*cm,
        leftMargin=2*cm,
        rightMargin=2*cm,
        title="Guide d'utilisation Vinea",
        author="Vinea – Système de Gestion d'Église",
        subject="Guide d'utilisation complet v1.7.0",
        creator="Vinea PDF Generator",
    )

    story = []
    story += cover_page()
    story += toc_page()
    story += content()

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f"✅ PDF généré : {output_path}")

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), "Guide_Utilisation_Vinea.pdf")
    generate_pdf(out)
