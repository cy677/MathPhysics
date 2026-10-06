# 基础候选独立中文内容审核冻结结果

实际审核全部617条：ASDiv A 212、ASDiv B 212、SVAMP 193。逐条阅读中文题面、答案、完整儿童步骤及已有改编说明，独立建立数学关系并重算；全部617条也已实际对照原英文body/question。未使用原公式/答案作为独立推导证明。

原输入状态：assistant-confirmed 574；needs-correction 43；quarantine 0。needs-correction须按逐条fixes修订新副本并重新核对后才能提升状态；不能将原输入直接当作通过。所有条目humanApproved=false。

inputSha256严格对应原UTF-8 JSONL整行字节，不含LF/CRLF行结束符；617条逐行输入hash、617条中文prompt hash、617条来源记录canonical hash全部复核一致，无缺号、重复或额外条目。

foundation-recommended-content.jsonl提供全部617条推荐内容文本及canonical SHA256。投影只含id、prompt、answer、intent、hints、steps、commonMistakes、prerequisites、adaptation九字段；排序键、紧凑JSON、ensure_ascii=false、UTF-8、无末尾换行。review、independentModel和运行时分类不纳入内容投影。全部推荐答案与逐条独立答案相等，包含分数、比、时刻、选项和多项标签答案。

六条本地A16分类建议：asdiv:nluds-0162、asdiv:nluds-0795、asdiv:nluds-0803、asdiv:nluds-0811、asdiv:nluds-1086、asdiv:nluds-0155。保留上游分类来源，另加localCategoryOverride，按面值/容量约束比较最少方案。

主要修订包含：现实单位/价格尺度明确化；问分钟与小时双所求但单答案的修正；最少硬币证明补全；猫类别交叠；周期和时间起点补明；完整作答、全部用完、平均分、精确费用等条件的来源补义记录；SVAMP人物/物品/量义改编及学年结束误译修正。所有具体字段替换和独立依据见逐条JSONL。

审核范围限制：全617题面、答案、完整steps、adaptation及英文原题已读；hints/commonMistakes仅第一110条全读以及发现问题时选读，不能把本次结果宣称为全617全部辅助字段的独立教学审核。未开展儿童可用性试教、年级适配或教师批准。算式脚本只复核手工建立的关系和精确分数；程序通过不等于人工教学批准。

## 原输入需要修订的43条

