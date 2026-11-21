"""Deterministic compiler from high-level semantic visual components to strict VectorObject SVG scenes.

Allows DeepSeek to compose clean, zero-overlap, template-harmonized knowledge animations
without hand-calculating dozens of raw SVG path coordinates or risking label collisions.
"""
from __future__ import annotations

import math
import re
from typing import Any

_ID_SAFE = re.compile(r"[^A-Za-z0-9_-]")


def _clean_prefix(raw: Any, fallback: str) -> str:
    text = _ID_SAFE.sub("_", str(raw or fallback)).strip("_")
    if not text or not text[0].isalpha():
        text = f"C_{text or fallback}"
    return text[:28]


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _num(value: Any, default: float, low: float = -10000.0, high: float = 10000.0) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return default
    return _clamp(float(value), low, high)


def _palette_color(profile: dict[str, Any], role: Any, default_role: str = "blue") -> str:
    palette = profile["palette"]
    if isinstance(role, str) and role in palette:
        return palette[role]
    return palette.get(default_role, palette["blue"])


def _material_for(profile: dict[str, Any]) -> str:
    sid = profile.get("id", "")
    if sid == "paper-editorial":
        return "paper-layer"
    if sid == "precision-science":
        return "frosted"
    if sid == "narrative-collage":
        return "ink-print"
    return "flat"


def _stroke_w(profile: dict[str, Any]) -> float:
    sid = profile.get("id", "")
    if sid == "modern-graphic":
        return 3.0
    if sid == "narrative-collage":
        return 2.4
    if sid == "paper-editorial":
        return 1.6
    return 2.0


def _corner_r(profile: dict[str, Any]) -> int:
    sid = profile.get("id", "")
    if sid == "modern-graphic":
        return 10
    if sid == "paper-editorial":
        return 18
    if sid == "narrative-collage":
        return 6
    return 16


def _hold(duration_ms: int, x: float, y: float, opacity: float = 1.0) -> list[dict[str, Any]]:
    rx, ry = round(x, 1), round(y, 1)
    return [
        {"time_ms": 0, "x": rx, "y": ry, "opacity": opacity, "scale": 1, "rotation": 0},
        {"time_ms": duration_ms, "x": rx, "y": ry, "opacity": opacity, "scale": 1, "rotation": 0},
    ]


