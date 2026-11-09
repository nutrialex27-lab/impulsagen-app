import {formatTime,solveTiming} from './engine.js';
import {CHANNELS,proposeChannels,sequenceGroups} from './metabolic.js';
import {stimulationReference} from './stimulation.js';
import {EMPHASES,PROFILES} from './profiles.js';
import {
  HYPERTROPHY_GROUPS,hypertrophyMuscleProposal,hypertrophyStimulation,
  isHypertrophyPlan,isHypertrophyWork
} from './hypertrophy.js';

const range=([min,max])=>min===max?String(min):`${min}-${max}`;
const join=parts=>parts.filter(Boolean).join('  ·  ');
const count=(n,singular,plural)=>`${n} ${n===1?singular:plural}`;

function channelTable(block,database,profile,emphasis,hypertrophy){
  if(!hypertrophy){
    const {values}=proposeChannels(block,database,profile,emphasis);
    return {columns:CHANNELS,rows:[{label:'Referencia %',values:values.map(v=>v??'—')}]};
  }
  const {percentages,sensations}=hypertrophyMuscleProposal(block,database);
  const work=isHypertrophyWork(block);
  const indices=HYPERTROPHY_GROUPS.map((_,i)=>i).filter(i=>(work&&i<CHANNELS.length)||percentages[i]>0);
  if(!indices.length)return null;
  const rows=[{label:'Énfasis %',values:indices.map(i=>percentages[i])}];
  if(work)rows.push({label:'EMS /10',values:indices.map(i=>sensations[i]?.replace(/–/g,'-')??'—')});
  return {columns:indices.map(i=>HYPERTROPHY_GROUPS[i]),rows};
}

export function routineSheet(plan){
  const {blocks,database,profile='sin-definir',emphasis='equilibrado'}=plan;
  const hypertrophy=isHypertrophyPlan(plan);
  const exercises=new Map(database.map(exercise=>[exercise.id,exercise.name]));
  return {
    title:plan.title.trim()||'Rutina EMS',
    summary:join([
      hypertrophy?'Hipertrofia EMS':'EMS metabólico',
      profile!=='sin-definir'&&PROFILES[profile],
      EMPHASES[emphasis],
      `${formatTime(blocks.reduce((seconds,block)=>seconds+block.targetSeconds,0))} min`
    ]),
    blocks:blocks.map((block,index)=>{
      const timing=solveTiming(block);
      if(timing.error)throw new Error(timing.error);
      const {on,off,rounds,cycles,buffer,extraRest}=timing;
      const voluntary=block.timingPolicy==='no-ems';
      const continuous=!voluntary&&block.phase==='recovery';
      const {hz,ems,rpe}=hypertrophy?hypertrophyStimulation(block):stimulationReference(block.phase,profile);
      const intervals=voluntary?'Sin EMS':join([
        `${hz} Hz`,continuous?`Continuo · ${on} s por intervalo`:`ON ${on} s`,`OFF ${off} s`,
        hypertrophy?count(rounds,'serie','series'):count(rounds,'vuelta','vueltas'),
        !hypertrophy&&count(cycles,'intervalo','intervalos')
      ]);
      const rest=join([
        hypertrophy&&!voluntary&&rounds>1&&`Entre series ${block.restSeconds} s`,
        extraRest>0&&rounds>1&&`Pausa manual ${extraRest} s tras el OFF`,
        buffer>0&&`Pausa final sin EMS ${formatTime(buffer)}`
      ]);
      const groups=sequenceGroups(block);
      const order=!hypertrophy&&groups.length>1&&rounds>1
        ? join([block.sequence==='pairs'?'Parejas':'Minibloques',...groups.map(group=>`(${group.join('-')}) × ${rounds}`)])
        : '';
      const maxRpe=block.phase==='metabolic'&&profile!=='principiante'?' máx.':'';
      const effort=join([!voluntary&&`Sensación EMS ${range(ems)}/10`,`RPE físico ${range(rpe)}/10${maxRpe}`]);
      return {
        heading:`${String(index+1).padStart(2,'0')}   ${block.name}`,
        duration:formatTime(timing.total),
        intervals,effort,rest,order,
        exercises:block.slots.map(slot=>exercises.get(slot.exerciseId)),
        channels:channelTable(block,database,profile,emphasis,hypertrophy)
      };
    })
  };
}

function wrap(text,font,size,width,supported){
  // Standard PDF fonts preserve Latin text. Decompose unsupported accents and
  // replace unsupported symbols so custom titles never prevent a download.
  const clean=[...text.normalize('NFC')].map(char=>{
    if(/\s/u.test(char))return ' ';
    if(supported.has(char.codePointAt(0)))return char;
    const base=char.normalize('NFKD').replace(/\p{M}/gu,'');
    return base&&[...base].every(c=>supported.has(c.codePointAt(0)))?base:'?';
  }).join('').trim();
  const fits=value=>font.widthOfTextAtSize(value,size)<=width;
  const lines=[];
  let line='';
  for(const word of clean.split(/ +/)){
    const combined=line?`${line} ${word}`:word;
    if(fits(combined)){
      line=combined;
      continue;
    }
    if(line)lines.push(line);
    line='';
    for(const char of word){
      if(!fits(line+char)){
        lines.push(line);
        line='';
      }
      line+=char;
    }
  }
  if(line)lines.push(line);
  return lines;
}

