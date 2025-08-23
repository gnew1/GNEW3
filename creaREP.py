#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
creaREP_fidelidad.py

OBJETIVO (ajustado a lo que pediste):
- Leer TODOS los .txt/.md que tengas (uno.txt, dos.txt, TRES.txt, ...).
- Detectar con FIDELIDAD los bloques de archivo: cada bloque empieza en una línea
  que es una RUTA (p. ej. /apps/dev-portal/docusaurus.config.ts) y termina
  JUSTO antes de la siguiente ruta o EOF. No cortar antes de tiempo.
- Crear las carpetas que no existan y transcribir el contenido COMPLETO del bloque.
- Si ya existe un archivo con esa ruta en el repo, NO se toca: se guarda la nueva
  versión bajo "repetidos/<ruta>" conservando la estructura.
- Cualquier ruta dudosa/ambigua se guarda bajo "QuizaErrores/" (con .meta.json).
- Al final EMITE un informe con TODOS los programas transcritos, su RUTA y Nº DE LÍNEAS.
  Además genera un JSON (por defecto creaREP_report.json) y un Markdown opcional.

Heurísticas clave para NO cortar de forma prematura:
- Sólo se considera "marcador de ruta" si la línea ES (casi) solo la ruta (con prefijo
  opcional: 'Ruta completa:', 'path:', 'file:', bullets '# - •', etc.). Si la ruta va
  dentro de una línea de código (ej: import ".../file.ts"), NO cuenta.
- Ignora posibles rutas dentro de fences de Markdown ```...``` (no se interpretan como
  marcadores). El contenido entre fences se transcribe tal cual para el bloque activo.
- Si una línea contiene VARIAS rutas (lista), no abre bloques “vacíos”; sólo abre bloque
  para la ÚLTIMA ruta de esa línea y descarta las anteriores (que no tendrían contenido),
  evitando crear archivos vacíos/rotos.
- Soporta 'Ruta completa: C:\\foo\\bar\\x.ts' o '/foo/bar.js'; normaliza a relativa
  dentro de --target y nunca sale de la raíz (defensa contra path traversal).

USO:
  python tools/creaREP_fidelidad.py \
    --src . --target . \
    --glob "*.txt" \
    --report-json creaREP_report.json \
    --report-md creaREP_report.md

Opciones:
  --src DIR             Carpeta donde están los .txt/.md (default: .)
  --target DIR          Raíz del repo destino (default: .)
  --glob PATRON         Patrón glob para filtrar (default: *.txt)
  --include-md          Incluye también *.md automáticamente
  --max-blocks N        Cortar por recursos tras N bloques (se informa)
  --verbose             Log más detallado
