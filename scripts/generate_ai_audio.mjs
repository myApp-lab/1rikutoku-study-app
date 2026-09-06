import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const DRY_RUN = process.env.DRY_RUN === '1';
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY && !DRY_RUN) throw new Error('OPENAI_API_KEY が設定されていません。');

const voice = (process.env.AI_VOICE || process.argv[2] || 'marin').trim();
const model = process.env.AI_TTS_MODEL || 'gpt-4o-mini-tts';
const repoRoot = process.cwd();
const outRoot = path.join(repoRoot, 'audio', 'ai', voice);

const jpChoiceNo = n => ({'1':'一番','2':'二番','3':'三番','4':'四番','5':'五番','１':'一番','２':'二番','３':'三番','４':'四番','５':'五番'})[String(n)] || `${n}番`;
const normalizeHeaderLetter = x => ({'Ａ':'A','Ｂ':'B','Ｃ':'C','Ｄ':'D','Ｅ':'E'})[x] || x;
function findCombinationTable(text){
 const re=/(?:^|\s)([Ａ-ＥA-E](?:\s+[Ａ-ＥA-E]){1,4})\s+([1-5１-５])\s+/g;
 let last=null,m; while((m=re.exec(text))!==null) last={index:m.index,header:m[1]}; if(!last)return null;
 const headers=last.header.trim().split(/\s+/).map(normalizeHeaderLetter);
 const prefix=text.slice(0,last.index).trim(); const tableStart=text.slice(last.index).trim();
 const hm=tableStart.match(/^([Ａ-ＥA-E](?:\s+[Ａ-ＥA-E]){1,4})\s+/); if(!hm)return null;
 const rest=tableStart.slice(hm[0].length); const rowRe=/(^|\s)([1-5１-５])\s+/g; const hits=[];
 while((m=rowRe.exec(rest))!==null) hits.push({start:m.index+(m[1]?m[1].length:0),no:m[2],bodyStart:rowRe.lastIndex});
 if(hits.length<2)return null; const rows=[];
 for(let i=0;i<hits.length;i++){ const end=i+1<hits.length?hits[i+1].start:rest.length; rows.push({no:hits[i].no,body:rest.slice(hits[i].bodyStart,end).trim()}); }
 return {prefix,headers,rows};
}
function speakCombinationRow(headers,row){
 const parts=row.body.split(/\s+/).filter(Boolean); let out=`${jpChoiceNo(row.no)}。 `;
 if(parts.length===headers.length) out += parts.map((v,i)=>`${headers[i]}は、${v}。`).join(' ');
 else out += parts.map(v=>`${v}。`).join(' '); return out;
}
function formatCombinationTableForSpeech(text){
 const table=findCombinationTable(text); if(!table)return null;
 return {prefix:table.prefix,tableSpeech:`${table.headers.map(h=>`${h}。`).join(' ')} ${table.rows.map(r=>speakCombinationRow(table.headers,r)).join(' ')}`,table};
}
function readAloudText(text){
 let t=text.replace(/＊([Ａ-ＺA-Z])＊/g,'$1の空欄').replace(/＊＊＊/g,'空欄').replace(/\*+/g,'空欄');
 const combo=formatCombinationTableForSpeech(t); if(combo)t=`${combo.prefix}。 ${combo.tableSpeech}`;
 t=t.replace(/(選択肢|番号|第)?([①②③④⑤])\s*/g,'$1$2。 ');
 t=t.replace(/選択肢([1-5])\s*/g,(_,n)=>`選択肢${jpChoiceNo(n)}。 `);
 t=t.replace(/(^|[。！？]\s+)([1-5１-５])\s+(?=\S)/g,(m,p,n)=>`${p}${jpChoiceNo(n)}。 `);
 return t.replace(/\s+/g,' ').trim();
}
function readAnswerChoiceForSpeech(q,num){
 const combo=formatCombinationTableForSpeech(q.text||'');
 if(combo){ const row=combo.table.rows.find(r=>String(r.no)===String(num)||jpChoiceNo(r.no)===jpChoiceNo(num)); if(row)return speakCombinationRow(combo.table.headers,row).replace(new RegExp(`^${jpChoiceNo(row.no)}。\\s*`),'').trim(); }
 const c=q.choices?.[num-1]||''; if(c.includes('　'))return c.split('　').map((x,i)=>`${String.fromCharCode(65+i)}は、${x}。`).join(' '); return c;
}
function questionText(q){ let t=readAloudText(`問題${q.no}。${q.text}。`); if(!q.imageOnly)(q.choices||[]).forEach((c,i)=>t+=` ${readAloudText(`選択肢${i+1}。${c}。`)}`); if(!q.audio)t=`この問題は図を見る必要があります。 ${t}`; return t; }
function answerText(q){ let a=q.imageOnly?`正解は、${q.answer}番です。`:`正解は、${q.answer}番です。 ${readAnswerChoiceForSpeech(q,q.answer)}`; return readAloudText(`${a}。 ${q.normal}。 ${q.exam}`); }
function responseText(q,n){ const ok=n===q.answer; const selected=q.imageOnly?'':`、${readAnswerChoiceForSpeech(q,n)}`; const correct=q.imageOnly?'':`、${readAnswerChoiceForSpeech(q,q.answer)}`; const lead=ok?`あなたの回答は${n}番${selected}。正解です。`:`あなたの回答は${n}番${selected}。不正解です。正解は${q.answer}番${correct}。`; return readAloudText(`${lead} ${q.normal} ${q.exam}`); }