def _compile_bar_chart(spec: dict[str, Any], profile: dict[str, Any], duration_ms: int, idx: int) -> list[dict[str, Any]]:
    prefix = _clean_prefix(spec.get("id_prefix"), f"BAR{idx}")
    x = _num(spec.get("x"), 180, 80, 1100)
    y = _num(spec.get("y"), 220, 160, 560)
    w = _num(spec.get("width"), 640, 220, 1280)
    h = _num(spec.get("height"), 360, 140, 480)
    bars = spec.get("bars")
    if not isinstance(bars, list) or not bars:
        return []
    bars = bars[:12]
    max_val = max((_num(b.get("value"), 1, 0.01, 1e9) for b in bars if isinstance(b, dict)), default=1.0)
    reveal_start = int(_num(spec.get("reveal_start_ms"), 500, 0, max(100, duration_ms - 800)))
    reveal_end = int(_num(spec.get("reveal_end_ms"), min(duration_ms - 500, reveal_start + 3200), reveal_start + 300, duration_ms))

    p = profile["palette"]
    mat = _material_for(profile)
    sw = _stroke_w(profile)
    rx = min(12, _corner_r(profile))
    baseline_y = y + h
    gap = max(10.0, w * 0.03)
    bar_w = max(20.0, (w - gap * (len(bars) + 1)) / len(bars))
    objects: list[dict[str, Any]] = [
        {
            "id": f"{prefix}_AXIS",
            "label": "数据基线",
            "shape": "path",
            "x": 0,
            "y": 0,
            "path": f"M{round(x, 1)} {round(baseline_y, 1)} L{round(x + w, 1)} {round(baseline_y, 1)}",
            "fill": p["shade"],
            "fillOpacity": 0,
            "stroke": p["shade"],
            "strokeWidth": sw,
            "lineCap": "round",
            "zIndex": 2,
            "keyframes": _hold(duration_ms, 0, 0),
        }
    ]
    step_span = max(120, int((reveal_end - reveal_start) / max(1, len(bars))))
    for i, item in enumerate(bars):
        if not isinstance(item, dict):
            continue
        val = _num(item.get("value"), 1, 0.01, 1e9)
        bh = max(18.0, (val / max_val) * (h - 40))
        bx = x + gap + i * (bar_w + gap)
        by = baseline_y - bh
        highlight = bool(item.get("highlight"))
        t0 = min(duration_ms - 400, reveal_start + i * step_span)
        t1 = min(duration_ms - 100, t0 + max(500, step_span * 2))
        frames = [
            {"time_ms": 0, "x": round(bx, 1), "y": round(baseline_y - 4, 1), "opacity": 0, "scale": 0.25, "rotation": 0, "easing": "ease-out-cubic"},
        ]
        if t0 > 0:
            frames.append({"time_ms": t0, "x": round(bx, 1), "y": round(baseline_y - 4, 1), "opacity": 0.05, "scale": 0.3, "rotation": 0, "easing": "ease-out-cubic"})
        frames.append({"time_ms": t1, "x": round(bx, 1), "y": round(by, 1), "opacity": 1, "scale": 1, "rotation": 0})
        if t1 < duration_ms:
            frames.append({"time_ms": duration_ms, "x": round(bx, 1), "y": round(by, 1), "opacity": 1, "scale": 1, "rotation": 0})
        label_text = str(item.get("label", i + 1))[:16]
        objects.append(
            {
                "id": f"{prefix}_B{i + 1}",
                "label": f"柱状项 {label_text}",
                "shape": "rect",
                "x": round(bx, 1),
                "y": round(by, 1),
                "width": round(bar_w, 1),
                "height": round(bh, 1),
                "cornerRadius": rx,
                "fill": p["red"] if highlight else p["blue"],
                "stroke": p["gold"] if highlight else p["ink"],
                "strokeWidth": sw + 1 if highlight else sw * 0.7,
                "materialKey": mat,
                "zIndex": 5 if highlight else 3,
                "keyframes": frames,
            }
        )
        objects.append(
            {
                "id": f"{prefix}_L{i + 1}",
                "label": f"刻度 {label_text}",
                "shape": "text",
                "x": round(bx + bar_w / 2, 1),
                "y": round(baseline_y + 30, 1),
                "text": label_text,
                "fill": p["red"] if highlight else p["muted"],
                "fontSize": 22 if highlight else 19,
                "fontWeight": 700 if highlight else 500,
                "textAnchor": "middle",
                "zIndex": 6,
                "keyframes": _hold(duration_ms, bx + bar_w / 2, baseline_y + 30),
            }
        )
    return objects


