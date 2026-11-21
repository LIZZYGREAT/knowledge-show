// MOLECULES (v4): what the eggplant and the tomato of verse 2 give away on their keywords, as skeletal formulas cut
// out of cream paper: bonds are flat strips, the hetero atoms flat discs with their letters cut out of them, and a
// shadow plate lies under everything. A corner with no letter is a carbon, as in any skeletal formula.
//
//   MOL.cellulose(n)   the fibre of the eggplant: glucose rings on oxygen bridges, n units          (C6H10O5)n
//   MOL.peptide(n)     its protein: the backbone N - C(R) - C(=O), n residues                       (NH-CHR-CO)n
//   MOL.glucose        its carbohydrate: one ring                                                   C6H12O6
//   MOL.water          and what it mostly is                                                        H2O
//   MOL.lycopene       the red of the tomato: 32 carbons in a row, 13 double bonds, 8 methyls       C40H56
//   MOL.ascorbic       vitamin C: a five-ring with its side chain                                   C6H8O6
//   MOL.tocopherol     vitamin E: two fused rings and a long tail                                   C29H50O2
//
//   drawMolecule(ctx, M, { x, y, L, k })   M at (x, y), bond length L px; k = 0..1 of it drawn, in the order its bonds
//                                           were written (a chain is pulled out from its first atom)
//   formula(ctx, 'C6H12O6', x, y)          a formula in mono, its counts set low
//
// Positions are in bond lengths, y down. Pure functions; nothing here touches the DOM.
const C30 = Math.cos(Math.PI / 6), DEG = Math.PI / 180;

/** A molecule under construction: atom(x, y, label) -> index; bond(i, j, order): order 2 / -2 = double, its second line left / right of i -> j. */
function mol() {
  const atoms = [], bonds = [];
  return {
    atoms, bonds,
    atom(x, y, label = null) { atoms.push([x, y, label]); return atoms.length - 1; },
    bond(i, j, order = 1) { bonds.push([i, j, order]); return j; },
    /** A new atom one bond from atom i, in direction (dx, dy), bonded to it. */
    stub(i, dx, dy, label = null, order = 1) { return this.bond(i, this.atom(atoms[i][0] + dx, atoms[i][1] + dy, label), order); },
  };
}

function lycopene() {
  const m = mol(), DOUBLE = new Set([1, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 29]), METHYL = new Set([1, 5, 9, 13, 18, 22, 26, 30]);
  let at = m.atom(0, 0);
  for (let k = 1; k < 32; k++) {                                        // the 32 carbons of the chain, zigzag; atom k is carbon k + 1
    at = m.stub(at, C30, k % 2 ? -0.5 : 0.5, null, DOUBLE.has(k - 1) ? (k % 2 ? 2 : -2) : 1);
    if (METHYL.has(k)) m.stub(at, 0, k % 2 ? -1 : 1);                   // a methyl points away from the chain
  }
  return m;
}

function ascorbic() {
  const m = mol(), r = 0.8507, v = [-90, -18, 54, 126, 198].map((d) => [r * Math.cos(d * DEG), r * Math.sin(d * DEG)]);
  const out = (i, len = 1) => [(v[i][0] / r) * len, (v[i][1] / r) * len];
  const c4 = m.atom(...v[0]), o = m.atom(...v[1], 'O'), c1 = m.atom(...v[2]), c2 = m.atom(...v[3]), c3 = m.atom(...v[4]);
  m.bond(c4, c3); m.bond(c3, c2, -2); m.bond(c4, o); m.bond(c2, c1); m.bond(o, c1);        // the lactone ring, its C=C inside
  m.stub(c3, ...out(4), 'HO'); m.stub(c2, ...out(3), 'HO'); m.stub(c1, ...out(2), 'O', 2);
  const c5 = m.stub(c4, 0.5, -C30);                                    // the side chain: CH(OH) - CH2OH
  m.stub(c5, 1, 0, 'OH');
  m.stub(m.stub(c5, -0.5, -C30), -1, 0, 'HO');
  return m;
}

