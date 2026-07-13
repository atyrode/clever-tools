import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { afterEach, test } from 'node:test';
import { openLoginPage } from '../src/commands/login/login.command.js';
import { Logger } from '../src/logger.js';

const TEST_LOGIN_URL = 'https://console.example.test/login';
const MANUAL_LOGIN_MESSAGE =
  'Could not open your browser automatically. Open the URL above manually to continue logging in.';
const originalWarn = Logger.warn;

afterEach(() => {
  Logger.warn = originalWarn;
});

function captureWarnings() {
  const warnings = [];
  Logger.warn = (message) => warnings.push(message);
  return warnings;
}

test('opens the login page without warning', async () => {
  const warnings = captureWarnings();
  const browserProcess = new EventEmitter();
  let openCount = 0;

  await openLoginPage(TEST_LOGIN_URL, (url, options) => {
    openCount += 1;
    assert.equal(url, TEST_LOGIN_URL);
    assert.deepEqual(options, { wait: false });
    return browserProcess;
  });

  assert.equal(openCount, 1);
  assert.deepEqual(warnings, []);
});

test('warns when the browser opener rejects', async () => {
  const warnings = captureWarnings();

  await openLoginPage(TEST_LOGIN_URL, () => Promise.reject(new Error('browser opener rejected')));

  assert.deepEqual(warnings, [MANUAL_LOGIN_MESSAGE]);
});

test('warns on an asynchronous child process error', async () => {
  const warnings = captureWarnings();
  const browserProcess = new EventEmitter();
  const error = Object.assign(new Error('spawn xdg-open ENOENT'), { code: 'ENOENT' });

  await openLoginPage(TEST_LOGIN_URL, () => {
    process.nextTick(() => browserProcess.emit('error', error));
    return browserProcess;
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(warnings, [MANUAL_LOGIN_MESSAGE]);
});