def _compile_carrier_chamber(spec: dict[str, Any], profile: dict[str, Any], duration_ms: int, idx: int) -> list[dict[str, Any]]:
    prefix = _clean_prefix(spec.get("id_prefix"), f"CH{idx}")
    x = _num(spec.get("x"), 160, 80, 960)
    y = _num(spec.get("y"), 280, 210, 520)
    w = _num(spec.get("width"), 640, 280, 1180)
    h = _num(spec.get("height"), 240, 140, 380)
    mode = str(spec.get("mode", "flip"))
    flip_ms = int(_num(spec.get("flip_ms"), duration_ms * 0.5, 600, max(700, duration_ms - 600)))
    count = int(_num(spec.get("particle_count"), 10, 4, 14))
    left_label = str(spec.get("left_label", ""))[:24]
    right_label = str(spec.get("right_label", ""))[:24]

    p = profile["palette"]
    mat = _material_for(profile)
    sw = _stroke_w(profile)
    rx = _corner_r(profile)
    objects: list[dict[str, Any]] = [
        {
            "id": f"{prefix}_BODY",
            "label": "核心机制截面舱",
            "shape": "rect",
            "x": round(x, 1),
            "y": round(y, 1),
            "width": round(w, 1),
            "height": round(h, 1),
            "cornerRadius": rx,
            "fill": p["material"],
            "fillOpacity": 0.92,
            "stroke": p["shade"],
            "strokeWidth": sw,
            "materialKey": mat,
            "zIndex": 2,
            "keyframes": _hold(duration_ms, x, y),
        },
        {
            "id": f"{prefix}_ZONE",
            "label": "中心屏障区",
            "shape": "rect",
            "x": round(x + w / 2 - 28, 1),
            "y": round(y + 14, 1),
            "width": 56,
            "height": round(h - 28, 1),
            "cornerRadius": max(4, rx - 6),
            "fill": p["gold"],
            "fillOpacity": 0.34,
            "stroke": p["gold"],
            "strokeWidth": sw * 0.8,
            "zIndex": 3,
            "keyframes": [
                {"time_ms": 0, "x": round(x + w / 2 - 28, 1), "y": round(y + 14, 1), "opacity": 0.65, "scale": 0.85, "rotation": 0, "easing": "ease-in-out-cubic"},
                {"time_ms": flip_ms, "x": round(x + w / 2 - 28, 1), "y": round(y + 14, 1), "opacity": 0.95 if mode != "flow" else 0.7, "scale": 1.2 if mode != "flow" else 0.9, "rotation": 0, "easing": "ease-in-out-cubic"},
                {"time_ms": duration_ms, "x": round(x + w / 2 - 28, 1), "y": round(y + 14, 1), "opacity": 0.95 if mode != "flow" else 0.7, "scale": 1.25 if mode != "flow" else 0.9, "rotation": 0},
            ],
        },
    ]
    # Place zone labels strictly ABOVE the chamber to prevent any particle overlap!
    if left_label:
        objects.append(
            {
                "id": f"{prefix}_LBL_L",
                "label": left_label,
                "shape": "text",
                "x": round(x + w * 0.24, 1),
                "y": round(y - 22, 1),
                "text": left_label,
                "fill": p["red"],
                "fontSize": 22,
                "fontWeight": 600,
                "textAnchor": "middle",
                "zIndex": 7,
                "keyframes": _hold(duration_ms, x + w * 0.24, y - 22),
            }
        )
    if right_label:
        objects.append(
            {
                "id": f"{prefix}_LBL_R",
                "label": right_label,
                "shape": "text",
                "x": round(x + w * 0.76, 1),
                "y": round(y - 22, 1),
                "text": right_label,
                "fill": p["blue"],
                "fontSize": 22,
                "fontWeight": 600,
                "textAnchor": "middle",
                "zIndex": 7,
                "keyframes": _hold(duration_ms, x + w * 0.76, y - 22),
            }
        )
    # Golden-ratio staggered carriers strictly inside chamber bounds
    for i in range(count):
        is_red = i % 2 == 0
        lane = i % 4
        phase = (i * 0.6180339887) % 1.0
        py = y + 36 + lane * ((h - 72) / 3.0)
        x_left = x + 34 + phase * (w * 0.34)
        x_right = x + w - 34 - phase * (w * 0.34)
        start_x = x_left if is_red else x_right
        mid_x = (x + w - 42) if (is_red and mode != "blocked") else (x + 42 if (not is_red and mode != "blocked") else start_x)
        end_x = x_left if (is_red and mode != "flow") else (x_right if (not is_red and mode != "flow") else mid_x)
        objects.append(
            {
                "id": f"{prefix}_P{i + 1}",
                "label": "正向粒子" if is_red else "反向粒子",
                "shape": "circle",
                "x": round(start_x, 1),
                "y": round(py, 1),
                "radius": 11 if is_red else 9.5,
                "fill": p["red"] if is_red else p["blue"],
                "stroke": p["ink"],
                "strokeWidth": 1.2,
                "zIndex": 6,
                "keyframes": [
                    {"time_ms": 0, "x": round(start_x, 1), "y": round(py, 1), "opacity": 0.95, "scale": 1, "rotation": 0, "easing": "ease-in-out-cubic"},
                    {"time_ms": flip_ms, "x": round(mid_x, 1), "y": round(py + (-6 if is_red else 6), 1), "opacity": 1, "scale": 1.06, "rotation": 0, "easing": "ease-in-out-cubic"},
                    {"time_ms": duration_ms, "x": round(end_x, 1), "y": round(py, 1), "opacity": 0.95, "scale": 1, "rotation": 0},
                ],
            }
        )
    return objects


