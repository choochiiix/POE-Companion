"""Execute the pinned release's headless wrapper and capture independent fixture outputs."""

import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile


HERE = Path(__file__).resolve().parent
APP = HERE.parents[2]
PIN = json.loads((HERE / 'pin.json').read_text(encoding='utf-8'))


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def text_digest(path):
    return hashlib.sha256(path.read_text(encoding='utf-8').encode()).hexdigest()


def extract(archive, runtime):
    if digest(archive) != PIN['archiveSha256']:
        raise ValueError('PoB release archive hash mismatch')
    prefix = f"PathOfBuilding-{PIN['revision']}/"
    with ZipFile(archive) as source:
        for entry in source.infolist():
            if entry.is_dir() or not entry.filename.startswith(prefix):
                continue
            name = entry.filename.removeprefix(prefix)
            if name != 'manifest.xml' and not name.startswith(('src/', 'runtime/', 'spec/System/')):
                continue
            if Path(name).suffix.lower() not in {'.lua', '.json', '.jsonc', '.xml', '.txt', '.dll'}:
                continue
            target = (runtime / name).resolve()
            if not target.is_relative_to(runtime):
                raise ValueError('Unsafe PoB archive path')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(source.read(entry))
    version = ET.parse(runtime / 'manifest.xml').find('Version').get('number')
    if version != PIN['version']:
        raise ValueError(f'Unexpected PoB release {version}')


BOOTSTRAP = r"""
arg = {}
package.path = './?.lua;../runtime/lua/?.lua;../runtime/lua/?/init.lua;' .. package.path
package.cpath = '../runtime/?.dll;' .. package.cpath
jit = require('jit')
bit = require('bit')
function loadfile(path)
  local file, err = io.open(path, 'rb')
  if not file then return nil, err end
  local source = file:read('*a')
  file:close()
  return loadstring((source:gsub('^#@[^\n]*', '')), '@' .. path)
end
function dofile(path)
  local chunk, err = loadfile(path)
  assert(chunk, err)
  local result = chunk()
  if path == '_SimpleGraphic.def.lua' then
    LaunchSubScript = function() error('Background scripts disabled in reference capture') end
    SpawnProcess = function() error('Process launch disabled in reference capture') end
    OpenURL = function() error('URL opening disabled in reference capture') end
  end
  return result
end
io.read = function() error('Headless startup requested interactive input') end
dofile('HeadlessWrapper.lua')
assert(build, 'PoB build failed to initialize')
"""


def run(runtime):
    from _ctypes import FreeLibrary

    original_cwd = Path.cwd()
    with os.add_dll_directory(str(runtime / 'runtime')):
        lua = ctypes.CDLL(str(runtime / 'runtime/lua51.dll'))
        lua.luaL_newstate.restype = ctypes.c_void_p
        lua.luaL_openlibs.argtypes = [ctypes.c_void_p]
        lua.luaL_loadstring.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        lua.lua_pcall.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int]
        lua.lua_tolstring.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
        lua.lua_tolstring.restype = ctypes.c_char_p
        lua.lua_close.argtypes = [ctypes.c_void_p]
        state = lua.luaL_newstate()
        try:
            if not state:
                raise RuntimeError('Could not allocate a Lua state')
            os.chdir(runtime / 'src')
            lua.luaL_openlibs(state)
            fixtures_path = json.dumps((HERE / 'fixtures.json').as_posix(), ensure_ascii=False)
            script = (HERE / 'fixtures.lua').read_text(encoding='utf-8')
            code = f'FIXTURES_PATH = {fixtures_path}\n{BOOTSTRAP}\n{script}'
            status = lua.luaL_loadstring(state, code.encode())
            if not status:
                status = lua.lua_pcall(state, 0, 1, 0)
            value = lua.lua_tolstring(state, -1, None)
            if status or value is None:
                raise RuntimeError(value.decode(errors='replace') if value else 'Lua execution failed')
            return json.loads(value)
        finally:
            os.chdir(original_cwd)
            if state:
                lua.lua_close(state)
            FreeLibrary(lua._handle)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=HERE / 'capture.json')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='pob-2681-') as temp:
        runtime = Path(temp).resolve()
        extract(args.archive.resolve(), runtime)
        upstream_hashes = {name: digest(runtime / name) for name in PIN['upstreamFiles']}
        result = run(runtime)
    capture = {
        'schemaVersion': 1,
        'kind': 'executed-pob-headless-build',
        'version': PIN['version'],
        'revision': PIN['revision'],
        'archiveSha256': PIN['archiveSha256'],
        'upstreamHashes': upstream_hashes,
        'localSourceHashes': {name: text_digest(APP / name) for name in PIN['localSources']},
        'toolingHashes': {name: text_digest(HERE / name) for name in ['capture.py', 'fixtures.json', 'fixtures.lua']},
        **result,
    }
    args.output.write_text(json.dumps(capture, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
