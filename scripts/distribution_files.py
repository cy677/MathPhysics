"""Explicit source roots shared by local delivery builders.

Runtime databases, credentials, caches and local review outputs stay outside
delivery archives. Third-party fonts and audio remain with their pinned source.
"""
from pathlib import Path

SOURCE_ROOTS = [
    'index.html', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
    'START_WINDOWS.bat', 'package.json', 'package-lock.json', '.node-version',
    '.gitignore', '.nojekyll',
    'src', 'lessons', 'learning', 'server', 'config', 'vendor', 'scripts', 'tests',
    'deploy', 'modules', 'GET_PHET_WINDOWS.bat', 'get_phet.sh',
    '.github/workflows/classroom.yml', '.github/workflows/question-bank.yml',
    '.github/workflows/spaceflight-svg.yml', '.github/workflows/learning.yml',
    '.github/workflows/geometry.yml', '.github/workflows/integrate.yml',
    '.github/workflows/sync-phet.yml',
    'docs/primary-math-curriculum.md', 'docs/primary-math-catalog.md',
    'docs/question-bank.md', 'docs/singapore-primary-curriculum.md',
    'docs/logic-games-plan.md', 'docs/spatial-games.md',
    'docs/learning-coverage',
    'docs/word-problems-integration.md', 'docs/word-problems-review.md',
    'docs/server-learning-plan.md', 'docs/server-learning-operation.md',
    'docs/api-contract.json', 'docs/assessment-coverage.md', 'docs/sync-adapters.md',
    'docs/local-delivery.md',
]
EXCLUDED_PARTS = {
    '.git', 'node_modules', '__pycache__', '.vs', '.idea', '.test-deps',
    '.playwright-mcp', '.data', 'userdata', 'collection-records',
    'runtime', 'backups', 'test-results', 'playwright-report',
}
EXCLUDED_SUFFIXES = {
    '.pyc', '.log', '.sqlite', '.sqlite3', '.db', '.suo',
    '.pem', '.key', '.p12', '.pfx',
}


def delivery_allowed(relative: Path) -> bool:
    return (not any(part in EXCLUDED_PARTS for part in relative.parts)
            and not (relative.parts and relative.parts[0] == 'data')
            and relative.name != '.DS_Store'
            and not relative.name.startswith('.env')
            and not relative.name.endswith(('-wal', '-shm'))
            and relative.suffix.lower() not in EXCLUDED_SUFFIXES)


def collect_files(root: Path):
    files = {}
    for name in SOURCE_ROOTS:
        source = root / name
        for path in ([source] if source.is_file() else sorted(source.rglob('*'))):
            relative = path.relative_to(root)
            if path.is_file() and delivery_allowed(relative):
                files[relative.as_posix()] = path
    return [files[name] for name in sorted(files)]


def exclusion_summary():
    # Keep the earlier check-only contract compatible with existing checks.
    return {
        'excluded': ['.git', 'node_modules', '__pycache__'],
        'additionalExcluded': sorted(
            (EXCLUDED_PARTS - {'.git', 'node_modules', '__pycache__'})
            | {'data/', '.DS_Store', '.env*', '*-wal', '*-shm'}),
        'excludedSuffixes': sorted(EXCLUDED_SUFFIXES),
    }
