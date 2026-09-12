const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('browser texture bundle matches the Blender source images', () => {
  const dir = path.resolve(__dirname, '../assets/track');
  const textures = vm.runInNewContext(fs.readFileSync(path.join(dir, 'track-textures.js'), 'utf8') + '\nSC_TRACK_TEXTURES;');
  for (const name of ['speedway-asphalt', 'speedway-wall', 'speedway-mesh']) {
    assert.ok(textures[name].startsWith('data:image/png;base64,'));
    assert.deepEqual(Buffer.from(textures[name].split(',')[1], 'base64'), fs.readFileSync(path.join(dir, `${name}.png`)));
  }
});

test('finish model is centered, finite and leaves the racing corridor clear', () => {
  const model = vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../assets/track/track-model.js'), 'utf8') + '\nSC_TRACK_MODEL;');
  assert.equal(model.version, 2);
  const groups = Object.values(model.finishParts);
  assert.equal(groups.length, 4);
  let triangles = 0;
  const paintZ = [];
  for (const data of groups) {
    assert.ok([...data.position, ...data.normal, ...data.uv].every(Number.isFinite));
    assert.equal(data.uv.length / 2, data.position.length / 3);
    assert.ok(data.index.every(i => Number.isInteger(i) && i >= 0 && i < data.position.length / 3));
    triangles += data.index.length / 3;
    for (let i = 0; i < data.position.length; i += 3) {
      const [x, y, z] = data.position.slice(i, i + 3);
      assert.ok(Math.abs(x) >= 12.6 || y <= .02 || y >= 7.7, `obstruction at ${x},${y},${z}`);
      if (Math.abs(x) <= 11 && y <= .02) {
        assert.equal(y, .014);
        paintZ.push(z);
      }
    }
  }
  assert.equal(Math.min(...paintZ), -1.14);
  assert.equal(Math.max(...paintZ), 1.14);
  assert.ok(triangles < 1500, `finish has ${triangles} triangles`);
});