- asdiv:nluds-0270：prompt, adaptation；推荐内容SHA256 `e11ccfe8220853ccf719f4d06688e7e27a17e77f76899a9cb519cf60d6add4b4`。
- asdiv:nluds-0162：steps, localCategoryOverride；推荐内容SHA256 `023cc1975235e7cf31f38dc12fc802551628f95917cdfc90cf3c1c71a492b9ab`。
- asdiv:nluds-1994：prompt, adaptation；推荐内容SHA256 `a066102a7571490166280d683cb1cd147ae066e162d57ed210bfdcdcdbc7c3ed`。
- asdiv:nluds-1419：prompt, adaptation；推荐内容SHA256 `8ba0fa9e91491569437a03ccd9fde892cf843c871c4e51b105d17c811f296e6d`。
- asdiv:nluds-0467：adaptation；推荐内容SHA256 `eca5f4aa1beb8c33fcacae9a1e50721fec3681c61387cf80e576773a098d1be6`。
- asdiv:nluds-0482：adaptation；推荐内容SHA256 `21c6f7f7ee4a484427151e2f0f50f735badd68cba2b5ad890689d3bba5e49a82`。
- asdiv:nluds-0486：adaptation；推荐内容SHA256 `de8d223674e4921c007d5c49e03d4cf74ddcaa8d7d4d7b7c0c9c8a01cbe74b75`。
- asdiv:nluds-0795：prompt, steps, hints, commonMistakes, adaptation, localCategoryOverride；推荐内容SHA256 `f260488635c79f09380c16716b3cb18d3d39a131054cf04d85afaab66f4a31a6`。
- asdiv:nluds-0832：prompt, steps, adaptation；推荐内容SHA256 `db2a92c3fb6d45f010c0029bb1a5ec227c6a306978da4590c392dc79111bea0c`。
- asdiv:nluds-0151：prompt, answer, hints, steps, commonMistakes, prerequisites, adaptation；推荐内容SHA256 `c03813b11799e48556e9baffafa6ab36e44faa746a77fb28d569db004cd7f911`。
- asdiv:nluds-1794：prompt, answer, hints, steps, commonMistakes, adaptation；推荐内容SHA256 `5efcb791162a150c6081da1ce9745f9b596669422c3da2b7ba537e5ddc5361ba`。
- asdiv:nluds-0395：prompt, answer, hints, steps, commonMistakes, adaptation；推荐内容SHA256 `6b5084acd17c7483cf2f8d9ee24a950525faa484b988fc1c0253da2390174579`。
- asdiv:nluds-0985：prompt, answer, hints, steps, commonMistakes, prerequisites, adaptation；推荐内容SHA256 `bb6cddb97f2a5da24e9b0f09c81f8d3d892a95c21a6def79bacd9ab2520fec90`。
- asdiv:nluds-0629：prompt, answer, steps, commonMistakes, prerequisites, adaptation；推荐内容SHA256 `962d3ef8b54f6b441aa729f0740ab0128878f383903724678dfb658f830962a1`。
- asdiv:nluds-0901：prompt, answer, steps, commonMistakes, prerequisites, adaptation；推荐内容SHA256 `ff12083a4d65aed23d3741ac771ae905ee044a09b17a192e1b3fb6bd1c44980e`。
- asdiv:nluds-1480：prompt, adaptation；推荐内容SHA256 `e1233617a80f94ea00d274b77aaa3e816301f9eb04d2a89caf93d88f850d3b09`。
- asdiv:nluds-0360：adaptation；推荐内容SHA256 `dea72ea32717f3b1e462a65f76e332abe72116e1f802f01749da8846d2e17c43`。
- asdiv:nluds-0659：prompt, answer, steps, adaptation；推荐内容SHA256 `43b2196e12ee3465fe6199bb11ae735a54e6703aec6222015c5c4e7fdca10d5d`。
- asdiv:nluds-1151：adaptation；推荐内容SHA256 `fd5a4fe06ff643d7245b9338bb4cb3064c8f67efd44ebe79624e23afc3854351`。
- asdiv:nluds-1160：prompt, answer, steps, adaptation；推荐内容SHA256 `232acbb7540c641b3ce8150a8a4f73c706ee39f3466bc11e9224dd2e7102d83d`。
- asdiv:nluds-1112：prompt, adaptation；推荐内容SHA256 `4a3ee83344198a2f8e27f3403794b0773ea64ea01eed966c54f5deded3f800ca`。
- asdiv:nluds-1224：prompt, adaptation；推荐内容SHA256 `cd6545462d5690bcbb947f352047659942c54eb9d7e6b9fb1116c8f82fbf006e`。
- asdiv:nluds-2049：prompt, adaptation；推荐内容SHA256 `ba219ee5a3934163153eb7c8ab61f8f07b49548f9420a9d39cee357ddf4d97c1`。
- asdiv:nluds-2087：prompt, steps, hints, commonMistakes, adaptation；推荐内容SHA256 `75647b0b7b0a61ce1ed9663e2dd0b7c5b700848ef7ed6dece77d84d298d06a4b`。
- asdiv:nluds-2035：prompt, adaptation；推荐内容SHA256 `f169de2aac8572e30c6f545d5ee400e51293ce76002a71a1a2465b639e7bf31d`。
- asdiv:nluds-0190：prompt, adaptation；推荐内容SHA256 `1a5e38028cd474f4b9ebf7e8a42d33f6c82b94cf9898240d7aba15c15106d4fe`。
- svamp:chal-597：adaptation；推荐内容SHA256 `c639ad3164a02e57ba2b33243bf2fbcaa783b4c4e483b161d160c598ed5f0693`。
- svamp:chal-856：adaptation；推荐内容SHA256 `65348bda48d626b906d54b3bcf12e4c074d8f4257a61476b2b41cdf593481ea6`。
- svamp:chal-627：adaptation；推荐内容SHA256 `0041de47560afb93f2538779f31177c32e202c1aa46ed06aed6e6a64facb948f`。
- svamp:chal-409：adaptation；推荐内容SHA256 `4e72db8023c3e69f696c84d0d7f1d05b8a64e62c36654e4caa500e8c2704629f`。
- svamp:chal-830：adaptation；推荐内容SHA256 `41527ec0ee39c1d693cefc7ce0cd1cf72b399f32908accfb9a7bf1691ebe5110`。
- svamp:chal-893：adaptation；推荐内容SHA256 `a61316ad271ecbd3c9f71a1e960e5be41eaa42e6cabc7519e0004c74287d293d`。
- svamp:chal-982：adaptation；推荐内容SHA256 `adf66aa1c1144db58e18a816c156ef7a1979c180d4d826b76b22c73b4c5b5deb`。
- svamp:chal-141：adaptation；推荐内容SHA256 `636b73bc378f275fa3e867466ad6e5499b50dd31a18170faae045fb3315570b7`。
- svamp:chal-180：adaptation；推荐内容SHA256 `cb74e47a52d851d1ca5904753e2de4ac14e6d266d8cf0854ab9693d868d3a3b3`。
- svamp:chal-20：prompt；推荐内容SHA256 `ee77db8d1acc5766240486796963ec124ca456188babcda1a5995ac4d2073e3e`。
- svamp:chal-223：adaptation；推荐内容SHA256 `3fa2cd5135b6366bba0fb14dba83e0e26a98a8b4766d716a67ecf6bf279f37ea`。
- svamp:chal-341：adaptation；推荐内容SHA256 `383cea49be46d18b6aac8bf44399f54b3233672c73765cf971a02c697ab86e60`。
- svamp:chal-345：adaptation；推荐内容SHA256 `eafacf2823b6cef1c887f7fe19082021833fd135ae7f8d04febe78e4d8a3c385`。
- svamp:chal-384：prompt；推荐内容SHA256 `116722bbff7a460d17fa778d53eebd17bbd6c9428412f6686031a2853bdce2cc`。
- svamp:chal-602：prompt, steps, hints, adaptation；推荐内容SHA256 `c21483a6dffe572bcba9df226da7df8359c376c5976fd968e6fcb3aea8b97ffa`。
- svamp:chal-489：prompt, steps, hints, adaptation；推荐内容SHA256 `ca9ac75ade959c3c24140d865d4a0fada64566e660dd0bf93d6f79ffbe96ae99`。
- svamp:chal-911：prompt, adaptation；推荐内容SHA256 `afc6a8787bda55aac9d0004b1c80cfa2520a5a040955b51b4cf1ee8eec3625eb`。

证据已冻结；此后额外发现须另存补充文件，避免改变交付快照。原始content-work、项目源和draft均未写入。
