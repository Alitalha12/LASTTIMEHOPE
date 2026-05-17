import json
import os

log_path = r"C:\Users\User\.gemini\antigravity\brain\9142dc80-68b5-44f1-b66d-1167cc80b678\.system_generated\logs\overview.txt"

if not os.path.exists(log_path):
    print("Log file not found.")
    exit(1)

types = {}
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line.strip())
            t = data.get("type")
            if t not in types:
                types[t] = data
        except Exception as e:
            pass

for t, sample in types.items():
    print(f"Type: {t}")
    print(f"Keys: {list(sample.keys())}")
    print(f"Sample: {str(sample)[:500]}")
    print("=" * 60)
