"""Transfer only TDLib application credentials to the user's VPS; never print values."""
from pathlib import Path
import json
import subprocess
from dotenv import dotenv_values

settings = dotenv_values(Path(r'C:\Users\adria\OneDrive\Cintiabot\Codigo multibot\.env'))
values = {key: settings.get(key) for key in ('TDLIB_API_ID', 'TDLIB_API_HASH')}
assert all(values.values()), 'Missing application credentials'
assert values['TDLIB_API_ID'].isdigit()
assert all(c in '0123456789abcdefABCDEF' for c in values['TDLIB_API_HASH'])
remote = "import sys,json,os; from pathlib import Path; os.umask(0o077); d=json.load(sys.stdin); p=Path('/root/tdlib-deploy-20260927/secrets'); p.mkdir(exist_ok=True); p.chmod(0o700); f=p/'tdlib.env'; f.write_text(''.join(k+'='+v+'\\n' for k,v in d.items())); f.chmod(0o600); print('TDLib secret installed with mode 0600')"
command = ['ssh', '-i', str(Path.home()/'.ssh/id_hostinger'), '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', 'root@72.60.186.130', "python3 -c '" + remote.replace("'", "'\"'\"'") + "'"]
subprocess.run(command, input=json.dumps(values), text=True, check=True)
