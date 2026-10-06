"""Scoped presentation patches for the three Science Island workbenches.

Apply after the existing PhET theme pass. Each literal belongs to a reviewed
view constructor or a named view-color property; scientific palettes, geometry,
listeners, model properties and state transitions remain untouched.
"""

import json


def apply_workbench_theme(sim, text, patch):
    """Record exact, reversible view edits using build_phet_theme's patch API."""
    edits = []
    translations = []

    if sim == 'vector-addition':
        # Graph paper and UI colors are separate from all VectorColorPalettes.
        for name, old, new in [
            ('graphBackgroundColor', 'Jo.WHITE', '"#fffef9"'),
            ('graphMajorLineColor', 'Jo.grayColor(212)', '"#cad7c5"'),
            ('graphMinorLineColor', 'Jo.grayColor(225)', '"#e5ebdf"'),
            ('graphTickLineColor', 'Jo.BLACK', '"#315d4b"'),
            ('graphTickLabelColor', 'Jo.grayColor(130)', '"#657567"'),
            ('separatorStroke', 'Jo.grayColor(180)', '"#d8ded3"'),
            ('radioButtonBaseColor', 'Jo.WHITE', '"#fffef9"'),
            ('radioButtonSelectedStroke', '"rgb( 56, 149, 199 )"', '"#315d4b"'),
            ('radioButtonDeselectedStroke', 'Jo.grayColor(50)', '"#8ea38a"'),
            ('selectedVectorLabelBackgroundFill', '"rgb( 240, 240, 100 )"', '"#faf0d5"'),
            ('selectedVectorLabelBackgroundStroke', '"rgb( 151, 151, 23 )"', '"#b87428"'),
        ]:
            edits.append((f'"{name}",{{default:{old}}}', f'"{name}",{{default:{new}}}'))
        edits += [
            ('GO.ACCORDION_BOX_OPTIONS={cornerRadius:5,',
             'GO.ACCORDION_BOX_OPTIONS={cornerRadius:12,'),
            ('GO.CHECKBOX_OPTIONS={isDisposable:!1,boxWidth:18,',
             'GO.CHECKBOX_OPTIONS={isDisposable:!1,checkboxColor:"#315d4b",checkboxColorBackground:"#fffef9",boxWidth:18,'),
            ('contentWidth:80,contentHeight:145,isDisposable:!1,lineWidth:.8,xMargin:2,yMargin:10,fill:Jo.WHITE,stroke:Jo.BLACK,',
             'contentWidth:80,contentHeight:145,isDisposable:!1,lineWidth:.8,xMargin:2,yMargin:10,fill:"#fffef9",stroke:"#8ea38a",'),
        ]
        # The native polar base-vector picker accepts a signed radius, but its
        # |d| / |e| label incorrectly presents negative values as magnitudes.
        # Describe the existing parameter without changing its range or model.
        edits += [
            ('new eL({symbolProperty:e.symbolProperty,includeAbsoluteValueBars:!0,maxWidth:30})',
             'new eL({symbolProperty:new _h([e.symbolProperty],e=>"r<sub>"+e+"</sub>"),showVectorArrow:!1,includeAbsoluteValueBars:!1,maxWidth:30})'),
            ('accessibleName:new cV(jO.a11y.baseVectorMagnitudePicker.accessibleNameStringProperty,{symbol:e.accessibleSymbolProperty})',
             'accessibleName:new _h([e.accessibleSymbolProperty],e=>"基向量 "+e+" 的有符号径向参数")'),
            ('accessibleHelpText:new cV(jO.a11y.baseVectorMagnitudePicker.accessibleHelpTextStringProperty,{symbol:e.accessibleSymbolProperty})',
             'accessibleHelpText:"正值沿设置角度，负值沿反方向；箭头长度等于参数的绝对值。"'),
        ]
        # Both angle-convention pickers edit the polar parameter angle. For a
        # negative radius it differs from the actual vector direction by 180°.
        # Include each constructor suffix so every reviewed edit is unique.
        angle_accessibility = (
            'accessibleName:new cV(jO.a11y.baseVectorAnglePicker.accessibleNameStringProperty,{symbol:i}),'
            'accessibleHelpText:new cV(jO.a11y.baseVectorAnglePicker.accessibleHelpTextStringProperty,{symbol:i}),'
        )
        parameter_angle_accessibility = (
            'accessibleName:new _h([i],e=>"基向量 "+e+" 的极坐标参数角"),'
            'accessibleHelpText:"从x轴正方向量起的参数角；径向参数为负时，箭头实际方向与此角相差180度；参数为0时，箭头方向未定义。",'
        )
        for suffix in ('tandem:c.A.OPT_OUT}),h=new OL', 'tandem:c.A.OPT_OUT});super'):
            edits.append((angle_accessibility + suffix, parameter_angle_accessibility + suffix))

    elif sim == 'states-of-matter-basics':
        # Both species selectors have hard-coded light labels independent of
        # SOMColorProfile. Icons continue to use the original species colors.
        edits += [
            ('c={font:new Dc(12),fill:"#FFFFFF",maxWidth:.75*s}',
             'c={font:new Dc(12),fill:"#263d33",maxWidth:.75*s}'),
            ('a={font:new Dc(12),fill:"#FFFFFF",maxWidth:s}',
             'a={font:new Dc(12),fill:"#263d33",maxWidth:s}'),
            ('orientation:"vertical",spacing:3,cornerRadius:5,baseColor:"black",disabledBaseColor:"black",selectedLineWidth:1,selectedStroke:"white",',
             'orientation:"vertical",spacing:3,cornerRadius:8,baseColor:"#fffdf4",disabledBaseColor:"#e7eddf",selectedLineWidth:1,selectedStroke:"#315d4b",'),
            ('orientation:"vertical",cornerRadius:5,baseColor:"black",disabledBaseColor:"black",selectedLineWidth:1,selectedStroke:"white",',
             'orientation:"vertical",cornerRadius:8,baseColor:"#fffdf4",disabledBaseColor:"#e7eddf",selectedLineWidth:1,selectedStroke:"#315d4b",'),
            ('PANEL_CORNER_RADIUS:6,NOMINAL_TIME_STEP:',
             'PANEL_CORNER_RADIUS:12,NOMINAL_TIME_STEP:'),
            ('s.compositeThermometerNode=new Gx(t,{font:new Dc(20),fill:"white",',
             's.compositeThermometerNode=new Gx(t,{font:new Dc(20),fill:"#263d33",'),
            # HeaterCoolerBack/Front vessel paint only. Their blue-to-red
            # temperature track, flame/snow images and slider remain native.
            ('a=new _l(s,{stroke:"black",fill:new Id(0,0,120,0).addColorStop(0,ol.toColor(i.baseColor).darkerColor(.5)).addColorStop(1,ol.toColor(i.baseColor).brighterColor(.5))})',
             'a=new _l(s,{stroke:"#789084",fill:new Id(0,0,120,0).addColorStop(0,"#8ea38a").addColorStop(1,"#e7eddf")})'),
            ('o=new _l(a,{stroke:"black",fill:new Id(0,0,120,0).addColorStop(0,ol.toColor(i.baseColor).brighterColor(.5)).addColorStop(1,ol.toColor(i.baseColor).darkerColor(.5))})',
             'o=new _l(a,{stroke:"#789084",fill:new Id(0,0,120,0).addColorStop(0,"#fffdf4").addColorStop(1,"#c7d8bb")})'),
            # Container wall, lid and inset frame only. These fills do not
            # encode temperature, substance, pressure or particle properties.
            ('a.addChild(new _l(c,{lineWidth:1,stroke:"#444444",',
             'a.addChild(new _l(c,{lineWidth:1,stroke:"#789084",'),
            ('f=new _l(c,{fill:"rgba( 126, 126, 126, 0.8 )",',
             'f=new _l(c,{fill:"rgba( 142, 163, 138, 0.8 )",'),
            ('y=new _l(g,{lineWidth:1,stroke:"#888888",fill:"rgba( 200, 200, 200, 0.5 )",',
             'y=new _l(g,{lineWidth:1,stroke:"#789084",fill:"rgba( 231, 237, 223, 0.7 )",'),
            ('C=new nx({scale:.28,attachmentFill:"black",gripLineWidth:4,',
             'C=new nx({scale:.28,attachmentFill:"#315d4b",gripLineWidth:4,'),
            ('new Id(0,0,l,0).addColorStop(0,"#6D6D6D").addColorStop(.1,"#8B8B8B").addColorStop(.2,"#AEAFAF").addColorStop(.4,"#BABABA").addColorStop(.7,"#A3A4A4").addColorStop(.75,"#8E8E8E").addColorStop(.8,"#737373").addColorStop(.9,"#646565")',
             'new Id(0,0,l,0).addColorStop(0,"#91a98d").addColorStop(.1,"#b5c9a9").addColorStop(.2,"#d6e4c7").addColorStop(.4,"#edf2e6").addColorStop(.7,"#d6e4c7").addColorStop(.75,"#c0d2b3").addColorStop(.8,"#a2bc98").addColorStop(.9,"#789b7c")'),
            ('new Id(0,0,0,I).addColorStop(0,"#525252").addColorStop(.3,"#515151").addColorStop(.4,"#4E4E4E").addColorStop(.5,"#424242").addColorStop(.6,"#353535").addColorStop(.7,"#2a2a2a").addColorStop(.8,"#292929")',
             'new Id(0,0,0,I).addColorStop(0,"#789084").addColorStop(.3,"#789084").addColorStop(.4,"#708a79").addColorStop(.5,"#678372").addColorStop(.6,"#5a7866").addColorStop(.7,"#4c6a59").addColorStop(.8,"#42614f")'),
            ('new Id(0,0,0,I).addColorStop(0,"#8A8A8A").addColorStop(.2,"#747474").addColorStop(.3,"#525252").addColorStop(.6,"#8A8A8A").addColorStop(.9,"#A2A2A2").addColorStop(.95,"#616161")',
             'new Id(0,0,0,I).addColorStop(0,"#adc3a2").addColorStop(.2,"#8ea68a").addColorStop(.3,"#708a79").addColorStop(.6,"#adc3a2").addColorStop(.9,"#c7d8bb").addColorStop(.95,"#789084")'),
            ('new Id(0,0,k,0).addColorStop(0,"#2E2E2E").addColorStop(.2,"#323232").addColorStop(.3,"#363636").addColorStop(.4,"#3E3E3E").addColorStop(.5,"#4B4B4B").addColorStop(.9,"#525252")',
             'new Id(0,0,k,0).addColorStop(0,"#42614f").addColorStop(.2,"#4c6a59").addColorStop(.3,"#53715f").addColorStop(.4,"#5a7866").addColorStop(.5,"#678372").addColorStop(.9,"#789084")'),
            ('new Id(0,0,k,0).addColorStop(0,"#5D5D5D").addColorStop(.2,"#717171").addColorStop(.3,"#7C7C7C").addColorStop(.4,"#8D8D8D").addColorStop(.5,"#9E9E9E").addColorStop(.5,"#A2A2A2").addColorStop(.9,"#A3A3A3")',
             'new Id(0,0,k,0).addColorStop(0,"#789084").addColorStop(.2,"#91aa88").addColorStop(.3,"#9eb794").addColorStop(.4,"#b0c7a3").addColorStop(.5,"#c7d8bb").addColorStop(.5,"#d0dfc3").addColorStop(.9,"#d6e4c7")'),
        ]
        # Selected-state color is UI feedback, separate from hot/cold colors.
        for state in ('SOLID', 'LIQUID', 'GAS'):
            edits.append((f'baseColor=e===LC.{state}?"#a5a7ff":"#F8D980"',
                          f'baseColor=e===LC.{state}?"#b3d39c":"#faf0d5"'))

    elif sim == 'build-a-molecule':
        # CollectionBoxNode starts with no molecules; its black rectangle is
        # only the receiving-slot background. Preserve the moleculeLayer,
        # quantity observer, collection highlighting and 3D button visibility.
        edits += [
            ('N.blackBox=new Rr(0,0,160,50,{fill:to.BLACK,lineWidth:4})',
             'N.blackBox=new Rr(0,0,160,50,{fill:"#e7eddf",lineWidth:4})'),
            ('this.blackBox.stroke=JE.MOLECULE_COLLECTION_BACKGROUND',
             'this.blackBox.stroke="#a6b89b"'),
            ('H.blackBox.stroke=C?JE.MOLECULE_COLLECTION_BOX_BORDER_BLINK:JE.MOLECULE_COLLECTION_BACKGROUND',
             'H.blackBox.stroke=C?JE.MOLECULE_COLLECTION_BOX_BORDER_BLINK:"#a6b89b"'),
            ('MOLECULE_COLLECTION_BOX_HIGHLIGHT:to.YELLOW,MOLECULE_COLLECTION_BOX_BORDER_BLINK:to.BLUE,',
             'MOLECULE_COLLECTION_BOX_HIGHLIGHT:new to("#efc66b"),MOLECULE_COLLECTION_BOX_BORDER_BLINK:new to("#315d4b"),'),
            ('KIT_ARROW_BACKGROUND_ENABLED:to.YELLOW,KIT_ARROW_BORDER_ENABLED:to.BLACK,',
             'KIT_ARROW_BACKGROUND_ENABLED:new to("#efc66b"),KIT_ARROW_BORDER_ENABLED:new to("#315d4b"),'),
            ('o=(0,t.Z)({cornerRadius:JE.CORNER_RADIUS},o);var a=new vs({spacing:8});',
             'o=(0,t.Z)({cornerRadius:JE.CORNER_RADIUS,fill:JE.MOLECULE_COLLECTION_BACKGROUND,stroke:"#a6b89b"},o);var a=new vs({spacing:8});'),
            ('N.cueNode=new Vx(10,0,34,0,{fill:"blue",stroke:"black",',
             'N.cueNode=new Vx(10,0,34,0,{fill:"#efc66b",stroke:"#315d4b",'),
            ('centerX:O.kitCarousel.centerX,pageFill:to.WHITE,pageStroke:to.BLACK,interactive:!0,',
             'centerX:O.kitCarousel.centerX,pageFill:"#fffef9",pageStroke:"#8ea38a",currentPageFill:"#315d4b",interactive:!0,'),
        ]
        # The pinned zh_CN dictionary left these five display translations in
        # English. Scope the replacement to this locale's JSON object; never
        # alter complete-molecule commonName/formula/CID records or other locales.
        locale_marker = '"zh_CN":{"BUILD_A_MOLECULE/title.multiple":'
        if text.count(locale_marker) != 1:
            raise ValueError(f'{sim}: expected one reviewed Simplified Chinese dictionary')
        start = text.index(locale_marker) + len('"zh_CN":')
        locale, length = json.JSONDecoder().raw_decode(text[start:])
        old_locale = text[start:start + length]
        new_locale = old_locale
        for key, english, chinese in [
            ('water', 'water', '水'),
            ('molecularOxygen', 'molecular oxygen', '氧气'),
            ('molecularHydrogen', 'molecular hydrogen', '氢气'),
            ('carbonDioxide', 'carbon dioxide', '二氧化碳'),
            ('molecularNitrogen', 'molecular nitrogen', '氮气'),
        ]:
            name = 'BUILD_A_MOLECULE/' + key
            expected = '\u202a' + english + '\u202c'
            if locale.get(name) != expected:
                raise ValueError(f'{sim}: reviewed zh_CN translation changed: {name}')
            old_entry = json.dumps(name) + ':' + json.dumps(expected, ensure_ascii=False)
            new_entry = json.dumps(name) + ':' + json.dumps('\u202a' + chinese + '\u202c', ensure_ascii=False)
            if new_locale.count(old_entry) != 1:
                raise ValueError(f'{sim}: ambiguous zh_CN display name: {name}')
            new_locale = new_locale.replace(old_entry, new_entry)
        translations.append((old_locale, new_locale))

    # Validate the whole scoped allowlist before making any changes. The
    # caller's patch records offsets/hashes and independently checks the count.
    for old, _ in edits + translations:
        count = text.count(old)
        if count != 1:
            raise ValueError(f'{sim}: workbench view literal count {count}, expected 1: {old[:100]}')
    for old, new in edits:
        patch(old, new, expected_count=1, kind='presentation')
    for old, new in translations:
        patch(old, new, expected_count=1, kind='translation')