export async function renderRoutinePdf(sheet){
  const {PDFDocument,PageSizes,StandardFonts,rgb}=await import('./pdf-lib.esm.min.js');
  const pdf=await PDFDocument.create();
  pdf.setTitle(sheet.title);
  pdf.setAuthor('ImpulsaFit');
  pdf.setLanguage('es');
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const supported=new Set(regular.getCharacterSet());
  const ink=rgb(.07,.15,.17),muted=rgb(.26,.34,.36),accent=rgb(.01,.36,.38);
  const soft=rgb(.91,.97,.97),lineColor=rgb(.82,.88,.88);
  const [width,height]=PageSizes.A4;
  const margin=35,contentWidth=width-margin*2,bodyWidth=contentWidth-20,bottom=43;
  let page,y;
  function draw(value,x,top,{font=regular,size=10,color=ink}={}){
    page.drawText(String(value),{x,y:top-size,font,size,color});
  }
  function textRows(value,{font=regular,size=10,color=ink,x=margin+10,maxWidth=bodyWidth}={}){
    return wrap(value,font,size,maxWidth,supported).map(line=>({
      height:size+4,draw:top=>draw(line,x,top,{font,size,color})
    }));
  }
  function paint(row){
    row.draw(y);
    y-=row.height;
  }
  function newPage(){
    page=pdf.addPage(PageSizes.A4);
    y=height-margin;
    draw('IMPULSAFIT  /  FICHA WIEMSPRO',margin,y,{font:bold,size:9,color:accent});
    y-=17;
    textRows(sheet.title,{font:bold,size:18,x:margin,maxWidth:contentWidth}).forEach(paint);
    draw(sheet.summary,margin,y,{size:10});
    draw('Rampa y pulso · programa individual',margin,y-15,{size:9,color:muted});
    y-=34;
  }
  function headingRow(block,continued=false){
    const heading=block.heading+(continued?' (cont.)':'');
    const lines=wrap(heading,bold,12,bodyWidth-60,supported);
    const rowHeight=lines.length*15+12;
    return {height:rowHeight+6,draw:top=>{
      page.drawRectangle({x:margin,y:top-rowHeight,width:contentWidth,height:rowHeight,color:soft});
      lines.forEach((line,i)=>draw(line,margin+10,top-6-i*15,{font:bold,size:12}));
      const size=11;
      draw(block.duration,width-margin-10-bold.widthOfTextAtSize(block.duration,size),top-6,{font:bold,size,color:accent});
    }};
  }
  function tableRow({columns,rows}){
    const rowHeight=14,labelWidth=78,labelSize=7.6,x=margin+10;
    const widths=columns.map(label=>bold.widthOfTextAtSize(label,labelSize));
    const gap=(bodyWidth-labelWidth-widths.reduce((sum,w)=>sum+w,0))/columns.length;
    let next=x+labelWidth;
    const positions=widths.map(width=>{
      const position=next;
      next+=width+gap;
      return position;
    });
    return {height:(rows.length+1)*rowHeight+6,draw:top=>{
      columns.forEach((label,i)=>draw(label,positions[i],top,{font:bold,size:labelSize,color:muted}));
      page.drawLine({start:{x,y:top-rowHeight+2},end:{x:x+bodyWidth,y:top-rowHeight+2},thickness:.55,color:lineColor});
      rows.forEach(({label,values},i)=>{
        const rowTop=top-(i+1)*rowHeight;
        draw(label,x,rowTop,{font:bold,size:9});
        values.forEach((value,j)=>draw(value,positions[j],rowTop,{size:9}));
      });
    }};
  }
  newPage();
  const pageCapacity=y-bottom;
  for(const block of sheet.blocks){
    const heading=headingRow(block);
    const rows=[
      ...textRows(block.intervals,{font:bold}),
      ...[block.effort,block.rest,block.order].flatMap(value=>textRows(value,{size:9,color:muted})),
      ...block.exercises.flatMap((exercise,i)=>textRows(`${i+1}. ${exercise}`)),
      ...(block.channels?[tableRow(block.channels)]:[])
    ];
    const blockHeight=heading.height+rows.reduce((total,row)=>total+row.height,0);
    if(y-bottom<Math.min(blockHeight,pageCapacity))newPage();
    paint(heading);
    for(const row of rows){
      if(y-bottom<row.height){
        newPage();
        paint(headingRow(block,true));
      }
      paint(row);
    }
    y-=9;
  }
  const pages=pdf.getPages();
  pages.forEach((current,i)=>{
    page=current;
    draw(`${i+1} / ${pages.length}`,width-margin-25,29,{size:8,color:muted});
  });
  return pdf.save();
}
