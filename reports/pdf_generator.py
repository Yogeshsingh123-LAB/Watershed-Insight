"""
pdf_generator.py - Module 5 (Evidence Generator).

Produces the official, audit-ready PDF documents that turn satellite analytics
and geo-coded field photographs into decision-ready evidence:

1. **Intervention Evidence Pack** - one structure: where it is, what the
   satellite says changed inside its buffer, the field photographs that confirm
   it (with EXIF GPS stamps and automated content interpretation), the LULC
   transition, the seasonal response curve, an automated synthesis and the
   scientific limitations of the assessment.

2. **Watershed Assessment Report** - the whole micro-watershed: KPI dashboard,
   thematic maps (NDVI/NDWI/LULC/drainage), change detection, the
   intervention ranking with recommendations, the photo evidence audit and
   prioritised next actions.

Both are built with ReportLab and embed matplotlib figures rendered by
``geospatial.mapping``.
"""

from __future__ import annotations

import datetime as dt
import os
import tempfile
from typing import Dict, List, Optional, Sequence

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

from geospatial import mapping
from geospatial.geo_utils import safe_div

# --------------------------------------------------------------------------- #
# Palette & styles
# --------------------------------------------------------------------------- #
PRIMARY = colors.HexColor("#14532d")        # forest green
SECONDARY = colors.HexColor("#0369a1")      # water blue
ACCENT = colors.HexColor("#b45309")         # earth amber
DARK = colors.HexColor("#1e293b")
MUTED = colors.HexColor("#64748b")
LIGHT = colors.HexColor("#f1f5f9")
BORDER = colors.HexColor("#cbd5e1")
GOOD = colors.HexColor("#15803d")
WARN = colors.HexColor("#b45309")
BAD = colors.HexColor("#b91c1c")

_STYLES = getSampleStyleSheet()
S = {
    "title": ParagraphStyle("title", parent=_STYLES["Normal"], fontName="Helvetica-Bold",
                            fontSize=19, leading=23, textColor=PRIMARY),
    "subtitle": ParagraphStyle("subtitle", parent=_STYLES["Normal"], fontName="Helvetica",
                               fontSize=9.5, leading=13, textColor=SECONDARY),
    "h1": ParagraphStyle("h1", parent=_STYLES["Normal"], fontName="Helvetica-Bold",
                         fontSize=12.5, leading=15, textColor=PRIMARY,
                         spaceBefore=10, spaceAfter=5),
    "h2": ParagraphStyle("h2", parent=_STYLES["Normal"], fontName="Helvetica-Bold",
                         fontSize=10, leading=13, textColor=DARK,
                         spaceBefore=6, spaceAfter=3),
    "body": ParagraphStyle("body", parent=_STYLES["Normal"], fontName="Helvetica",
                           fontSize=8.6, leading=12, textColor=DARK, alignment=TA_JUSTIFY),
    "small": ParagraphStyle("small", parent=_STYLES["Normal"], fontName="Helvetica",
                            fontSize=7.4, leading=10, textColor=MUTED),
    "cell": ParagraphStyle("cell", parent=_STYLES["Normal"], fontName="Helvetica",
                           fontSize=8, leading=10.5, textColor=DARK),
    "cell_b": ParagraphStyle("cell_b", parent=_STYLES["Normal"], fontName="Helvetica-Bold",
                             fontSize=8, leading=10.5, textColor=DARK),
    "head": ParagraphStyle("head", parent=_STYLES["Normal"], fontName="Helvetica-Bold",
                           fontSize=8, leading=10.5, textColor=colors.white),
}


def _p(text, style="cell"):
    return Paragraph(str(text), S[style])


def _fmt(value, suffix="", decimals=2, sign=False):
    if value is None:
        return "n/a"
    try:
        fmt = f"{{:{'+' if sign else ''}.{decimals}f}}"
        return fmt.format(float(value)) + suffix
    except (TypeError, ValueError):
        return str(value)


def _kpi_card(title: str, value: str, note: str, color=PRIMARY) -> Table:
    inner = Table([[Paragraph(f"<b>{value}</b>", ParagraphStyle(
        "kpi", parent=S["cell"], fontSize=15, leading=17, textColor=color))],
        [Paragraph(f"<b>{title}</b>", ParagraphStyle("k", parent=S["small"], fontSize=7.6,
                                                     textColor=DARK))],
        [Paragraph(note, S["small"])]], colWidths=[52 * mm])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return inner


