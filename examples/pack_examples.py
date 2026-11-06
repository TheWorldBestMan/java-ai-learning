from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).parent
out = root / 'downloads'
out.mkdir(exist_ok=True)
for name in ('environment-check', 'spring-greeting', 'database-notes', 'api-validation', 'spring-ai-mock', 'vector-search-mock', 'rag-mock'):
    project = root / name
    with ZipFile(out / (name + '.zip'), 'w', ZIP_DEFLATED) as archive:
        for f in sorted(project.rglob('*')):
            if f.is_file() and 'target' not in f.relative_to(project).parts:
                archive.write(f, f.relative_to(root).as_posix())
    print(name, 'packed')
