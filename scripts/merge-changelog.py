import re

with open('CHANGELOG.md', 'r') as f:
    lines = f.readlines()

sections = {
    'Added': set(),
    'Changed': set(),
    'Removed': set(),
    'Fixed': set(),
    'Security': set(),
    'Infrastructure': set()
}

current_section = 'Added'

def map_section(header):
    h = header.lower()
    if 'add' in h: return 'Added'
    if 'change' in h or 'refactor' in h: return 'Changed'
    if 'remove' in h: return 'Removed'
    if 'fix' in h or 'improv' in h: return 'Fixed'
    if 'security' in h or 'compliance' in h: return 'Security'
    if 'infrastructure' in h or 'production' in h: return 'Infrastructure'
    return 'Added' # default

for line in lines:
    if line.startswith('## '):
        continue
    elif line.startswith('### '):
        current_section = map_section(line.replace('### ', '').strip())
    elif line.startswith('- '):
        sections[current_section].add(line.strip())

output = """# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc.1] - 2026-04-20
"""

for sec_name, sec_lines in sections.items():
    if len(sec_lines) > 0:
        output += f"\n### {sec_name}\n"
        # Output lines sorted roughly or just sequentially
        for l in sorted(list(sec_lines)):
            output += l + "\n"

with open('CHANGELOG.md', 'w') as f:
    f.write(output)