def _table(data, col_widths, header=True, zebra=True, align_right=()):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                  ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
    if zebra:
        for i in range(1 if header else 0, len(data)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f8fafc")))
    for col in align_right:
        style.append(("ALIGN", (col, 0), (col, -1), "RIGHT"))
    t.setStyle(TableStyle(style))
    return t


def _header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, height - 13 * mm, width, 13 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(15 * mm, height - 8.7 * mm,
                      "WATERSHED DEVELOPMENT EVIDENCE REPORT  |  DoLR  |  SRISHTI-DRISHTI ALIGNED")
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(width - 15 * mm, height - 8.7 * mm, "PS26015")
    canvas.setStrokeColor(BORDER)
    canvas.line(15 * mm, 13 * mm, width - 15 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(15 * mm, 9 * mm,
                      "Generated by DharaScan - automated geospatial evidence platform")
    canvas.drawRightString(width - 15 * mm, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


def _new_doc(path: str, title: str, author: str = "DharaScan"):
    doc = BaseDocTemplate(path, pagesize=A4,
                          leftMargin=15 * mm, rightMargin=15 * mm,
                          topMargin=19 * mm, bottomMargin=17 * mm,
                          title=title, author=author,
                          subject="Geospatial evidence for watershed development (SIH PS26015)")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="std", frames=[frame], onPage=_header_footer)])
    return doc


def _title_block(title: str, subtitle: str, meta_rows: Sequence[Sequence[str]]) -> List:
    story = [
        Table([[Paragraph(title, S["title"]),
                Paragraph(subtitle, S["subtitle"])]], colWidths=[112 * mm, 68 * mm]),
        Spacer(1, 4),
    ]
    head = [[_p(a, "cell_b"), _p(b, "cell"), _p(c, "cell_b"), _p(d, "cell")]
            for a, b, c, d in meta_rows]
    t = Table(head, colWidths=[30 * mm, 55 * mm, 32 * mm, 63 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("BACKGROUND", (2, 0), (2, -1), LIGHT),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]))
    story += [t, Spacer(1, 8)]
    return story