def _compile_wave_band(spec: dict[str, Any], profile: dict[str, Any], duration_ms: int, idx: int) -> list[dict[str, Any]]:
    prefix = _clean_prefix(spec.get("id_prefix"), f"WV{idx}")
    x = _num(spec.get("x"), 180, 80, 1000)
    y = _num(spec.get("y"), 280, 180, 620)
    w = _num(spec.get("width"), 640, 200, 1240)
    waves = spec.get("waves")
    if not isinstance(waves, list) or not waves:
        waves = [{"frequency": 1.2, "color_role": "red"}, {"frequency": 2.2, "color_role": "blue"}]
    waves = waves[:5]
    reveal_start = int(_num(spec.get("reveal_start_ms"), 400, 0, max(100, duration_ms - 800)))
    reveal_end = int(_num(spec.get("reveal_end_ms"), min(duration_ms - 400, reveal_start + 3600), reveal_start + 400, duration_ms))
    sw = _stroke_w(profile) + 2.0
    objects: list[dict[str, Any]] = []
    for i, item in enumerate(waves):
        if not isinstance(item, dict):
            continue
        freq = _num(item.get("frequency"), 1.2 + i * 0.6, 0.4, 5.0)
        amp = _num(item.get("amplitude"), 22, 6, 48)
        dy = y + i * 68
        color = _palette_color(profile, item.get("color_role"), ["red", "gold", "blue"][i % 3])
        pts = []
        for step in range(37):
            u = step / 36.0
            px = x + u * w
            py = dy + math.sin(u * math.pi * 2 * freq) * amp
            pts.append(f"{'M' if step == 0 else 'L'}{px:.1f} {py:.1f}")
        t1 = min(duration_ms, reveal_end + i * 250)
        frames = [
            {"time_ms": 0, "x": 0, "y": 0, "opacity": 0.95, "scale": 1, "rotation": 0, "drawProgress": 0, "easing": "ease-out-cubic"},
        ]
        if reveal_start > 0:
            frames.append({"time_ms": reveal_start, "x": 0, "y": 0, "opacity": 0.95, "scale": 1, "rotation": 0, "drawProgress": 0, "easing": "ease-out-cubic"})
        frames.append({"time_ms": t1, "x": 0, "y": 0, "opacity": 1, "scale": 1, "rotation": 0, "drawProgress": 1})
        if t1 < duration_ms:
            frames.append({"time_ms": duration_ms, "x": 0, "y": 0, "opacity": 1, "scale": 1, "rotation": 0, "drawProgress": 1})
        objects.append(
            {
                "id": f"{prefix}_W{i + 1}",
                "label": str(item.get("label") or f"波形 {i + 1}")[:24],
                "shape": "path",
                "x": 0,
                "y": 0,
                "path": " ".join(pts),
                "fill": color,
                "fillOpacity": 0,
                "stroke": color,
                "strokeWidth": sw,
                "lineCap": "round",
                "zIndex": 5,
                "keyframes": frames,
            }
        )
        if item.get("label"):
            lbl = str(item["label"])[:16]
            objects.append(
                {
                    "id": f"{prefix}_WL{i + 1}",
                    "label": f"{lbl}标注",
                    "shape": "text",
                    "x": round(x + w + 20, 1),
                    "y": round(dy + 6, 1),
                    "text": lbl,
                    "fill": color,
                    "fontSize": 20,
                    "fontWeight": 600,
                    "textAnchor": "start",
                    "zIndex": 6,
                    "keyframes": _hold(duration_ms, x + w + 20, dy + 6),
                }
            )
    return objects