"""

from __future__ import annotations
import argparse
import os
import re
import sys
import json
import hashlib
from dataclasses import dataclass, asdict
from typing import List, Optional, Tuple
from pathlib import Path

REPETIDOS_DIR = "repetidos"
QUIZA_DIR = "QuizaErrores"

# Nombres sin extensión que aceptamos como "archivos claros"
KNOWN_NOEXT = {
    "Dockerfile", "Makefile", "LICENSE", "LICENSE.md", "README", "README.md", "README.mdx",
    ".gitignore", ".gitattributes", ".editorconfig", "Pipfile", "Pipfile.lock",
    "go.mod", "go.sum", "yarn.lock", "pnpm-lock.yaml", "pnpm-workspace.yaml",
    "commitlint.config.cjs", ".eslintrc", ".eslintrc.json", ".eslintrc.cjs",
    "hardhat.config.ts", "foundry.toml", "remappings.txt", "alembic.ini", "Procfile",
    "CODEOWNERS", "CONTRIBUTING", ".prettierrc", ".prettierrc.json"
}

# Prefijos basura que a veces preceden la ruta
LEADING_JUNK = r"[` \t>*#\-\u2022\u25CF\u25E6]*"  # `, espacios, >, #, -, •, ●, ◦
RUTA_LABELS  = r"(?:(?:ruta(?:\s+completa)?|path|file|archivo)\s*:)?"

# Núcleo de un path estilo POSIX; SIN espacios
PATH_CORE = r"(?:[/\.](?:[A-Za-z0-9_\-./])+[A-Za-z0-9_\-])"

# Regex para detectar línea que ES (casi) una ruta
RE_PATH_LINE = re.compile(
    rf"^{LEADING_JUNK}{RUTA_LABELS}\s*(?P<path>{PATH_CORE})\s*$",
    re.IGNORECASE,
)

# Para encontrar TODAS las rutas en una misma línea (listas)
RE_ALL_PATHS = re.compile(PATH_CORE)

# Fences de markdown
RE_FENCE = re.compile(r"^\s*```")

# Drive Windows
RE_WIN_DRIVE = re.compile(r"^[A-Za-z]:[\\/]")


@dataclass
class Block:
    src: Path
    marker_line: int
    marker_raw: str      # línea original del marcador
    rel_posix: str       # ruta relativa normalizada estilo POSIX
    content: List[str]   # líneas de contenido

    def text(self) -> str:
        return "".join(self.content)

    def num_lines(self) -> int:
        if not self.content:
            return 0
        s = self.text()
        return s.count("\n") + (0 if s.endswith("\n") else 1)


@dataclass
class Row:
    kind: str             # created | repeated | quiza | error
    dest: str
    rel: str
    lines: int
    note: str = ""


@dataclass
class Report:
    source_dir: str
    target_root: str
    files_seen: List[str]
    blocks_total: int
    transcribed: List[Row]
    repeated: List[Row]
    quiza: List[Row]
    errors: List[Row]
    cut_by_resources: bool


def sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8", errors="ignore")).hexdigest()[:8]


def normalize_marker(raw_line: str) -> Optional[str]:
    """
    Si la línea es un marcador de ruta, devuelve esa ruta NORMALIZADA (posix, relativa).
    Si tiene múltiples rutas, devolvemos SOLO la ÚLTIMA (las previas en la misma línea
    se consideran títulos/índice y NO abren bloque).
    Si no es marcador, devuelve None.
    """
    line = raw_line.rstrip("\n")
    m = RE_PATH_LINE.match(line)
    if not m:
        return None

    # Si hay múltiples rutas en la misma línea, tomar SOLO la última
    all_paths = RE_ALL_PATHS.findall(line)
    if not all_paths:
        return None
    cand = all_paths[-1]

    # Normalizar: quitar drive y prefijos absolutos; convertir a relativo posix
    cand = RE_WIN_DRIVE.sub("", cand)  # C:\... -> ...
    cand = cand.replace("\\", "/")
    while cand.startswith("./") or cand.startswith("/"):
        cand = cand[1:]
    cand = re.sub(r"/{2,}", "/", cand)

    # Seguridad contra traversal
    if ".." in cand.split("/"):
        return None
    if not cand:
        return None
    return cand


def is_clear_file(rel_posix: str) -> bool:
    """
    Heurística: considerar 'clara' si el último segmento tiene extensión
    o si es un nombre conocido sin extensión.
    """
    base = rel_posix.split("/")[-1]
    if "." in base:
        return True
    if base in KNOWN_NOEXT or base.startswith("."):
        return True
    return False


def parse_blocks_from_file(path: Path, max_blocks_left: Optional[int], verbose: bool) -> List[Block]:
    """
    Recorre el archivo fuente y devuelve bloques (ruta + contenido).
    - NO detecta markers dentro de fences ```...```.
    - Un bloque comienza en un marcador y termina justo antes del siguiente marcador o EOF.
    - Si un "marcador" aparece pero NO llega a recibir contenido (sólo encabezado),
      se DESCARTA (así evitamos archivos vacíos creados a partir de listas).
    """
    blocks: List[Block] = []
    current: Optional[Block] = None
    fence_open = False

    with path.open("r", encoding="utf-8", errors="ignore") as fh:
        for lineno, raw in enumerate(fh, start=1):
            if RE_FENCE.match(raw):
                fence_open = not fence_open
                # Si ya estamos en un bloque, copiamos la línea tal cual
                if current is not None:
                    current.content.append(raw)
                continue

            # Sólo buscamos marcadores de ruta si NO estamos dentro de fence
            marker: Optional[str] = None
            if not fence_open:
                marker = normalize_marker(raw)

            if marker:
                # Cerrar bloque anterior solo si tenía contenido
                if current is not None and current.content:
                    blocks.append(current)
                    if verbose:
                        print(f"  [+] Bloque cerrado {current.rel_posix} (L{current.marker_line}-{lineno-1})")
                    if max_blocks_left is not None:
                        max_blocks_left -= 1
                        if max_blocks_left <= 0:
                            break
                # Abrir nuevo bloque (sin contenido aún)
                current = Block(
                    src=path,
                    marker_line=lineno,
                    marker_raw=raw.rstrip("\n"),
                    rel_posix=marker,
                    content=[],
                )
            else:
                # Línea de contenido (si hay bloque abierto)
                if current is not None:
                    current.content.append(raw)

        # EOF: cerrar último bloque si tiene contenido
        if current is not None and current.content and (max_blocks_left is None or max_blocks_left > 0):
            blocks.append(current)

    return blocks


def ensure_parent(p: Path) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)


def safe_dest_under(target_root: Path, rel_posix: str) -> Path:
    rel = Path(*Path(rel_posix).parts)
    dest = (target_root / rel).resolve()
    root = target_root.resolve()
    # Forzar a quedar dentro de target_root
    if str(dest).startswith(str(root)):
        return dest
    return (target_root / QUIZA_DIR / rel).resolve()


def write_exact(p: Path, data: str) -> None:
    ensure_parent(p)
    with p.open("w", encoding="utf-8", newline="") as f:
        f.write(data)


def write_under_variant(base: Path, rel_posix: str, data: str) -> Tuple[Path, int]:
    """
    Escribe bajo base/rel_posix; si existe, añade sufijo __repN.
    Devuelve (ruta_escrita, num_lineas).
    """
    dest = base / Path(rel_posix)
    ensure_parent(dest)

    if dest.exists():
        stem = dest.name
        parent = dest.parent
        n = 1
        while True:
            alt = parent / f"{stem}__rep{n}"
            if not alt.exists():
                dest = alt
                break
            n += 1

    write_exact(dest, data)
    lines = data.count("\n") + (0 if not data or data.endswith("\n") else 1)
    return dest, lines


def save_quiza(target_root: Path, blk: Block, reason: str) -> Row:
    # Guardar en QuizaErrores manteniendo subcarpetas
    rel = Path(QUIZA_DIR) / Path(blk.rel_posix)
    dest, n_lines = write_under_variant(target_root, str(rel), blk.text())
    # Escribir un meta con pista de por qué cayó aquí
    meta = {
        "src": str(blk.src),
        "marker_line": blk.marker_line,
        "marker_raw": blk.marker_raw,
        "rel_posix": blk.rel_posix,
        "reason": reason,
    }
    write_exact(Path(str(dest) + ".meta.json"), json.dumps(meta, ensure_ascii=False, indent=2))
    return Row(kind="quiza", dest=str(dest), rel=str(rel), lines=n_lines, note=reason)


def process_blocks(
    blocks: List[Block],
    target_root: Path,
    verbose: bool
) -> Tuple[List[Row], List[Row], List[Row], List[Row]]:
    """
    Devuelve (transcribed, repeated, quiza, errors)
    - transcribed: archivos nuevos bajo target_root
    - repeated: archivos escritos bajo 'repetidos/' porque ya existían o aparecieron duplicados
    - quiza: rutas dudosas/ambiguas guardadas bajo QuizaErrores
    - errors: errores graves (se continúa siempre, pero se reporta)
    """
    transcribed: List[Row] = []
    repeated: List[Row] = []
    quiza: List[Row] = []
    errors: List[Row] = []

    seen: set[str] = set()

    for b in blocks:
        try:
            # Clasificar claridad
            clear = is_clear_file(b.rel_posix)
            if not clear:
                quiza.append(save_quiza(target_root, b, reason="ruta_sin_extension_o_no_clara"))
                if verbose:
                    print(f"[QUIZA] {b.rel_posix} (no clara)")
                continue

            # Destino principal (sin tocar si ya existe)
            dest_main = safe_dest_under(target_root, b.rel_posix)

            # Duplicado en misma corrida o ya existe en repo ⇒ repetidos/
            if b.rel_posix in seen or dest_main.exists():
                rel_rep = str(Path(REPETIDOS_DIR) / Path(b.rel_posix))
                dest, n_lines = write_under_variant(target_root, rel_rep, b.text())
                repeated.append(Row(kind="repeated", dest=str(dest), rel=rel_rep, lines=n_lines))
                if verbose:
                    where = " (ya existía)" if dest_main.exists() else " (duplicado)"
                    print(f"[REPET] {b.rel_posix}{where} -> {dest}")
            else:
                # Crear nuevo “oficial”
                write_exact(dest_main, b.text())
                n_lines = b.num_lines()
                transcribed.append(Row(kind="created", dest=str(dest_main), rel=b.rel_posix, lines=n_lines))
                if verbose:
                    print(f"[OK   ] {b.rel_posix} ({n_lines} líneas) -> {dest_main}")

            seen.add(b.rel_posix)

        except Exception as e:
            errors.append(Row(kind="error", dest="", rel=b.rel_posix, lines=0, note=str(e)))
            if verbose:
                print(f"[ERROR] {b.rel_posix} :: {e!r}")

    return transcribed, repeated, quiza, errors


def build_and_write_reports(
    rpt: Report,
    json_path: Path,
    md_path: Optional[Path]
) -> None:
    # JSON
    try:
        with json_path.open("w", encoding="utf-8") as jf:
            json.dump({
                "source_dir": rpt.source_dir,
                "target_root": rpt.target_root,
                "files_seen": rpt.files_seen,
                "blocks_total": rpt.blocks_total,
                "cut_by_resources": rpt.cut_by_resources,
                "created": [asdict(r) for r in rpt.transcribed],
                "repeated": [asdict(r) for r in rpt.repeated],
                "quiza": [asdict(r) for r in rpt.quiza],
                "errors": [asdict(r) for r in rpt.errors],
            }, jf, ensure_ascii=False, indent=2)
        print(f"[OK] Reporte JSON → {json_path}")
    except Exception as e:
        print(f"[WARN] No pude escribir JSON: {e}")

    # Markdown (opcional)
    if md_path:
        try:
            lines: List[str] = []
            lines.append("# Informe de transcripción\n")
            lines.append(f"- **Archivos fuente leídos**: {len(rpt.files_seen)}")
            lines.append(f"- **Bloques detectados**: {rpt.blocks_total}")
            lines.append(f"- **Corte por recursos**: {rpt.cut_by_resources}\n")

            def section(title: str, rows: List[Row]):
                lines.append(f"## {title} ({len(rows)})\n")
                if not rows:
                    lines.append("_(vacío)_\n")
                    return
                lines.append("| Ruta | Nº líneas | Destino |\n|---|---:|---|\n")
                for r in rows:
                    lines.append(f"| `{r.rel}` | {r.lines} | `{r.dest}` |\n")
                lines.append("")

            section("Transcritos (nuevos)", rpt.transcribed)
            section("Repetidos (duplicado/existente)", rpt.repeated)
            section("QuizaErrores (dudosos)", rpt.quiza)
            if rpt.errors:
                lines.append("## Errores\n")
                for r in rpt.errors[:50]:
                    lines.append(f"- `{r.rel}` → {r.note}")
                lines.append("")
            md_path.write_text("\n".join(lines), encoding="utf-8")
            print(f"[OK] Reporte Markdown → {md_path}")
        except Exception as e:
            print(f"[WARN] No pude escribir Markdown: {e}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Transcribe programas desde .txt/.md delimitados por rutas.")
    ap.add_argument("--src", default=".", help="Carpeta de entrada (.txt/.md). Default: .")
    ap.add_argument("--target", default=".", help="Raíz del repositorio destino. Default: .")
    ap.add_argument("--glob", default="*.txt", help="Patrón glob de entrada. Default: *.txt")
    ap.add_argument("--include-md", action="store_true", help="Añade también *.md a la exploración")
    ap.add_argument("--max-blocks", type=int, default=None, help="Máximo de bloques a procesar (corte por recursos)")
    ap.add_argument("--report-json", default="creaREP_report.json", help="Ruta del reporte JSON")
    ap.add_argument("--report-md", default=None, help="Ruta del reporte Markdown (opcional)")
    ap.add_argument("--verbose", action="store_true", help="Log detallado por bloque")
    args = ap.parse_args()

    src_dir = Path(args.src).resolve()
    target_root = Path(args.target).resolve()

    # Candidatos
    files: List[Path] = sorted(src_dir.glob(args.glob))
    if args.include_md:
        files += sorted(src_dir.glob("*.md"))
    files = [p for p in files if p.is_file()]

    if not files:
        print(f"[INFO] No se encontraron archivos con patrón {args.glob} en {src_dir}")
        return 0

    print(f"[INFO] Fuente : {src_dir}")
    print(f"[INFO] Destino: {target_root}")
    print(f"[INFO] Archivos a leer ({len(files)}): " + ", ".join(p.name for p in files))

    # Parsear
    all_blocks: List[Block] = []
    remaining = args.max_blocks
    for p in files:
        try:
            blks = parse_blocks_from_file(p, remaining, verbose=args.verbose)
            all_blocks.extend(blks)
            if remaining is not None:
                remaining -= len(blks)
                if remaining <= 0:
                    break
        except Exception as e:
            print(f"[WARN] No pude procesar {p}: {e!r}")

    cut = args.max_blocks is not None and remaining is not None and remaining <= 0
    print(f"[INFO] Bloques detectados: {len(all_blocks)}  (corte_por_recursos={cut})")

    # Escribir
    transcribed, repeated, quiza, errors = process_blocks(all_blocks, target_root, verbose=args.verbose)

    # ------- INFORME FINAL (pantalla) -------
    print("\n===== INFORME FINAL =====")
    def list_section(title: str, rows: List[Row]):
        print(f"{title} ({len(rows)}):")
        for r in rows:
            rel = r.rel
            print(f"  - {rel}  → líneas={r.lines}")
        if not rows:
            print("  (vacío)")
        print("")
    list_section("Transcritos (nuevos)", transcribed)
    list_section("Repetidos (duplicado/existente)", repeated)
    list_section("QuizaErrores (dudosos)", quiza)
    if errors:
        print(f"Errores ({len(errors)}):")
        for r in errors[:50]:
            print(f"  - {r.rel}: {r.note}")
        print("")

    # Guardar reportes a disco
    rpt = Report(
        source_dir=str(src_dir),
        target_root=str(target_root),
        files_seen=[str(p) for p in files],
        blocks_total=len(all_blocks),
        transcribed=transcribed,
        repeated=repeated,
        quiza=quiza,
        errors=errors,
        cut_by_resources=cut,
    )
    build_and_write_reports(
        rpt,
        json_path=(target_root / args.report_json),
        md_path=((target_root / args.report_md) if args.report_md else None),
    )

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[INFO] Interrumpido por el usuario.")
        sys.exit(130)