# --------------------------------------------------------------------------- #
# 1. Intervention Evidence Pack
# --------------------------------------------------------------------------- #
def _confidence_table(bundle: dict) -> Table:
    """Confidence components + background comparison, for the methodology page."""
    from geospatial.scoring import confidence_formula
    conf = bundle.get("confidence") or {}
    control = bundle.get("control_context") or {}
    a = bundle.get("analysis") or {}
    labels = {
        "observation_completeness": "Cloud-free coverage of the weaker epoch",
        "temporal_replication": "Usable epochs (4 = full marks)",
        "seasonal_matching": "Season match between T0 and T1",
        "photo_corroboration": "Verified geo-tagged photos in buffer",
        "spatial_coverage": "Buffer fully inside the imagery",
        "baseline_control": "Pre-works baseline observation exists",
    }
    rows = [[_p("<b>Confidence factor</b>"), _p("<b>Weight</b>"),
             _p("<b>Measured</b>"), _p("<b>Points</b>")]]
    for key, weight in (conf.get("weights") or {}).items():
        rows.append([
            _p(labels.get(key, key)),
            _p(f"{weight * 100:.0f} %"),
            _p(f"{(conf.get('factors') or {}).get(key, 0) * 100:.0f} %"),
            _p(f"{(conf.get('components') or {}).get(key, 0):.1f}"),
        ])
    rows.append([_p("<b>Confidence</b>"), _p(""), _p(""),
                 _p(f"<b>{conf.get('score', 0):.1f} / 100 ({conf.get('band', 'n/a')})</b>")])
    table = Table(rows, colWidths=[80 * mm, 22 * mm, 26 * mm, 22 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("BACKGROUND", (0, -1), (-1, -1), LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    body = [_p("<b>Impact is not confidence.</b> The impact score answers "
               "<i>how much</i> change was measured; the confidence score "
               "answers <i>how much that number can be trusted</i>. They are "
               "computed independently and must be read together."),
            _p(confidence_formula()),
            Spacer(1, 4), table]
    if control.get("available"):
        body += [
            Spacer(1, 6),
            _p(f"<b>Background comparison.</b> The identical scoring chain was "
               f"run at {control['n']} seeded random control points inside the "
               f"watershed: mean {control['mean']:.1f}, standard deviation "
               f"{control['std']:.1f}, median {control['median']:.1f}. This "
               f"structure sits at the "
               f"<b>{bundle.get('percentile_vs_control', 0):.0f}th percentile</b> "
               f"of that background. Its buffer change net of the "
               f"watershed-wide change is "
               f"<b>{a.get('net_ndvi_change_land', 0):+.3f} NDVI</b> "
               f"(buffer {a.get('ndvi_change_land', 0):+.3f} minus watershed "
               f"{(a.get('background') or {}).get('ndvi_change', 0):+.3f}), "
               f"which is the difference-in-differences estimate of the "
               f"structure's own effect as opposed to a good monsoon."),
        ]
    return Table([[item] for item in body], colWidths=[160 * mm],
                 style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                                   ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                   ("TOPPADDING", (0, 0), (-1, -1), 1),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))


def generate_intervention_pdf(store, intervention_id: str, output_path: str,
                              radius_m: float = 250.0,
                              include_photos: bool = True) -> str:
    """Build the single-structure evidence pack."""
    bundle = store.intervention_analysis(intervention_id, radius_m)
    item = bundle["intervention"]
    a = bundle["analysis"]
    ws = store.watershed_meta(item["watershed_id"])
    proc = store.processor(item["watershed_id"])
    tmpdir = tempfile.mkdtemp(prefix="ws-pdf-")
    story: List = []

    # ---- header -------------------------------------------------------- #
    story += _title_block(
        "Intervention Evidence Pack",
        f"<b>{ws.get('code')}</b> &middot; {ws.get('name')}<br/>"
        f"{ws.get('block')} block, {ws.get('district')}, {ws.get('state')}<br/>"
        f"Project: {ws.get('project')}",
        [
            ("Structure", f"{item['name']} ({item['id']})", "Type", item["type"].replace("_", " ").title()),
            ("GPS", f"{item['latitude']:.5f}°N, {item['longitude']:.5f}°E",
             "Installed", item.get("installation_date", "n/a")),
            ("Status", item.get("status", "n/a"), "Village", item.get("village", "n/a")),
            ("Sanctioned cost", f"₹ {int(item.get('cost_inr') or 0):,}",
             "Capacity", f"{item.get('capacity_tcm') or 0} TCM"),
            ("Baseline (T0)", a["epoch_a"]["date"], "Latest (T1)", a["epoch_b"]["date"]),
            ("Analysis buffer", f"{int(radius_m)} m ({a['buffer_area_ha']:.2f} ha)",
             "Report date", dt.date.today().isoformat()),
        ],
    )

    # ---- KPI strip ------------------------------------------------------ #
    conf = bundle.get("confidence") or {}
    control = bundle.get("control_context") or {}
    kpis = Table([[
        _kpi_card("Impact score", f"{a['impact_score']:.0f}/100",
                  f"Evidence: {a.get('evidence_strength', 'n/a')}",
                  GOOD if a["impact_score"] >= 60 else WARN if a["impact_score"] >= 40 else BAD),
        _kpi_card("Confidence", f"{conf.get('score', 0):.0f}/100",
                  f"{conf.get('band', 'n/a')} · {control.get('n', 0) and 'p' + str(round(bundle.get('percentile_vs_control') or 0)) + ' vs control' or 'no control sample'}",
                  GOOD if conf.get("score", 0) >= 75 else WARN if conf.get("score", 0) >= 55 else BAD),
        _kpi_card("Net of background", _fmt(a.get("net_ndvi_change_land", 0.0), sign=True, decimals=3),
                  f"watershed-wide ΔNDVI {(a.get('background') or {}).get('ndvi_change', 0):+.3f}"),
    ]], colWidths=[60 * mm, 60 * mm, 60 * mm])
    kpis.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                              ("TOPPADDING", (0, 0), (-1, -1), 0),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    story += [kpis, Spacer(1, 8)]

    # ---- 1. location map ------------------------------------------------ #
    story.append(Paragraph("1. Location &amp; Spatial Context", S["h1"]))
    map_path = os.path.join(tmpdir, "loc.png")
    terrain = store.terrain(item["watershed_id"])
    boundary_ring = store.boundary(item["watershed_id"])["geometry"]["coordinates"][0]
    photos_pts = [{"latitude": p.latitude, "longitude": p.longitude}
                  for p in store.photos_for(intervention_id=intervention_id) if p.has_gps]
    mapping.figure_location_map(
        proc.index(proc.t1_key, "ndvi"), proc.grid, map_path,
        title=f"NDVI ({proc.t1.date}) with {int(radius_m)} m analysis buffer",
        palette="ndvi",
        interventions=[item],
        photos=photos_pts,
        center=(item["latitude"], item["longitude"]),
        buffer_radius_m=radius_m,
        streams=terrain.streams,
        boundary_ring=boundary_ring,
    )
    story.append(Image(map_path, width=175 * mm, height=136 * mm))
    story.append(Paragraph(
        "Green marker: structure location; dashed green ring: analysis buffer; "
        "cyan: DEM-derived drainage network; dashed black: micro-watershed boundary; "
        "red dots: geo-coded field photographs.", S["small"]))

    # ---- 2. indicator table --------------------------------------------- #
    story.append(Paragraph("2. Satellite Indicator Change Inside the Buffer", S["h1"]))
    rows = [[_p("Indicator", "head"), _p(f"T0 ({a['epoch_a']['date']})", "head"),
             _p(f"T1 ({a['epoch_b']['date']})", "head"), _p("Change", "head"),
             _p("Relative", "head")]]
    rows += [
        [_p("Mean NDVI (all pixels)"), _p(_fmt(a["ndvi_before"], decimals=3)),
         _p(_fmt(a["ndvi_after"], decimals=3)), _p(_fmt(a["ndvi_change"], sign=True, decimals=3)),
         _p(_fmt(a["ndvi_change_pct"], " %", decimals=1, sign=True))],
        [_p("Mean NDVI (land only)*"), _p(_fmt(a["ndvi_before_land"], decimals=3)),
         _p(_fmt(a["ndvi_after_land"], decimals=3)),
         _p(_fmt(a["ndvi_change_land"], sign=True, decimals=3)), _p("-")],
        [_p("Mean NDWI"), _p(_fmt(a["ndwi_before"], decimals=3)),
         _p(_fmt(a["ndwi_after"], decimals=3)), _p(_fmt(a["ndwi_change"], sign=True, decimals=3)),
         _p("-")],
        [_p("Surface water area (ha)"), _p(_fmt(a["water_area_before_ha"])),
         _p(_fmt(a["water_area_after_ha"])),
         _p(_fmt(a["water_area_change_ha"], sign=True)),
         _p(_fmt(a["water_area_change_pct"], " %", decimals=1, sign=True))],
        [_p("Vegetated area, NDVI&gt;0.30 (ha)"), _p(_fmt(a["veg_area_before_ha"])),
         _p(_fmt(a["veg_area_after_ha"])), _p(_fmt(a["veg_area_change_ha"], sign=True)), _p("-")],
        [_p("Dense canopy, NDVI&gt;0.50 (ha)"), _p(_fmt(a["dense_veg_before_ha"])),
         _p(_fmt(a["dense_veg_after_ha"])), _p(_fmt(a["dense_veg_change_ha"], sign=True)), _p("-")],
        [_p("Area improved / degraded (ha)"),
         _p("-"), _p("-"),
         _p(f"{_fmt(a['area_improved_ha'], sign=True)} / {_fmt(-a['area_degraded_ha'], sign=True)}"),
         _p(f"{a['improved_pct']:.0f} % / {a['degraded_pct']:.0f} %")],
    ]
    story.append(_table(rows, [58 * mm, 28 * mm, 28 * mm, 33 * mm, 28 * mm]))
    story.append(Paragraph(
        "* <i>Land only</i> excludes pixels that were water before or after the intervention, so a new "
        "impoundment is not mistaken for vegetation loss. Pixels outside the buffer are ignored.",
        S["small"]))

    # ---- 3. LULC transition --------------------------------------------- #
    story.append(Paragraph("3. Land Use / Land Cover Transition in the Buffer", S["h1"]))
    lulc = bundle["lulc"]
    rows = [[_p("Class", "head"), _p(f"T0 (ha)", "head"), _p(f"T1 (ha)", "head"),
             _p("Δ (ha)", "head"), _p("Δ %", "head")]]
    for row in lulc["classes"]:
        rows.append([_p(row["label"]), _p(_fmt(row["t0_ha"])), _p(_fmt(row["t1_ha"])),
                     _p(_fmt(row["delta_ha"], sign=True)),
                     _p(_fmt(row["delta_pct"], " %", decimals=1, sign=True)
                        if row["delta_pct"] is not None else "-")])
    story.append(_table(rows, [66 * mm, 26 * mm, 26 * mm, 28 * mm, 29 * mm]))
    top = lulc["transition"].get("top_transitions", [])[:5]
    if top:
        story.append(Spacer(1, 3))
        story.append(Paragraph("Dominant conversions:", S["h2"]))
        for tr in top:
            arrow = "↑ improvement" if tr["direction"] == "improvement" else (
                "↓ degradation" if tr["direction"] == "degradation" else "→ lateral")
            story.append(Paragraph(
                f"• {tr['area_ha']:.2f} ha ({tr['pct_of_area']:.1f} %): "
                f"<b>{tr['from_label']}</b> → <b>{tr['to_label']}</b> ({arrow})", S["body"]))

    # ---- 4. seasonal response ------------------------------------------- #
    story.append(PageBreak())
    story.append(Paragraph("4. Seasonal Response Curve", S["h1"]))
    ts_path = os.path.join(tmpdir, "ts.png")
    mapping.figure_timeseries(bundle["timeseries"], ts_path,
                              title=f"Multi-temporal NDVI / NDWI inside the {int(radius_m)} m buffer")
    story.append(Image(ts_path, width=175 * mm, height=75 * mm))
    best = max(bundle["timeseries"], key=lambda s: s["ndvi"])
    worst = min(bundle["timeseries"], key=lambda s: s["ndvi"])
    story.append(Paragraph(
        f"Peak vegetation signal: <b>{best['date']}</b> (NDVI {best['ndvi']:.3f}); "
        f"minimum: <b>{worst['date']}</b> (NDVI {worst['ndvi']:.3f}). "
        f"Dry-season (pre-monsoon) values are the conservative test of intervention impact, "
        f"because they exclude the seasonal rainfall signal.", S["body"]))

    # ---- 5. field photographs ------------------------------------------- #
    story.append(Paragraph("5. Geo-Coded Field Photographs (DRISHTI Evidence)", S["h1"]))
    cross_checks = bundle.get("cross_checks", [])
    if not cross_checks:
        story.append(Paragraph(
            "No geo-coded photograph is currently bound to this structure. Upload a "
            "geo-tagged image through the dashboard to complete the evidence chain.", S["body"]))
    else:
        for idx, cc in enumerate(cross_checks[:3], start=1):
            photo = cc["photo"]
            interp = cc
            img_path = os.path.join(store.data_dir, "photos",
                                    os.path.basename(photo.get("url", "") or ""))
            if not os.path.exists(img_path):
                continue
            comp = interp.get("composition_pct", {})
            status_colour = {"agreement": GOOD, "partial_agreement": WARN,
                             "conflict": BAD}.get(cc.get("cross_check", {}).get("status"), MUTED)
            comp_text = (
                f"<b>Automated interpretation:</b> {interp.get('label_text', 'n/a')} "
                f"(confidence {interp.get('confidence', 'n/a')}).<br/>"
                f"Vegetation {comp.get('vegetation', 0):.0f} % &middot; "
                f"water {comp.get('water', 0):.0f} % &middot; "
                f"soil/earthwork {comp.get('soil_or_earthwork', 0):.0f} % &middot; "
                f"structure {comp.get('structure', 0):.0f} % &middot; sky {comp.get('sky', 0):.0f} %<br/>"
                f"Greenness index {interp.get('greenness_index', 0):+.2f} &middot; "
                f"sharpness {interp.get('sharpness', 0):.4f}"
                + (f" &middot; flags: {', '.join(interp.get('quality_flags', []))}"
                   if interp.get("quality_flags") else "")
            )
            exif_text = (
                f"<b>{photo.get('photo_id')}</b><br/>"
                f"Captured: {photo.get('timestamp', 'n/a')}<br/>"
                f"GPS: {photo.get('latitude', 'n/a')}, {photo.get('longitude', 'n/a')}<br/>"
                f"Distance to structure: {photo.get('distance_m', 'n/a')} m "
                f"({'inside' if photo.get('within_buffer') else 'outside'} the buffer)<br/>"
                f"Evidence status: <b>{photo.get('quality', 'n/a')}</b>"
                + (f" ({', '.join(photo.get('validation', []))})" if photo.get("validation") else "")
            )
            cell_text = Table([[Paragraph(comp_text, S["body"])],
                               [Paragraph(f"<b>Cross-check with satellite:</b> "
                                          f"{cc.get('cross_check', {}).get('summary', 'n/a')}",
                                          ParagraphStyle("cc", parent=S["body"],
                                                         textColor=status_colour))]],
                              colWidths=[112 * mm])
            cell_text.setStyle(TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            row = Table([[Image(img_path, width=62 * mm, height=46 * mm),
                          [Paragraph(exif_text, S["body"]), Spacer(1, 4), cell_text]]],
                        colWidths=[66 * mm, 114 * mm])
            row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                                     ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
            story.append(KeepTogether([Paragraph(f"5.{idx} Evidence photograph", S["h2"]),
                                       row, Spacer(1, 6)]))

    # ---- 6. synthesis ---------------------------------------------------- #
    story.append(Paragraph("6. Automated Analytical Synthesis", S["h1"]))
    synth = Table([[Paragraph(a["interpretation"], ParagraphStyle(
        "syn", parent=S["body"], fontSize=9, leading=13))]], colWidths=[175 * mm])
    synth.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ecfdf5")),
        ("BOX", (0, 0), (-1, -1), 1.0, GOOD),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(synth)
    story.append(Spacer(1, 4))

    rec = _recommendation_text(a["impact_score"], item)
    story.append(Paragraph(f"<b>Recommended action:</b> {rec}", S["body"]))

    # ---- 7. methodology --------------------------------------------------- #
    story.append(Paragraph("7. Methodology, Thresholds &amp; Scientific Limitations", S["h1"]))
    story.append(_confidence_table(bundle))
    story.append(Spacer(1, 6))
    for line in _limitations(proc, a, radius_m):
        story.append(Paragraph(line, S["body"]))

    # ---- sign-off --------------------------------------------------------- #
    story.append(Spacer(1, 10))
    sign = Table([
        [_p("Prepared by (automated)", "cell_b"), _p("Verified by (field officer)", "cell_b"),
         _p("Approved by (BDO / PD, WCDC)", "cell_b")],
        [_p("<br/><br/>Signature &amp; date", "small"), _p("<br/><br/>Signature &amp; date", "small"),
         _p("<br/><br/>Signature &amp; date", "small")],
    ], colWidths=[58 * mm, 58 * mm, 59 * mm])
    sign.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                              ("TOPPADDING", (0, 0), (-1, -1), 5),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story.append(sign)
    story.append(Paragraph(
        f"Document generated {dt.datetime.now().strftime('%d %b %Y, %H:%M')} by DharaScan "
        f"v1.0 (SIH PS26015). Evidence ID: {item['id']}-{dt.datetime.now().strftime('%Y%m%d%H%M')}.",
        S["small"]))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    _new_doc(output_path, f"Intervention Evidence Pack - {item['id']}").build(story)
    return output_path


def _recommendation_text(score: float, item: dict) -> str:
    if score >= 60:
        return (f"Retain {item['name']} as a demonstration structure; replicate the design at "
                f"untreated sites in the same drainage line and record it as an outcome case study.")
    if score >= 42:
        return (f"Schedule routine desilting and minor repair of {item['name']}; capture one further "
                f"dry-season (pre-monsoon) observation to confirm the trend.")
    if score >= 25:
        return (f"Field inspection of {item['name']} is required - verify inlet, siltation, seepage "
                f"and catchment condition before the next working season.")
    return (f"Prioritise {item['name']} for a joint field verification; consider redesign or "
            f"relocation if the structure is found non-functional.")


def _limitations(proc, analysis, radius_m) -> List[str]:
    return [
        f"<b>1. Epoch pairing.</b> The comparison uses {analysis['epoch_a']['date']} (T0) and "
        f"{analysis['epoch_b']['date']} (T1), both acquired in the same season where possible, so the "
        f"seasonal rainfall signal is largely controlled. Where seasons differ, part of the change "
        f"is attributable to rainfall rather than to the intervention.",
        "<b>2. Spatial resolution.</b> Analysis uses a 10-20 m surface-reflectance grid. Structures "
        "narrower than one pixel (small bunds, gully plugs, individual farm ponds) are subject to "
        "sub-pixel mixing and their signal is diluted.",
        f"<b>3. Buffer assumption.</b> A circular {int(radius_m)} m buffer is used as a standardised "
        f"zone of influence. The true hydrological zone of influence depends on slope, soil depth and "
        f"structure size; catchment-specific buffers should be used for detailed appraisal.",
        "<b>4. Attribution.</b> Satellite indicators demonstrate a spatial association, not proof of "
        "causation. Confounding factors include rainfall variability, cropping pattern change, "
        "groundwater extraction and interventions implemented by other schemes.",
        "<b>5. Photo evidence.</b> Field photographs are interpreted with deterministic colour-index "
        "models (ExG / VARI / blue-dominance) and are treated as supporting, not conclusive, evidence. "
        "Images flagged BLURRED, UNDEREXPOSED or MISSING_GPS should be re-captured.",
        "<b>6. Cloud &amp; atmospheric correction.</b> Epochs with high cloud cover are masked; residual "
        "cloud shadow can depress NDVI locally. Surface-reflectance (L2A) products are assumed.",
    ]


# --------------------------------------------------------------------------- #
# 2. Watershed Assessment Report
# --------------------------------------------------------------------------- #
def generate_watershed_pdf(store, watershed_id: str, output_path: str,
                           radius_m: float = 250.0) -> str:
    """Build the whole-micro-watershed assessment report."""
    ws = store.watershed_meta(watershed_id)
    proc = store.processor(watershed_id)
    stats = store.watershed_stats(watershed_id)
    ranking = store.ranking(watershed_id, radius_m)
    lulc = store.lulc_summary(watershed_id)
    change = store.change_detection(watershed_id)
    terrain = store.terrain_summary(watershed_id)["morphometry"]
    photo_stats = store.photo_stats(watershed_id)
    tmpdir = tempfile.mkdtemp(prefix="ws-pdf-")
    story: List = []

    story += _title_block(
        "Micro-Watershed Assessment Report",
        f"<b>{ws.get('code')}</b> &middot; {ws.get('name')}<br/>"
        f"{ws.get('block')} block, {ws.get('district')}, {ws.get('state')}<br/>"
        f"Project: {ws.get('project')}",
        [
            ("Watershed", f"{ws.get('code')} - {ws.get('name')}", "Area", f"{ws.get('area_ha')} ha"),
            ("Village", ws.get("village", "n/a"), "Rainfall", f"{ws.get('rainfall_mm')} mm/yr"),
            ("Soil", ws.get("soil", "n/a"), "Aquifer", ws.get("aquifer", "n/a")),
            ("Population", f"{ws.get('population'):,}", "Households", f"{ws.get('households'):,}"),
            ("Baseline (T0)", stats.get("epoch_t0"), "Latest (T1)", stats.get("epoch_t1")),
            ("Structures", len(ranking), "Geo-coded photos", photo_stats.get("total", 0)),
        ],
    )

    # ---- KPIs ------------------------------------------------------------ #
    kpis = Table([[
        _kpi_card("NDVI (watershed)", f"{stats['ndvi_mean_t1']:.3f}",
                  f"{stats['ndvi_change']:+.3f} vs baseline ({stats['ndvi_change_pct']:+.1f} %)",
                  GOOD if stats["ndvi_change"] > 0 else BAD),
        _kpi_card("Surface water", f"{stats['water_area_ha_t1']:.1f} ha",
                  f"{stats['water_area_change_ha']:+.2f} ha vs baseline", SECONDARY),
        _kpi_card("Vegetated area", f"{stats['veg_area_ha_t1']:.0f} ha",
                  f"{stats['veg_area_change_ha']:+.1f} ha vs baseline", GOOD),
    ]], colWidths=[60 * mm, 60 * mm, 60 * mm])
    kpis.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                              ("TOPPADDING", (0, 0), (-1, -1), 0),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    story += [kpis, Spacer(1, 8)]

    # ---- 1. thematic panels ---------------------------------------------- #
    story.append(Paragraph("1. Thematic Maps", S["h1"]))
    panels = []
    bounds = proc.grid
    t0 = proc.get_epoch(proc.t0_key)
    t1 = proc.get_epoch(proc.t1_key)
    for title, array, palette in (
        (f"NDVI {proc.t1.date}", t1.ndvi, "ndvi"),
        (f"NDWI {proc.t1.date}", t1.ndwi, "ndwi"),
        (f"NDVI change (T1 - T0)", t1.ndvi - t0.ndvi, "delta"),
    ):
        path = os.path.join(tmpdir, f"{palette}_{title.replace(' ', '_')}.png")
        mapping.figure_location_map(array, bounds, path, title=title, palette=palette,
                                    streams=None, boundary_ring=store.boundary(
                                        watershed_id)["geometry"]["coordinates"][0])
        panels.append(Image(path, width=85 * mm, height=66 * mm))
    grid = Table([panels[:2], panels[2:]], colWidths=[88 * mm, 88 * mm])
    grid.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                              ("TOPPADDING", (0, 0), (-1, -1), 2),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    story.append(grid)

    # ---- 2. LULC ---------------------------------------------------------- #
    story.append(Paragraph("2. Land Use / Land Cover Change", S["h1"]))
    bar_path = os.path.join(tmpdir, "lulc.png")
    mapping.figure_lulc_bars(lulc["classes"], bar_path,
                             title=f"LULC area: {stats.get('epoch_t0')} vs {stats.get('epoch_t1')}")
    rows = [[_p("Class", "head"), _p("T0 (ha)", "head"), _p("T1 (ha)", "head"),
             _p("Δ (ha)", "head"), _p("Share T1", "head")]]
    for row in lulc["classes"]:
        share = lulc["shares_t1_pct"].get(row["key"], 0)
        rows.append([_p(row["label"]), _p(_fmt(row["t0_ha"])), _p(_fmt(row["t1_ha"])),
                     _p(_fmt(row["delta_ha"], sign=True)), _p(f"{share:.1f} %")])
    side = Table([[Image(bar_path, width=88 * mm, height=39 * mm),
                   _table(rows, [33 * mm, 13.5 * mm, 13.5 * mm, 14 * mm, 13 * mm])]],
                 colWidths=[90 * mm, 90 * mm])
    side.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    story.append(side)
    tr = lulc["transition"]
    story.append(Paragraph(
        f"{tr['changed_area_ha']:.1f} ha ({tr['changed_pct']:.1f} % of the area) changed class "
        f"between the two epochs; {tr['unchanged_area_ha']:.1f} ha remained stable.", S["body"]))

    # ---- 3. change detection --------------------------------------------- #
    story.append(PageBreak())
    story.append(Paragraph("3. Change Detection &amp; Terrain Context", S["h1"]))
    rows = [[_p("Change class (ΔNDVI)", "head"), _p("Area (ha)", "head"), _p("Share", "head")]]
    for name, value in change["change_classes"].items():
        rows.append([_p(name.replace("_", " ").title()), _p(_fmt(value["area_ha"])),
                     _p(f"{value['pct_of_area']:.1f} %")])
    morph = [[_p("Parameter", "head"), _p("Value", "head"), _p("Parameter", "head"),
              _p("Value", "head")],
             [_p("Basin area"), _p(f"{terrain.get('basin_area_ha', 0):.1f} ha"),
              _p("Drainage density"), _p(f"{terrain.get('drainage_density_km_per_km2', 0):.2f} km/km²")],
             [_p("Total relief"), _p(f"{terrain.get('total_relief_m', 0):.1f} m"),
              _p("Stream frequency"), _p(f"{terrain.get('stream_frequency_per_km2', 0):.1f} /km²")],
             [_p("Mean slope"), _p(f"{terrain.get('mean_slope_pct', 0):.1f} %"),
              _p("Max Strahler order"), _p(f"{terrain.get('max_strahler_order', 0)}")],
             [_p("Stream length"), _p(f"{terrain.get('stream_length_km', 0):.2f} km"),
              _p("Form factor"), _p(f"{terrain.get('form_factor', 0):.3f}")]]
    side = Table([[_table(rows, [40 * mm, 20 * mm, 16 * mm]),
                   _table(morph, [24 * mm, 22 * mm, 26 * mm, 20 * mm])]],
                 colWidths=[88 * mm, 92 * mm])
    side.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    story.append(side)

    # ---- 4. ranking ------------------------------------------------------- #
    story.append(Paragraph("4. Intervention Performance &amp; Prioritisation", S["h1"]))
    rank_path = os.path.join(tmpdir, "rank.png")
    mapping.figure_ranking(ranking, rank_path, title="Composite impact score (0-100)")
    story.append(Image(rank_path, width=175 * mm, height=0.5 * mm * max(len(ranking), 1) * 1.9 + 34 * mm))
    rows = [[_p("#", "head"), _p("Structure", "head"), _p("Type", "head"),
             _p("Score", "head"), _p("ΔNDVI (land)", "head"), _p("ΔWater (ha)", "head"),
             _p("₹ / ha improved", "head"), _p("Action", "head")]]
    for row in ranking:
        rows.append([
            _p(row["rank"]), _p(row["name"][:34]), _p(row["type"].replace("_", " ")[:16]),
            _p(f"{row['impact_score']:.0f}"), _p(_fmt(row["ndvi_change_land"], sign=True, decimals=3)),
            _p(_fmt(row["water_area_change_ha"], sign=True)),
            _p(f"{row['cost_per_ha_improved_inr']:,}" if row.get("cost_per_ha_improved_inr") else "n/a"),
            _p(_short_action(row["impact_score"])),
        ])
    story.append(_table(rows, [7 * mm, 47 * mm, 24 * mm, 13 * mm, 22 * mm, 21 * mm,
                               23 * mm, 23 * mm]))

    # ---- 5. photo evidence audit ------------------------------------------ #
    story.append(Paragraph("5. Geo-Coded Photograph Evidence Audit", S["h1"]))
    rows = [[_p("Metric", "head"), _p("Value", "head"), _p("Metric", "head"), _p("Value", "head")]]
    pairs = [("Total photographs", "total"), ("With GPS", "with_gps"),
             ("Verified evidence", "verified"), ("Questionable", "questionable"),
             ("Inside buffer", "within_buffer"), ("Outside buffer", "outside_buffer"),
             ("Baseline records", "baseline_records"), ("Missing GPS", "without_gps")]
    for i in range(0, len(pairs), 2):
        left_l, left_k = pairs[i]
        right_l, right_k = pairs[i + 1] if i + 1 < len(pairs) else ("", "total")
        rows.append([_p(left_l), _p(photo_stats.get(left_k, 0)),
                     _p(right_l), _p(photo_stats.get(right_k, 0))])
    story.append(_table(rows, [46 * mm, 26 * mm, 46 * mm, 26 * mm]))
    if photo_stats.get("flags"):
        story.append(Paragraph(
            "Validation flags raised: " + ", ".join(
                f"{k} ({v})" for k, v in sorted(photo_stats["flags"].items(),
                                                key=lambda kv: -kv[1])), S["body"]))

    # ---- 6. recommendations ------------------------------------------------ #
    story.append(Paragraph("6. Prioritised Recommendations", S["h1"]))
    effective = [r for r in ranking if r["impact_score"] >= 60]
    watch = [r for r in ranking if 42 <= r["impact_score"] < 60]
    inspect = [r for r in ranking if r["impact_score"] < 42]
    total_cost = sum(r["cost_inr"] for r in ranking)
    story.append(Paragraph(
        f"<b>1. Consolidate and replicate.</b> {len(effective)} of {len(ranking)} structures "
        f"(₹ {sum(r['cost_inr'] for r in effective):,} of ₹ {total_cost:,} sanctioned) show a "
        f"high-confidence positive response. Use these as demonstration sites and replicate the "
        f"design in untreated reaches of the same drainage line.", S["body"]))
    story.append(Paragraph(
        f"<b>2. Maintain and re-observe.</b> {len(watch)} structures are performing moderately; "
        f"schedule pre-monsoon desilting, inlet cleaning and repeat geo-tagged photography.", S["body"]))
    story.append(Paragraph(
        f"<b>3. Field-verify.</b> {len(inspect)} structures returned no measurable response: "
        + (", ".join(r["name"] for r in inspect) if inspect else "none") +
        ". These should be inspected before further investment.", S["body"]))
    story.append(Paragraph(
        f"<b>4. Strengthen the evidence chain.</b> {photo_stats.get('without_gps', 0)} photograph(s) "
        f"lack GPS and {photo_stats.get('questionable', 0)} are flagged questionable. Mandatory "
        f"geo-tagging with the DRISHTI app (GPS enabled) before and after every intervention would "
        f"make 100 % of the archive machine-verifiable.", S["body"]))
    story.append(Paragraph(
        f"<b>5. Monitor on a fixed calendar.</b> Acquire and analyse one pre-monsoon (May) and one "
        f"post-monsoon (October) scene every year; season-matched differencing removes the rainfall "
        f"confounder and makes the trend statistically defensible.", S["body"]))

    # ---- 7. limitations ---------------------------------------------------- #
    story.append(Paragraph("7. Methodology &amp; Scientific Limitations", S["h1"]))
    for line in _limitations(proc, {"epoch_a": {"date": stats.get("epoch_t0")},
                                    "epoch_b": {"date": stats.get("epoch_t1")}}, radius_m)[:5]:
        story.append(Paragraph(line, S["body"]))

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"Document generated {dt.datetime.now().strftime('%d %b %Y, %H:%M')} by DharaScan "
        f"v1.0 • Smart India Hackathon 2026, Problem Statement PS26015 • "
        f"Department of Land Resources, Ministry of Rural Development.", S["small"]))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    _new_doc(output_path, f"Watershed Assessment - {ws.get('code')}").build(story)
    return output_path


def _short_action(score: float) -> str:
    if score >= 60:
        return "Replicate / showcase"
    if score >= 42:
        return "Maintain &amp; re-observe"
    if score >= 25:
        return "Field inspection"
    return "Verify / remediate"


# --------------------------------------------------------------------------- #
# Backwards-compatible entry point used by earlier versions of the API
# --------------------------------------------------------------------------- #
def generate_evidence_pdf(intervention_id: str, output_pdf_path: str,
                          data_dir: Optional[str] = None, radius_m: float = 250.0) -> str:
    """Legacy helper: build the intervention evidence pack without a store."""
    import importlib

    store_module = importlib.import_module("backend.app.services.store")
    store = store_module.get_store()
    return generate_intervention_pdf(store, intervention_id, output_pdf_path, radius_m)
