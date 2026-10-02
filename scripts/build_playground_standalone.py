#!/usr/bin/env python3
"""Build exact classroom modules with local dependencies inlined, for offline use."""
from pathlib import Path
import re
from inline_theme import inline_shared_theme
ROOT=Path(__file__).resolve().parents[1]

def module_object(file, name):
    source=file.read_text(encoding='utf-8')
    exports=re.findall(r'^export\s+(?:function|class|const|let|var)\s+(\w+)',source,re.M)
    source=re.sub(r'^import .*?;\s*$', '', source, flags=re.M)
    source=re.sub(r'^export\s+', '', source, flags=re.M)
    return 'const '+name+' = (()=>{\n'+source+'\nreturn {'+','.join(exports)+'};})();\n'

def build(folder,filename,script):
    base=ROOT/'lessons'/folder
    html=inline_shared_theme((base/'index.html').read_text(encoding='utf-8'))
    def style(m):
        p=(base/m.group(1)).resolve()
        return '<style>'+p.read_text(encoding='utf-8')+'</style>'
    html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',style,html)
    html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', html)
    html=html.replace('<a href="../../index.html" id="back-home">← 科学小岛</a>', '<a href="#" id="back-home">科学小岛</a>')
    html=html.replace('../../vendor/jsxgraph/LICENSE.MIT','https://github.com/jsxgraph/jsxgraph/blob/main/LICENSE.MIT')
    html=html.replace('../../vendor/tangram/LICENSE','https://github.com/iliagrigorevdev/tangram/blob/master/LICENSE')
    html=html.replace('</body>','<script>'+script.replace('</script','<\\/script')+'</script></body>')
    out=ROOT/'dist'/filename;out.parent.mkdir(exist_ok=True);out.write_text(html,encoding='utf-8')
    print(out.name,out.stat().st_size)

def main():
    j=ROOT/'lessons/jsxgraph-playground'
    math=re.sub(r'^export\s+', '', (j/'math.js').read_text(encoding='utf-8'),flags=re.M)
    teaching=re.sub(r'^export\s+', '', (j/'teaching.js').read_text(encoding='utf-8'),flags=re.M)
    app=re.sub(r'^import .*?;\s*$', '', (j/'app.js').read_text(encoding='utf-8'),flags=re.M)
    license=(ROOT/'vendor/jsxgraph/LICENSE.MIT').read_text(encoding='utf-8')
    runtime=(ROOT/'vendor/jsxgraph/distrib/jsxgraphcore.js').read_text(encoding='utf-8')
    build('jsxgraph-playground','MathPhysics-Playground.html','/*\n'+license+'\n*/\n'+runtime+'\n;(()=>{\n'+math+'\n'+teaching+'\n'+app+'\n})();')
    v=ROOT/'vendor/tangram/js'
    runtime=module_object(v/'base64.js','Base64')+module_object(v/'vecmath.js','VecMath')+module_object(v/'tangram.js','T')
    snapshot=re.sub(r'^export\s+', '', (ROOT/'lessons/tangram-flat/snapshot.js').read_text(encoding='utf-8'),flags=re.M)
    teaching=re.sub(r'^export\s+', '', (ROOT/'lessons/tangram-flat/teaching.js').read_text(encoding='utf-8'),flags=re.M)
    app=re.sub(r'^import .*?;\s*$', '', (ROOT/'lessons/tangram-flat/app.js').read_text(encoding='utf-8'),flags=re.M)
    license=(ROOT/'vendor/tangram/LICENSE').read_text(encoding='utf-8')
    build('tangram-flat','MathPhysics-Tangram.html','/*\n'+license+'\n*/\n(()=>{\n'+runtime+'const Vector=VecMath.Vector;\n'+snapshot+'\n'+teaching+'\n'+app+'\n})();')
if __name__=='__main__':main()
