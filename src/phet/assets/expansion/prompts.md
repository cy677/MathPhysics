# 扩展模块插画素材

生成方式：内置 `image_gen`。图片是科学小岛自己的显示素材，原 PhET 文件、品牌、科学数值和操作节点继续保留。

## balance-family-atlas.png

Use case: illustration-story. Asset type: one transparent production sprite atlas, exactly 4 columns by 2 rows. Reference image 1 is the existing Science Island character art style; reference image 2 is only a subject and pose reference for the balance experiment. Draw four friendly people in the same children's educational illustration style: clean warm outlines, soft painted shading, rounded faces, cream/forest/ochre/coral palette. Top row, left to right: schoolboy with blue shirt and tan shorts; schoolgirl with golden yellow shirt and forest shorts; father with glasses, sage polo and tan trousers; mother with coral top and forest trousers, slightly darker skin. All top-row figures stand with their feet together and hands at their sides. Bottom row repeats the same four identities in seated balance poses: body facing slightly left, knees bent toward the left, arms resting on knees, shoes at the lowest baseline; do not draw a seat. Full body, no cropping. Each cell contains one isolated figure, equal cells with clear transparent separation and padding, all figures share consistent scale within their pose row. Genuine transparent background; no ground, props, labels, numbers, borders, logos or watermark. Keep the silhouettes clear for small classroom sprites.

## balance-props-atlas.png

Use case: scientific-educational. Asset type: one transparent production sprite atlas, exactly 4 columns by 4 rows. Match the same clean warm children's educational illustration style as the character reference: warm outlines, matte materials, soft painted shading and forest/cream/ochre/coral colors. Draw one isolated upright object centered in each equally sized cell with transparent padding. Row 1: a red fire extinguisher with black hose and handle; a muted gray green metal trash can with closed lid; an upright wooden barrel; an upright wooden crate. Row 2: a coral red fire hydrant; terracotta flower pot with three yellow daisies; terracotta pot with tall green leaves; gray metal bucket with raised semicircular handle. Row 3: warm yellow metal bucket with raised handle; soft blue metal bucket with raised handle; rounded gray rock; old small television with two thin aerials. Row 4: friendly tan dog sitting upright facing slightly left; transparent plastic soda bottle with pale green cap; black rubber tire seen from the side as a low wide rounded tread shape; a light gray concrete block with two rectangular holes. Preserve the objects' unmistakable physical identity. Full objects, no cropping. Genuine transparent background with no floor, cast shadows, labels, text, numbers, brands, grid borders or watermark. Clear separation between cells for production slicing.

## 精确图形

分数蛋糕、接线部件、冷热图示、神秘礼物和实验菜单图由 `scripts/prepare_phet_expansion_assets.mjs` 生成 PNG：保留分片数、原画布尺寸、端点和科学对象的区分，使用统一配色、描边和浅色面板。人物与道具图集经同一脚本裁切，原始生成图继续保留供重建。
