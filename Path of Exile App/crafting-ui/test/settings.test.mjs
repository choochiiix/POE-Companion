import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, settingsStorageKey, validateSettings } from '../features/settings/settings-model.js';

test('settings validate known choices without inheriting unknown or future schemas', () => {
  for (const value of [null, [], 'bad', {version:2}, {version:1,density:'bad',textSize:null,motion:'bad'}]) assert.deepEqual(validateSettings(value), defaultSettings);
  const valid = {version:1,density:'compact',textSize:'large',motion:'reduced'};
  assert.deepEqual(validateSettings({...valid,unknown:true}), valid);
  assert.notEqual(validateSettings(null), defaultSettings);
  assert.equal(settingsStorageKey, 'poe-companion.settings.v1');
});