function tocopherol() {
  const m = mol();
  // the aromatic ring (left) and the ring with the oxygen in it (right), sharing one bond
  const c6 = m.atom(-C30, -0.5), c5 = m.atom(0, -1), c7 = m.atom(-C30, 0.5), c8 = m.atom(0, 1), c4a = m.atom(C30, -0.5), c8a = m.atom(C30, 0.5);
  m.stub(c6, -C30, -0.5, 'HO');
  m.bond(c6, c5, 2); m.bond(c6, c7); m.bond(c5, c4a); m.bond(c7, c8, -2); m.bond(c8, c8a); m.bond(c4a, c8a, 2);
  m.stub(c5, 0, -1); m.stub(c7, -C30, 0.5); m.stub(c8, 0, 1);         // three methyls on the ring
  const c4 = m.stub(c4a, C30, -0.5), o1 = m.stub(c8a, C30, 0.5, 'O'), c3 = m.stub(c4, C30, 0.5), c2 = m.stub(o1, C30, -0.5);
  m.bond(c3, c2);
  m.stub(c2, 0.34, 0.94);                                              // its methyl; then the tail: 13 carbons, a methyl on every fourth
  let at = c2;
  for (let k = 1; k <= 13; k++) { at = m.stub(at, C30, k % 2 ? -0.5 : 0.5); if (k % 4 === 0) m.stub(at, 0, 1); }
  return m;
}

/** One glucose ring built on its C4 (the left corner), flat-topped: C1 at the right, the ring oxygen top right. Returns { c1, c4 }. */
function ring(m, c4) {
  const c5 = m.stub(c4, 0.5, -C30), c3 = m.stub(c4, 0.5, C30), o5 = m.stub(c5, 1, 0, 'O'), c2 = m.stub(c3, 1, 0), c1 = m.stub(o5, 0.5, C30);
  m.bond(c2, c1);
  m.stub(c3, -0.5, C30, 'HO'); m.stub(c2, 0.5, C30, 'OH');
  m.stub(m.stub(c5, -0.5, -C30), 0.5, -C30, 'OH');                     // CH2OH
  return { c1, c4 };
}
function glucose() {
  const m = mol(), c4 = m.atom(-1, 0);
  m.stub(c4, -1, 0, 'HO');
  m.stub(ring(m, c4).c1, 1, 0, 'OH');
  return m;
}
/** n glucose units in a row; from every C1 an oxygen bridge to the next C4. The last bridge is left open: the chain goes on. */
function cellulose(n) {
  const m = mol();
  let c4 = m.atom(-1, 0);
  m.stub(c4, -1, 0, 'HO');
  for (let i = 0; i < n; i++) c4 = m.stub(m.stub(ring(m, c4).c1, C30, 0.5, 'O'), C30, -0.5);
  return m;
}
/** n residues of a protein's backbone: N - C(R) - C(=O), and so on. */
function peptide(n) {
  const m = mol();
  let at = m.atom(0, 0, 'N');
  for (let k = 1; k < 3 * n; k++) {
    at = m.stub(at, C30, k % 2 ? -0.5 : 0.5, k % 3 === 0 ? 'NH' : null);
    if (k % 3 === 1) m.stub(at, 0, k % 2 ? -1 : 1, 'R');
    if (k % 3 === 2) m.stub(at, 0, k % 2 ? -1 : 1, 'O', 2);
  }
  return m;
}
function water() {
  const m = mol(), o = m.atom(0, 0, 'O');
  m.stub(o, -0.79, 0.61, 'H'); m.stub(o, 0.79, 0.61, 'H');
  return m;
}

const made = {};
const once = (key, fn) => (made[key] ??= fn());
export const MOL = {
  get lycopene() { return once('lycopene', lycopene); }, get ascorbic() { return once('ascorbic', ascorbic); }, get tocopherol() { return once('tocopherol', tocopherol); },
  get glucose() { return once('glucose', glucose); }, get water() { return once('water', water); },
  cellulose: (n) => once(`cellulose${n}`, () => cellulose(n)), peptide: (n) => once(`peptide${n}`, () => peptide(n)),
};

