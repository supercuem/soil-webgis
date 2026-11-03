const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {assessSample} = require('../app.js');

const root = path.resolve(__dirname, '..');
const survey = JSON.parse(fs.readFileSync(path.join(root, 'data/processed/survey.json'), 'utf8'));
const zones = JSON.parse(fs.readFileSync(path.join(root, 'data/processed/soil-polygons.geojson'), 'utf8'));

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
  assert.equal(zones.features.length, 3);
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