async function loadCatalog(){
 const data=await fs.readFile(path.join(repoRoot,'data.js'),'utf8'); const ctx={}; vm.createContext(ctx); vm.runInContext(`${data}\nglobalThis.__sets=importedSets;`,ctx,{timeout:10000});
 const html=await fs.readFile(path.join(repoRoot,'index.html'),'utf8'); const m=html.match(/const legacyQuestions = (\[[\s\S]*?\n\]);\n\nconst setCatalog/); let legacy=[];
 if(m){ const c={}; vm.createContext(c); vm.runInContext(`globalThis.__legacy=${m[1]};`,c,{timeout:10000}); legacy=c.__legacy; }
 return [{id:'2022-06-JZ46A',label:'2022年6月 無線工学 JZ46A（5問収録）',subject:'無線工学',questions:legacy},...ctx.__sets];
}
async function synth(text,file){
 if(text.length>4096) throw new Error(`${file} は4096文字を超えています (${text.length})。問題データを分割してください。`);
 if(DRY_RUN){ console.log('dry-run',path.relative(repoRoot,file),text.length); return; }
 await fs.mkdir(path.dirname(file),{recursive:true});
 try{ await fs.access(file); console.log('skip',path.relative(repoRoot,file)); return; }catch{}
 const res=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Authorization':`Bearer ${API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,voice,input:text,instructions:'日本語の国家試験学習教材として、落ち着いた自然な講師の声で、項目番号や選択肢、句読点の間を明瞭に保って読み上げてください。数式・単位・英字略語は聞き取りやすく発音してください。',response_format:'mp3'})});
 if(!res.ok) throw new Error(`${res.status} ${await res.text()}`); await fs.writeFile(file,Buffer.from(await res.arrayBuffer())); console.log('created',path.relative(repoRoot,file));
}

const catalog=await loadCatalog();
let count=0;
for(const set of catalog){
 for(const q of set.questions){
  const dir=path.join(outRoot,String(q.id).replace(/[^A-Za-z0-9_-]/g,'_'));
  await synth(questionText(q),path.join(dir,'question.mp3')); count++;
  await synth(answerText(q),path.join(dir,'answer.mp3')); count++;
 }
}
console.log(`完了: ${voice} / 最大 ${count} ファイル（既存ファイルはスキップ）`);
