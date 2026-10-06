/* Read existing BAM collection goals. Never build molecules, fill boxes, or consume RNG. */
(() => {
 'use strict';
 const SIM_ID='build-a-molecule';
 const FAMILIES=[SIM_ID+'/single-molecule/collection',SIM_ID+'/multiple-molecules/collection'];
 const NAMES={280:'二氧化碳',962:'水',947:'氮气',281:'一氧化碳',977:'氧气',783:'氢气',222:'氨',24526:'氯气',145068:'一氧化氮',6326:'乙炔',6331:'硼烷',6356:'三氟化硼',6327:'氯甲烷',6325:'乙烯',24524:'氟气',11638:'氟甲烷',712:'甲醛',768:'氰化氢',784:'过氧化氢',402:'硫化氢',297:'甲烷',948:'一氧化二氮',24823:'臭氧',24404:'磷化氢',23953:'硅烷',1119:'二氧化硫'};
 const ELEMENTS={H:'氢',O:'氧',C:'碳',N:'氮',Cl:'氯',B:'硼',F:'氟',S:'硫',P:'磷',Si:'硅'};
 const require=(ok,message)=>{if(!ok)throw Error('Molecule question learning: '+message);};
 const value=p=>p?.value;
 const integer=(n,label,min=0)=>{require(Number.isInteger(n)&&n>=min,label+' is invalid');return n;};
 function referenceData(molecule){
  require(molecule&&Array.isArray(molecule.atoms)&&Array.isArray(molecule.bonds),'native reference graph absent');
  const atoms=molecule.atoms.map((atom,index)=>{const symbol=atom.element?.symbol||atom.symbol;require(ELEMENTS[symbol],'unsupported native atom '+symbol);return {index:index+1,symbol};});
  const counts={};for(const atom of atoms)counts[atom.symbol]=(counts[atom.symbol]||0)+1;
  const bonds=molecule.bonds.map(bond=>{const a=molecule.atoms.indexOf(bond.a)+1,b=molecule.atoms.indexOf(bond.b)+1;require(a>0&&b>0&&a!==b,'native bond endpoint absent');return {a,b,order:integer(bond.order,'bond order',1)};});
  const cid=integer(molecule.cid,'reference cid',1),formula=typeof molecule.getGeneralFormula==='function'?molecule.getGeneralFormula():molecule.molecularFormula;
  require(atoms.length>0&&typeof formula==='string'&&formula,'reference formula absent');
  return {cid,name:NAMES[cid]||molecule.commonName,formula,sourceFormula:molecule.molecularFormula,atoms,counts,bonds,atomCount:atoms.length,bondCount:bonds.length};
 }
 const countText=(counts,multiplier=1)=>Object.entries(counts).map(([symbol,n])=>`${n*multiplier}个${ELEMENTS[symbol]}原子（${symbol}）`).join('、');
 const structureText=reference=>reference.bonds.map(bond=>{const a=reference.atoms[bond.a-1],b=reference.atoms[bond.b-1];return `${a.symbol}${a.index}—${b.symbol}${b.index}`;}).join('，');
 function read(sim,helpers){
  if(!sim||value(sim.showHomeScreenProperty)===true)return null;
  const screens=sim.simScreens||sim.screens;if(!screens?.length)return null;
  const selected=value(sim.screenProperty)||value(sim.selectedScreenProperty),screen=selected?screens.indexOf(selected):value(sim.screenIndexProperty);
  if(screen!==0&&screen!==1)return null;
  const model=screens[screen].model||screens[screen]._model,collection=value(model?.currentCollectionProperty);
  if(!collection?.collectionBoxes?.length)return null;
  const boxes=collection.collectionBoxes.map((box,index)=>{const capacity=integer(box.capacity,'capacity',1),quantity=integer(value(box.quantityProperty),'quantity');require(quantity<=capacity,'native quantity exceeds capacity');const reference=referenceData(box.moleculeType);return {index:index+1,goalId:SIM_ID+'/'+(screen===0?'single-molecule':'multiple-molecules')+'/cid-'+reference.cid+'/capacity-'+capacity,capacity,quantity,remaining:capacity-quantity,reference};});
  const mode=screen===0?'single-molecule':'multiple-molecules',family=mode+'/collection',familyId=SIM_ID+'/'+family;
  const contextId=SIM_ID+'/'+mode,id=contextId+'/collection-'+helpers.identify(collection);
  const total=boxes.reduce((sum,b)=>sum+b.capacity,0),collected=boxes.reduce((sum,b)=>sum+b.quantity,0),remaining=total-collected;
  const params={collectionIndex:model.currentIndex,boxes,total,collected,remaining,complete:!!value(collection.allCollectionBoxesFilledProperty)};
  const goals=boxes.map(b=>`第${b.index}框${b.reference.name}（${b.reference.formula}）${b.quantity}/${b.capacity}`).join('；');
  const first=boxes.find(b=>b.remaining)||boxes[0],r=first.reference,firstLabel=`第${first.index}框${r.name}（${r.formula}）`;
  const intent=`${remaining?`本轮收集${boxes.length}种分子，共${total}个；已经收集${collected}个，还差${remaining}个。`:`本轮${total}个目标分子已收集齐。`}${goals}。每框都要有正确的原子种类、数量和连接。`;
  const hints=[
   `${firstLabel}每个分子需要${countText(r.counts)}。先看化学式下标，数的是一个分子里的原子。`,
   first.remaining?`这框目标${first.capacity}个，已经收集${first.quantity}个，所以还要搭${first.capacity}−${first.quantity}=${first.remaining}个；剩余需要${countText(r.counts,first.remaining)}。`:`这框已达到${first.capacity}/${first.capacity}，可以核对每种原子的数量与结构，再检查其余收集框。`,
   `${firstLabel}的连接参考：${structureText(r)}。编号只用于本题说明，例如${r.atoms[0].symbol}1是第1个原子；平移或转动整个分子不改变连接。`,
   '先把原子靠近搭成一个完整分子，核对名称和连接，再拖入对应收集框。一个搭好并收集后再搭下一个；当前工具组没有所需原子时，用工具组箭头切换。'
  ];
  const steps=[];
  for(const box of boxes){
   const ref=box.reference,label=`第${box.index}框${ref.name}（${ref.formula}）`;
   steps.push(`${label}：每个分子有${countText(ref.counts)}，合计${ref.atomCount}个原子。目标${box.capacity}个，全部需要${countText(ref.counts,box.capacity)}；已收集${box.quantity}个，还差${box.remaining}个。`);
   steps.push(`这一个分子的原子编号：${ref.atoms.map(a=>a.symbol+a.index).join('、')}。连接${ref.bondCount}对原子：${structureText(ref)}。先接中心或主链原子，再按这些相邻关系接上其余原子。编号相同种类的原子可以互换，连接的种类与关系要一致。`);
   if(ref.bonds.some(b=>b.order>1))steps.push(`高年级看参考结构中的一种键级表示：${ref.bonds.filter(b=>b.order>1).map(b=>ref.atoms[b.a-1].symbol+b.a+'与'+ref.atoms[b.b-1].symbol+b.b+'之间画作'+(b.order===2?'双键':'三键')).join('；')}。这表示同一对原子间的键，不是增加原子数，也不是完整的电子结构描述。这里的简化2D拼接只操作原子相邻关系，不能手动编辑单双或三键；原版收集判断比较元素与连接拓扑，不单独判断键级。`);
   if(ref.cid===24823)steps.push('臭氧O₃存在共振，真实分子的两个O—O键等效。一单一双只是参考结构的一种表示，不是固定一边单键、一边双键，也不是在两张图之间来回切换。本模拟的3D图也做了简化，不能据此判断两段真实键长不同。');
   if(ref.cid===948)steps.push('N₂O存在共振，参考图采用一种主要的路易斯结构表示，不能由一张整数键级图完整解释成键；N—N与N—O是不同的键，不能据“共振”就说它们等效。');
   if(ref.cid===1119)steps.push('SO₂的真实成键涉及电子离域，可用共振结构帮助理解。参考图的整数键级是一种简化表示，不能用一张图完整概括真实成键。');
   steps.push(box.remaining?`按上述数量与相邻关系搭一个${ref.name}，确认名称后放入第${box.index}框；再重复至${box.capacity}/${box.capacity}。从当前进度起要再用${countText(ref.counts,box.remaining)}，不能只把原子堆在一起。`:`这框已满${box.quantity}/${box.capacity}，不用继续投放。清空该框后，所需数量会重新变为${box.capacity}个。`);
  }
  steps.push(`完成检查：${boxes.length}个框分别达到目标份数，共${total}个分子。原版按原子种类与连接结构接收分子，并在所有框满时显示完成；本题说明只读取这个结果。`);
  const commonMistakes=[
   `${r.formula}的下标描述一个分子内的原子；第${first.index}框目标${first.capacity}个分子，要把每个分子的原子数再乘${first.capacity}，不能把下标当收集个数。`,
   '只有化学式和原子总数相同，不保证是同一种分子；连接结构也要与目标一致。没有连在一起的零散原子不能当一个完整分子收集。',
   `第${first.index}框已有${first.quantity}/${first.capacity}，当前只需再收集${first.remaining}个；不要把已收集的原子再次算成桶里的可用原子。`,
   '整个分子旋转或平移后仍可相同；要比较哪些原子相邻，而不是要求画面朝向完全一样。'
  ];
  return {id,contextId,familyId,simId:SIM_ID,screen,level:null,mode,family,fingerprint:helpers.fingerprint(JSON.stringify([id,params])),params,intent,hints,steps,commonMistakes};
 }
 require(globalThis.MathPhysicsPhetQuestions?.registerReader,'base question registry must load first');
 globalThis.MathPhysicsPhetQuestions.registerReader(SIM_ID,read,{families:FAMILIES});
 globalThis.MathPhysicsMoleculeQuestions={read,referenceData,FAMILIES};
})();