def _compile_analog_gauge(spec: dict[str, Any], profile: dict[str, Any], duration_ms: int, idx: int) -> list[dict[str, Any]]:
    prefix = _clean_prefix(spec.get("id_prefix"), f"GA{idx}")
    x = _num(spec.get("x"), 1220, 180, 1420)
    y = _num(spec.get("y"), 400, 220, 620)
    r = _num(spec.get("radius"), 92, 54, 140)
    label = str(spec.get("label") or "实时读数")[:18]
    raw_readings = spec.get("readings")
    points: list[tuple[int, float]] = []
    if isinstance(raw_readings, list):
        for entry in raw_readings:
            if isinstance(entry, dict):
                t = int(_num(entry.get("time_ms"), 0, 0, duration_ms))
                v = _num(entry.get("value"), 0.5, 0.0, 1.0)
                if not points or t > points[-1][0]:
                    points.append((t, v))
    if not points:
        points = [(0, 0.15), (int(duration_ms * 0.45), 0.9), (duration_ms, 0.2)]
    if points[0][0] != 0:
        points.insert(0, (0, points[0][1]))
    if points[-1][0] != duration_ms:
        points.append((duration_ms, points[-1][1]))

    p = profile["palette"]
    sw = _stroke_w(profile)
    arc_r = round(r * 0.74, 1)
    needle_len = round(r * 0.66, 1)
    return [
        {
            "id": f"{prefix}_DIAL",
            "label": "仪表底盘",
            "shape": "circle",
            "x": round(x, 1),
            "y": round(y, 1),
            "radius": round(r, 1),
            "fill": p["material"],
            "stroke": p["shade"],
            "strokeWidth": sw + 1,
            "materialKey": _material_for(profile),
            "zIndex": 2,
            "keyframes": _hold(duration_ms, x, y),
        },
        {
            "id": f"{prefix}_ARC",
            "label": "仪表光弧",
            "shape": "path",
            "x": round(x, 1),
            "y": round(y, 1),
            "path": f"M{-arc_r * 0.9:.1f} {arc_r * 0.38:.1f} A{arc_r} {arc_r} 0 1 1 {arc_r * 0.9:.1f} {arc_r * 0.38:.1f}",
            "fill": p["blue"],
            "fillOpacity": 0,
            "stroke": p["blue"],
            "strokeWidth": 8,
            "lineCap": "round",
            "zIndex": 4,
            "keyframes": [
                {"time_ms": t, "x": round(x, 1), "y": round(y, 1), "opacity": 1, "scale": 1, "rotation": 0, "drawProgress": round(v, 3), "easing": "ease-in-out-cubic"}
                for t, v in points
            ],
        },
        {
            "id": f"{prefix}_NEEDLE",
            "label": "仪表指针",
            "shape": "path",
            "x": round(x, 1),
            "y": round(y, 1),
            "path": f"M0 8 L0 {-needle_len}",
            "fill": p["red"],
            "fillOpacity": 0,
            "stroke": p["red"],
            "strokeWidth": 4.5,
            "lineCap": "round",
            "zIndex": 6,
            "keyframes": [
                {"time_ms": t, "x": round(x, 1), "y": round(y, 1), "opacity": 1, "scale": 1, "rotation": round(-65 + v * 130, 1), "easing": "ease-in-out-cubic"}
                for t, v in points
            ],
        },
        {
            "id": f"{prefix}_PIVOT",
            "label": "指针轴心",
            "shape": "circle",
            "x": round(x, 1),
            "y": round(y, 1),
            "radius": 10,
            "fill": p["gold"],
            "stroke": p["ink"],
            "strokeWidth": 1.5,
            "zIndex": 7,
            "keyframes": _hold(duration_ms, x, y),
        },
        {
            "id": f"{prefix}_LBL",
            "label": label,
            "shape": "text",
            "x": round(x, 1),
            "y": round(y + r * 0.58, 1),
            "text": label,
            "fill": p["muted"],
            "fontSize": 20,
            "fontWeight": 600,
            "textAnchor": "middle",
            "zIndex": 7,
            "keyframes": _hold(duration_ms, x, y + r * 0.58),
        },
    ]


