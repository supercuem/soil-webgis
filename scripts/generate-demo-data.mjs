import {mkdir, writeFile} from 'node:fs/promises';

// Entirely fabricated examples for the public UI preview. Do not import research data here.
const root = new URL('../data/processed/', import.meta.url);
const indicators = [
  ['ph', 'pH', 'pH'], ['as', 'Asen (As)', 'mg/kg'], ['cd', 'Cadimi (Cd)', 'mg/kg'],
  ['zn', 'Kẽm (Zn)', 'mg/kg'], ['pb', 'Chì (Pb)', 'mg/kg'], ['eh', 'Thế oxy hóa khử (Eh)', 'mV'],
  ['cu', 'Đồng (Cu)', 'mg/kg'], ['hg', 'Thủy ngân (Hg)', 'mg/kg'], ['mn2', 'Mangan (Mn²⁺)', 'mg/kg'],
  ['no3', 'Nitrat (NO₃⁻)', 'mg/kg'], ['so4', 'Sunfat (SO₄²⁻)', 'g/kg'],
  ['nh4', 'Amoni (NH₄⁺)', 'mg/kg'], ['po4', 'Photphat (PO₄³⁻)', 'mg/kg'],
].map(([code, name, unit]) => ({code, name, unit}));

const examples = [
  ['DEMO-01', 'Biên Hòa', 10.94, 106.85, [5.3, 12, 0.8, 65, 24, 144, 41, 0.08, 160, 1.1, 0.018, 2.4, 0.22]],
  ['DEMO-02', 'Long Thành', 10.78, 107.10, [4.8, 31, 6.1, 122, 65, 128, 52, 0.12, 195, 1.4, 0.021, 3.2, 0.19]],
  ['DEMO-03', 'Thống Nhất', 11.08, 107.20, [5.8, 9, 1.3, 74, 30, 162, 32, null, 132, 0.8, 0.013, 1.9, 0.14]],
  ['DEMO-04', 'Vĩnh Cửu', 11.15, 106.94, [5.1, 19, 2.1, 92, 44, 151, 58, 0.07, 210, 1.7, 0.025, 2.8, 0.26]],
  ['DEMO-05', 'Xuân Lộc', 11.04, 107.40, [6.0, 16, 0.5, 81, 22, 177, 34, 0.05, 121, 0.9, 0.016, 1.6, 0.12]],
  ['DEMO-06', 'Cẩm Mỹ', 10.90, 107.29, [5.5, 14, 1.6, 108, 37, 136, 48, 0.09, 178, 1.2, 0.019, 2.2, 0.17]],
];

function measurements(values, depth) {
  return Object.fromEntries(indicators.map((item, index) => {
    const original = values[index];
    if (original === null) return [item.code, {value: null, quality_flag: 'below_detection', raw: 'KPH'}];
    const value = depth === '0-30' ? original : Number((original * (item.code === 'ph' ? 1.04 : 0.86)).toFixed(5));
    return [item.code, {value, quality_flag: 'valid'}];
  }));
}

const sites = examples.map(([code, district, latitude, longitude, values]) => ({
  code, district, province: 'Đồng Nai', source_x: null, source_y: null, latitude, longitude,
  samples: ['0-30', '30-60'].map(depth_cm => ({depth_cm, measurements: measurements(values, depth_cm)})),
}));
const survey = {
  metadata: {source_file: 'SYNTHETIC_DEMO_ONLY', source_crs_status: 'fabricated_locations', site_count: sites.length,
    depths_cm: ['0-30', '30-60'], assessment: 'illustration_only_not_research_data'},
  indicators, sites,
};

function rectangle(lon, lat) {
  return [[lon - 0.035, lat - 0.025], [lon + 0.035, lat - 0.025],
    [lon + 0.035, lat + 0.025], [lon - 0.035, lat + 0.025], [lon - 0.035, lat - 0.025]];
}
const soil = {type: 'FeatureCollection', metadata: {source_file: 'SYNTHETIC_DEMO_ONLY'}, features: examples.slice(0, 3).map((point, index) => ({
  type: 'Feature', properties: {code: `DEMO-VUNG-${index + 1}`, symbol: `DEMO-${index + 1}`, area_ha: null},
  geometry: {type: 'Polygon', coordinates: [rectangle(point[3], point[2])]},
}))};

await mkdir(root, {recursive: true});
await writeFile(new URL('survey.json', root), JSON.stringify(survey));
await writeFile(new URL('soil-polygons.geojson', root), JSON.stringify(soil));
console.log(`Generated ${sites.length} fabricated sites and ${soil.features.length} illustrative zones.`);
