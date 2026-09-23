#!/usr/bin/env python3
"""Download enquiries using the linked Railway service, without printing secrets."""
import csv
import io
import json
import pathlib
import subprocess
import sys
import urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
config = json.loads(subprocess.check_output(['railway', 'variables', '--json'], cwd=root))
token = config['LEADS_ADMIN_TOKEN']
request = urllib.request.Request('https://maracuyalabs.com/api/leads', headers={'Authorization': 'Bearer ' + token})
with urllib.request.urlopen(request, timeout=30) as response:
    leads = [json.loads(line) for line in response.read().decode().splitlines() if line.strip()]
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'artifacts' / 'enquiries.csv'
out.parent.mkdir(parents=True, exist_ok=True)
fields = ['createdAt', 'name', 'email', 'company', 'services', 'other', 'size', 'budget', 'notes', 'attribution', 'id']
def safe_cell(value):
    if isinstance(value, list): value = '; '.join(value)
    if isinstance(value, dict): value = json.dumps(value, ensure_ascii=False)
    value = str(value or '')
    return "'" + value if value.startswith(('=', '+', '-', '@', '\t', '\r')) else value
with out.open('w', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    for lead in leads: writer.writerow({field: safe_cell(lead.get(field)) for field in fields})
out.chmod(0o600)
print(f'Exported {len(leads)} enquiries to {out}')