def _compile_concept_network(spec: dict[str, Any], profile: dict[str, Any], duration_ms: int, idx: int) -> list[dict[str, Any]]:
    prefix = _clean_prefix(spec.get("id_prefix"), f"NET{idx}")
    x = _num(spec.get("x"), 220, 100, 900)
    y = _num(spec.get("y"), 240, 180, 500)
    w = _num(spec.get("width"), 560, 240, 1100)
    h = _num(spec.get("height"), 300, 160, 440)
    raw_nodes = spec.get("nodes")
    if not isinstance(raw_nodes, list) or len(raw_nodes) < 2:
        return []
    raw_nodes = raw_nodes[:6]
    cx, cy = x + w / 2, y + h / 2
    positions: list[tuple[float, float]] = []
    for i in range(len(raw_nodes)):
        angle = math.pi + (i / len(raw_nodes)) * math.pi * 2
        positions.append((cx + math.cos(angle) * (w * 0.42), cy + math.sin(angle) * (h * 0.4)))

    p = profile["palette"]
    mat = _material_for(profile)
    sw = _stroke_w(profile)
    objects: list[dict[str, Any]] = []
    raw_edges = spec.get("edges") if isinstance(spec.get("edges"), list) else [[i, (i + 1) % len(raw_nodes)] for i in range(len(raw_nodes))]
    for ei, edge in enumerate(raw_edges[:8]):
        if not isinstance(edge, list) or len(edge) < 2:
            continue
        a, b = int(edge[0]), int(edge[1])
        if not (0 <= a < len(positions) and 0 <= b < len(positions)) or a == b:
            continue
        strong = bool(edge[2]) if len(edge) > 2 else False
        ax, ay = positions[a]
        bx, by = positions[b]
        mx, my = (ax + bx) / 2, (ay + by) / 2 - (22 if ei % 2 == 0 else -22)
        t1 = min(duration_ms - 200, 900 + ei * 380)
        objects.append(
            {
                "id": f"{prefix}_E{ei + 1}",
                "label": f"关系连线 {ei + 1}",
                "shape": "path",
                "x": 0,
                "y": 0,
                "path": f"M{ax:.1f} {ay:.1f} Q{mx:.1f} {my:.1f} {bx:.1f} {by:.1f}",
                "fill": p["gold"],
                "fillOpacity": 0,
                "stroke": p["red"] if strong else p["blue"],
                "strokeWidth": sw + 2 if strong else sw + 0.5,
                "lineCap": "round",
                "zIndex": 3,
                "keyframes": [
                    {"time_ms": 0, "x": 0, "y": 0, "opacity": 0.3, "scale": 1, "rotation": 0, "drawProgress": 0, "easing": "ease-out-cubic"},
                    {"time_ms": t1, "x": 0, "y": 0, "opacity": 0.95, "scale": 1, "rotation": 0, "drawProgress": 1},
                    {"time_ms": duration_ms, "x": 0, "y": 0, "opacity": 0.95 if strong else 0.68, "scale": 1, "rotation": 0, "drawProgress": 1},
                ],
            }
        )
    for i, node in enumerate(raw_nodes):
        if not isinstance(node, dict):
            continue
        nx, ny = positions[i]
        lbl = str(node.get("label") or f"节点 {i + 1}")[:14]
        color = _palette_color(profile, node.get("color_role"), ["red", "blue", "gold", "material"][i % 4])
        t1 = min(duration_ms - 300, 500 + i * 260)
        objects.append(
            {
                "id": f"{prefix}_N{i + 1}",
                "label": lbl,
                "shape": "circle",
                "x": round(nx, 1),
                "y": round(ny, 1),
                "radius": 30,
                "fill": color,
                "stroke": p["ink"],
                "strokeWidth": sw,
                "materialKey": mat,
                "zIndex": 6,
                "keyframes": [
                    {"time_ms": 0, "x": round(nx, 1), "y": round(ny, 1), "opacity": 0, "scale": 0.5, "rotation": 0, "easing": "ease-out-cubic"},
                    {"time_ms": t1, "x": round(nx, 1), "y": round(ny, 1), "opacity": 1, "scale": 1.05, "rotation": 0, "easing": "ease-in-out-cubic"},
                    {"time_ms": duration_ms, "x": round(nx, 1), "y": round(ny, 1), "opacity": 1, "scale": 1, "rotation": 0},
                ],
            }
        )
        objects.append(
            {
                "id": f"{prefix}_NL{i + 1}",
                "label": f"{lbl}标签",
                "shape": "text",
                "x": round(nx, 1),
                "y": round(ny + 54, 1),
                "text": lbl,
                "fill": p["ink"],
                "fontSize": 20,
                "fontWeight": 600,
                "textAnchor": "middle",
                "zIndex": 7,
                "keyframes": _hold(duration_ms, nx, ny + 54),
            }
        )
    return objects