/**
 * A molecule as cut paper.
 *   x, y, L   where its origin stands and how long a bond is (px);  rot = turned by (radians)
 *   k         0..1 of it drawn, bond after bond in the order they were written; a letter appears with the bond that reaches it
 *   color     the paper it is cut from (cream: it has been given);  ink = the letters, cut out;  shade = its shadow plate
 */
export function drawMolecule(ctx, M, { x = 0, y = 0, L = 50, rot = 0, k = 1, color = 'text', ink = 'panel', shade = 'bg', alpha = 1 } = {}) {
  const drawn = Math.max(0, Math.min(1, k)) * M.bonds.length;
  if (!(drawn > 0) || !(alpha > 0.003)) return;
  const cs = Math.cos(rot), sn = Math.sin(rot), P = M.atoms.map(([ax, ay]) => [x + (ax * cs - ay * sn) * L, y + (ax * sn + ay * cs) * L]);
  const w = Math.max(4, 0.19 * L), seen = new Set(), g = ctx.g, a0 = g.globalAlpha;
  g.globalAlpha = a0 * alpha;
  const pass = (dx, dy, col, letters) => {
    M.bonds.forEach(([i, j, order], n) => {
      const f = Math.min(1, drawn - n);
      if (f <= 0) return;
      const [x0, y0] = P[i], x1 = x0 + (P[j][0] - x0) * f, y1 = y0 + (P[j][1] - y0) * f;
      ctx.line(x0 + dx, y0 + dy, x1 + dx, y1 + dy, { color: col, width: w });
      if (Math.abs(order) === 2) {                                      // the second line of a double bond: thinner, shorter, to one side
        const len = Math.hypot(P[j][0] - x0, P[j][1] - y0) || 1, nx = (-(P[j][1] - y0) / len) * 0.21 * L * Math.sign(order), ny = ((P[j][0] - x0) / len) * 0.21 * L * Math.sign(order);
        const u0 = 0.16, u1 = Math.min(0.84, f);
        if (u1 > u0) ctx.line(x0 + (P[j][0] - x0) * u0 + nx + dx, y0 + (P[j][1] - y0) * u0 + ny + dy, x0 + (P[j][0] - x0) * u1 + nx + dx, y0 + (P[j][1] - y0) * u1 + ny + dy, { color: col, width: w * 0.62 });
      }
      seen.add(i); if (f >= 1) seen.add(j);
    });
    for (const i of seen) {
      const label = M.atoms[i][2];
      if (!label) continue;
      const [px, py] = P[i], r = 0.34 * L;
      if (label.length === 1) ctx.circle(px + dx, py + dy, r, { fill: true, color: col });
      else ctx.rrect(px + dx - 0.52 * L, py + dy - r, 1.04 * L, 2 * r, r, { fill: col });
      if (letters) ctx.text(label, px, py + 0.15 * L, { size: 0.42 * L, weight: 800, font: 'mono', align: 'center', color: ink });
    }
  };
  if (shade) pass(0.13 * L, 0.13 * L, shade, false);
  pass(0, 0, color, true);
  g.globalAlpha = a0;
}

/** A chemical formula in mono: the counts (digits, and an n after a bracket) are set smaller and low. Returns its width. */
export function formula(ctx, str, x, y, { size = 26, color = 'text', weight = 700, alpha = 1 } = {}) {
  let cx = x;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i], low = /[0-9]/.test(ch) || (ch === 'n' && str[i - 1] === ')'), s = low ? size * 0.68 : size;
    ctx.text(ch, cx, y + (low ? size * 0.2 : 0), { size: s, weight, font: 'mono', color, alpha });
    cx += ctx.cw(s);
  }
  return cx - x;
}
