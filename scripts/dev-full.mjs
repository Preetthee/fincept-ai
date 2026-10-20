import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const backendDirectory = resolve(root, 'backend');
const configuredPython = process.env.PYTHON_BIN;
const virtualEnvironmentPython = process.platform === 'win32'
  ? resolve(backendDirectory, '.venv', 'Scripts', 'python.exe')
  : resolve(backendDirectory, '.venv', 'bin', 'python');
const python = configuredPython || (existsSync(virtualEnvironmentPython) ? virtualEnvironmentPython : 'python');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontendCommand = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : npm;
const frontendArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', `${npm} run dev`]
  : ['run', 'dev'];

const services = [
  {
    name: 'backend',
    command: python,
    args: ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'],
    cwd: backendDirectory,
  },
  {
    name: 'frontend',
    command: frontendCommand,
    args: frontendArgs,
    cwd: root,
  },
];

const children = services.map(({name, command, args, cwd}) => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: false,
  });

  const write = (stream, data) => {
    for (const line of data.toString().split(/\r?\n/)) {
      if (line) process[stream].write(`[${name}] ${line}\n`);
    }
  };
  child.stdout.on('data', data => write('stdout', data));
  child.stderr.on('data', data => write('stderr', data));
  child.on('error', error => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[${name}] stopped with ${signal || `exit code ${code}`}.`);
      shutdown(code || 1);
    }
  });
  return child;
});

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  setTimeout(() => process.exit(exitCode), 500);
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