def _compile_orbit_model(spec: dict[str, Any], profile: dict[str, Any], duration_ms: int, idx: int) -> list[dict[str, Any]]:
    prefix = _clean_prefix(spec.get("id_prefix"), f"ORB{idx}")
    x = _num(spec.get("x"), 500, 220, 1380)
    y = _num(spec.get("y"), 440, 240, 620)
    orbits = spec.get("orbits")
    if not isinstance(orbits, list) or not orbits:
        orbits = [{"radius": 92, "turns": 2, "color_role": "red"}, {"radius": 152, "turns": 1, "color_role": "blue"}]
    orbits = orbits[:3]
    p = profile["palette"]
    sw = _stroke_w(profile)
    objects: list[dict[str, Any]] = [
        {
            "id": f"{prefix}_CORE",
            "label": str(spec.get("core_label") or "中心核心")[:18],
            "shape": "circle",
            "x": round(x, 1),
            "y": round(y, 1),
            "radius": 26,
            "fill": p["gold"],
            "stroke": p["ink"],
            "strokeWidth": sw,
            "materialKey": _material_for(profile),
            "zIndex": 5,
            "keyframes": _hold(duration_ms, x, y),
        }
    ]
    for i, item in enumerate(orbits):
        if not isinstance(item, dict):
            continue
        r = _num(item.get("radius"), 92 + i * 56, 52, 220)
        ry = round(r * 0.72, 1)
        turns = _num(item.get("turns"), 2 - i * 0.5, 0.5, 4.0)
        color = _palette_color(profile, item.get("color_role"), ["red", "blue", "gold"][i % 3])
        objects.append(
            {
                "id": f"{prefix}_RING{i + 1}",
                "label": f"轨道 {i + 1}",
                "shape": "path",
                "x": round(x, 1),
                "y": round(y, 1),
                "path": f"M{-r:.1f} 0 A{r:.1f} {ry} 0 1 0 {r:.1f} 0 A{r:.1f} {ry} 0 1 0 {-r:.1f} 0",
                "fill": p["shade"],
                "fillOpacity": 0,
                "stroke": p["shade"],
                "strokeWidth": sw * 0.75,
                "zIndex": 2,
                "keyframes": _hold(duration_ms, x, y),
            }
        )
        steps = 16
        frames = []
        for s in range(steps + 1):
            u = s / steps
            angle = u * math.pi * 2 * turns
            frames.append(
                {
                    "time_ms": int(round(u * duration_ms)),
                    "x": round(x + math.cos(angle) * r, 1),
                    "y": round(y + math.sin(angle) * ry, 1),
                    "opacity": 1,
                    "scale": 1,
                    "rotation": 0,
                    "easing": "linear",
                }
            )
        objects.append(
            {
                "id": f"{prefix}_SAT{i + 1}",
                "label": f"轨道运动体 {i + 1}",
                "shape": "circle",
                "x": frames[0]["x"],
                "y": frames[0]["y"],
                "radius": 13,
                "fill": color,
                "stroke": p["ink"],
                "strokeWidth": 1.4,
                "zIndex": 7,
                "keyframes": frames,
            }
        )
    return objects


_COMPILERS = {
    "bar_chart": _compile_bar_chart,
    "carrier_chamber": _compile_carrier_chamber,
    "wave_band": _compile_wave_band,
    "analog_gauge": _compile_analog_gauge,
    "concept_network": _compile_concept_network,
    "orbit_model": _compile_orbit_model,
}


def compile_components(
    components: list[dict[str, Any]],
    profile: dict[str, Any],
    duration_ms: int,
    *,
    max_objects: int = 44,
) -> list[dict[str, Any]]:
    """Compile high-level component declarations into validated-ready VectorObject dicts."""
    compiled: list[dict[str, Any]] = []
    for idx, spec in enumerate(components[:6]):
        if not isinstance(spec, dict):
            continue
        kind = spec.get("type")
        compiler = _COMPILERS.get(str(kind))
        if compiler is None:
            continue
        batch = compiler(spec, profile, duration_ms, idx + 1)
        if len(compiled) + len(batch) > max_objects:
            break
        compiled.extend(batch)
    return compiled
