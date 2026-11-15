"""Boot the pinned PoB headless calculator in a disposable local directory."""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--script', type=Path, default=HERE / 'trial.lua')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    script = args.script.resolve().read_text(encoding='utf-8')
    output = args.output.resolve()
    pin = json.loads((HERE / 'pin.json').read_text())
    archive = ROOT / pin['archive']
    with archive.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != pin['sha256']:
            raise ValueError('Reference archive hash mismatch')
    original_cwd = Path.cwd()
    with tempfile.TemporaryDirectory(prefix='exile-build-trial-', dir=HERE) as directory:
        work = Path(directory)
        if not work.resolve().is_relative_to(HERE.resolve()):
            raise ValueError('Temporary runtime must stay in reference workspace')
        with zipfile.ZipFile(archive) as source:
            for entry in source.infolist():
                relative = entry.filename.removeprefix('PathOfBuilding-dev/')
                if entry.is_dir() or not (relative.startswith(('src/', 'runtime/')) or relative == 'manifest.xml'):
                    continue
                if Path(relative).suffix.lower() not in ('.lua', '.json', '.jsonc', '.xml', '.txt', '.dll'):
                    continue
                target = (work / relative).resolve()
                if not target.is_relative_to(work.resolve()):
                    raise ValueError('Unsafe archive path')
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(source.read(entry))
        # Native modules find their sibling DLLs here; only this verified snapshot is loaded.
        with os.add_dll_directory(str(work / 'runtime')):
            lua = ctypes.CDLL(str(work / 'runtime/lua51.dll'))
            lua.luaL_newstate.restype = ctypes.c_void_p
            lua.luaL_openlibs.argtypes = [ctypes.c_void_p]
            lua.luaL_loadstring.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
            lua.lua_pcall.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int]
            lua.lua_tolstring.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
            lua.lua_tolstring.restype = ctypes.c_char_p
            lua.lua_close.argtypes = [ctypes.c_void_p]
            state = lua.luaL_newstate()
            try:
                os.chdir(work / 'src')
                lua.luaL_openlibs(state)
                bootstrap = 'REFERENCE_DIR = ' + json.dumps(HERE.as_posix()) + '\n' + '''
arg = {}
package.path = './?.lua;../runtime/lua/?.lua;../runtime/lua/?/init.lua;' .. package.path
package.cpath = '../runtime/?.dll;' .. package.cpath
jit = require('jit')
bit = require('bit')
local originalLoadfile = loadfile
function loadfile(path)
  local file, err = io.open(path, 'rb')
  if not file then return nil, err end
  local text = file:read('*a'); file:close()
  text = text:gsub('^#@[^\\n]*', '')
  return loadstring(text, '@' .. path)
end
function dofile(path) local f,err=loadfile(path); assert(f,err); return f() end
io.read = function() error('Headless startup requested interactive input') end
-- Block background network/process actions in this development-only reference run.
dofile('_SimpleGraphic.def.lua')
local originalDofile = dofile
function dofile(path)
  local result = originalDofile(path)
  if path == '_SimpleGraphic.def.lua' then
    LaunchSubScript = function() error('Background scripts disabled in trial') end
    SpawnProcess = function() error('Process launch disabled in trial') end
    OpenURL = function() error('URL opening disabled in trial') end
  end
  return result
end
dofile('HeadlessWrapper.lua')
assert(build, 'PoB build failed to initialize')
'''
                code = bootstrap + '\n' + script + '\nreturn require("dkjson").encode(trialResult)'
                status = lua.luaL_loadstring(state, code.encode())
                if not status:
                    status = lua.lua_pcall(state, 0, 1, 0)
                value = lua.lua_tolstring(state, -1, None)
                if status:
                    raise RuntimeError(value.decode(errors='replace') if value else 'Lua execution failed')
                source_paths = ['data-sources/pob-tree-3_29/tree.json', 'data-sources/repoe-poe1/base_items.json', 'data-sources/repoe-poe1/mods.json', 'crafting-ui/skills-data.json']
                source_hashes = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in source_paths}
                output.write_text(json.dumps({'schemaVersion': 1, 'archiveSha256': pin['sha256'],
                    'trialScriptSha256': hashlib.sha256(script.encode()).hexdigest(),
                    'runnerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                    'localSourceHashes': source_hashes, 'kind': 'executed-pob-headless-build', 'result': json.loads(value)}, indent=2) + '\n')
            finally:
                os.chdir(original_cwd)
                lua.lua_close(state)
                import _ctypes
                _ctypes.FreeLibrary(lua._handle)


if __name__ == '__main__':
    main()
