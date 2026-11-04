const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {assessSample, nextVisibleLayers} = require('../app.js');

const root = path.resolve(__dirname, '..');
const survey = JSON.parse(fs.readFileSync(path.join(root, 'data/processed/survey.json'), 'utf8'));
const zones = JSON.parse(fs.readFileSync(path.join(root, 'data/processed/soil-polygons.geojson'), 'utf8'));

test('illustrative soil and parcel maps use only synthetic geometries and labels', () => {
  const parcels = JSON.parse(fs.readFileSync(path.join(root, 'data/processed/parcel-polygons.geojson'), 'utf8'));
  assert.equal(zones.metadata.source_file, 'SYNTHETIC_DEMO_ONLY');
  assert.equal(zones.features.length, survey.sites.length);
  assert.equal(parcels.metadata.source_file, 'SYNTHETIC_DEMO_ONLY');
  assert.equal(parcels.features.length, survey.sites.length * 9);
  for (const feature of parcels.features) {
    assert.match(feature.properties.code, /^DEMO-T\d{2}-\d{2}$/);
    assert.deepEqual(Object.keys(feature.properties).sort(), ['code', 'parcel', 'sheet']);
    assert.equal(feature.geometry.type, 'Polygon');
    const ring = feature.geometry.coordinates[0];
    assert.deepEqual(ring[0], ring.at(-1));
    assert.ok(ring.every(([lon, lat]) => lon >= 106 && lon <= 108 && lat >= 10 && lat <= 12));
  }
  assert.ok(parcels.features.every(feature => !/TENCHU|DIACHI|THUAID/i.test(JSON.stringify(feature))));
});

test('the cadastral and soil overlays toggle independently over the street map', () => {
  const cadastral = nextVisibleLayers({cadastre: false, soil: false}, 'cadastre');
  assert.deepEqual(cadastral, {cadastre: true, soil: false});
  const both = nextVisibleLayers(cadastral, 'soil');
  assert.deepEqual(both, {cadastre: true, soil: true});
  assert.deepEqual(nextVisibleLayers(both, 'cadastre'), {cadastre: false, soil: true});
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const mode of ['cadastre', 'soil']) {
    assert.match(html, new RegExp(`data-overlay="${mode}"`));
  }
  assert.match(html, /Đường phố · OpenStreetMap/);
  assert.match(html, /Địa chính \(minh họa\)/);
  assert.match(html, /Thổ nhưỡng \(minh họa\)/);
});

test('public package declares and contains only fabricated sample records', () => {
  assert.equal(survey.metadata.source_file, 'SYNTHETIC_DEMO_ONLY');
  assert.equal(survey.sites.length, 6);
  assert.equal(survey.indicators.length, 13);
  for (const site of survey.sites) {
    assert.match(site.code, /^DEMO-0[1-6]$/);
    assert.equal(site.source_x, null);
    assert.equal(site.source_y, null);
    assert.deepEqual(site.samples.map(sample => sample.depth_cm), ['0-30', '30-60']);
  }
  assert.equal(zones.metadata.source_file, 'SYNTHETIC_DEMO_ONLY');
  assert.equal(zones.features.length, 6);
  assert.ok(zones.features.every(feature => feature.properties.code.startsWith('DEMO-')));
});

test('warning interaction has an example exceedance and conspicuous demo labels', () => {
  assert.equal(assessSample(survey.sites[1].samples[0], '1').status, 'exceed');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(html, /BẢN DEMO CÔNG KHAI/);
  assert.match(html, /Dữ liệu giả lập/);
  assert.match(js, /Số đo và vị trí hoàn toàn giả lập/);
});
