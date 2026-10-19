// Turn one of the robot's path exports (idx,x_pixel,y_pixel,pen,segment_id,speed_scale) into a
// DRAWING list for apple.html: one string per pen-down segment, in the robot's own order.
//   node tools/csv2drawing.mjs src/drawings/C03_Tousled_Hair.csv
import fs from 'fs';
const [file] = process.argv.slice(2);
if (!file) { console.error('usage: node tools/csv2drawing.mjs <path.csv>'); process.exit(1); }
const [head, ...rows] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
const col = Object.fromEntries(head.split(',').map((k, i) => [k.trim(), i]));
const segs = new Map();
for (const row of rows) {
  const v = row.split(',');
  if (v[col.pen].trim() !== '1') continue;
  const id = v[col.segment_id].trim();
  if (!segs.has(id)) segs.set(id, []);
  const pts = segs.get(id), p = `${+v[col.x_pixel]},${+v[col.y_pixel]}`;
  if (pts[pts.length - 1] !== p) pts.push(p);
}
console.log('  const DRAWING = [');
console.log([...segs.values()].map((pts) => `    '${pts.join(' ')}'`).join(',\n'));
console.log('  ];');
