"""Execute isolated, hash-pinned PoB Lua helpers, never launch its UI or network code."""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    manifest = json.loads((HERE / 'pin.json').read_text())
    archive = ROOT / manifest['archive']
    digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
    if digest != manifest['sha256']:
        raise ValueError('PoB archive does not match pinned snapshot')
    with zipfile.ZipFile(archive) as source:
        for name, expected in manifest['files'].items():
            if hashlib.sha256(source.read(name)).hexdigest() != expected:
                raise ValueError('PoB source mismatch: ' + name)
        defence = source.read('PathOfBuilding-dev/src/Modules/CalcDefence.lua').decode()
        common = source.read('PathOfBuilding-dev/src/Modules/Common.lua').decode()
        # Exact source slices bounded by named adjacent functions; no formula rewrite.
        rounding = common[common.index('function round(val, dec)'):common.index('--- Rounds down a number')]
        start = defence.index('function calcs.hitChance(')
        end = defence.index('-- Based on code from FR', start)
        helpers = defence[start:end]
        dll_bytes = source.read('PathOfBuilding-dev/runtime/lua51.dll')
    if os.name != 'nt':
        raise RuntimeError('Bundled reference runtime is Windows-only; use a compatible Windows host')
    cases = json.loads((HERE / 'cases.json').read_text())
    # Each invocation creates a private temporary runtime. The handle is released before cleanup.
    with tempfile.TemporaryDirectory(prefix='pob-reference-', dir=HERE) as directory:
        runtime = Path(directory) / 'lua51.dll'
        runtime.write_bytes(dll_bytes)
        lua = ctypes.CDLL(str(runtime))
        lua.luaL_newstate.restype = ctypes.c_void_p
        lua.luaL_openlibs.argtypes = [ctypes.c_void_p]
        lua.luaL_loadstring.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        lua.lua_pcall.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int]
        lua.lua_tolstring.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
        lua.lua_tolstring.restype = ctypes.c_char_p
        lua.lua_tonumber.argtypes = [ctypes.c_void_p, ctypes.c_int]
        lua.lua_tonumber.restype = ctypes.c_double
        lua.lua_settop.argtypes = [ctypes.c_void_p, ctypes.c_int]
        lua.lua_close.argtypes = [ctypes.c_void_p]
        state = lua.luaL_newstate()
        if not state:
            raise RuntimeError('Cannot create Lua state')
        def execute(code):
            status = lua.luaL_loadstring(state, code.encode())
            if not status:
                status = lua.lua_pcall(state, 0, 1, 0)
            if status:
                raise RuntimeError(lua.lua_tolstring(state, -1, None).decode())
        try:
            lua.luaL_openlibs(state)
            execute('local m_floor, m_min, m_max = math.floor, math.min, math.max\nlocal calcs = {}\n' + rounding + '\n' + helpers + '\n_G.referenceCalcs = calcs\nreturn 0')
            lua.lua_settop(state, 0)
            results = []
            for case in cases:
                function = case['function']
                if function not in ('hitChance', 'armourReductionF', 'armourReduction'):
                    raise ValueError('Unknown helper')
                values = case['args']
                if len(values) != 2 or any(type(v) not in (int, float) for v in values):
                    raise ValueError('Expected two numbers')
                execute('return referenceCalcs.' + function + '(' + ','.join(map(str, values)) + ')')
                value = lua.lua_tonumber(state, -1)
                lua.lua_settop(state, 0)
                results.append({**case, 'value': value})
            output = {'schemaVersion': 1, 'kind': 'executed-pob-lua-helpers', 'archiveSha256': digest, 'manifestVersion': manifest['manifestVersion'], 'fullBuildParity': False, 'results': results}
        finally:
            lua.lua_close(state)
            # ctypes does not unload libraries automatically on Windows.
            import _ctypes
            _ctypes.FreeLibrary(lua._handle)
        encoded = json.dumps(output, indent=2) + '\n'
        if args.output:
            args.output.write_text(encoded)
        else:
            print(encoded, end='')


if __name__ == '__main__':
    main()
