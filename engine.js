/* Sophia Forensic Engine — client-side port of sophia_forensic_v4.py
   Everything runs in the browser. Nothing leaves the device. */
const SophiaEngine = (() => {
"use strict";

const BENFORD_EXPECTED = {1:30.1,2:17.6,3:12.5,4:9.7,5:7.9,6:6.7,7:5.8,8:5.1,9:4.6};
const BENFORD_EXPECTED_SECOND = {0:11.97,1:11.39,2:10.88,3:10.43,4:10.03,5:9.67,6:9.34,7:9.04,8:8.76,9:8.50};
const MIN_NUMBERS_FOR_BENFORD = 100;
const MAX_EVIDENCE = 5;

const FINANCIAL_KEYWORDS = ["₹","Rs","Rupees","Lakh","Crore","Million","Billion","Asset","Liability","Equity","Revenue","Income","Expense","Profit","Loss","EBITDA","PAT","PBT","NPA","Dividend","Tax","Reserve","Capital","Debt","Loan","Interest","Turnover","Margin","ROE","ROA","ROCE","Balance","Total","Net","Gross","Cash","Flow","Statement","Financial","Audit","Auditor"];

const LEGAL_REFERENCES = {
going_concern:{summary:"The auditor has raised a material uncertainty about the company's ability to continue as a going concern.",laws:["Companies Act, 2013 – Section 134(5)(d): Directors must confirm the company is a going concern.","ICAI SA 570 (Going Concern): Auditor's responsibility to evaluate management's use of going concern basis.","SEBI LODR – Regulation 17: Audit committee must review the going concern assumption.","RBI Guidelines on Early Warning Signals: Going concern issues are a critical red flag for lenders."],action:"Immediate review of financial projections, liquidity position, and debt repayment capacity. Consider special audit of cash flows and working capital."},
related_party:{summary:"Significant related-party transactions have been identified that may indicate conflict of interest, fund diversion, or siphoning.",laws:["Companies Act, 2013 – Section 188: Related-party transactions require board approval and disclosure.","Companies Act, 2013 – Section 184: Directors must disclose their interest in any contract or arrangement.","SEBI LODR – Regulation 23: Material RPTs must be disclosed to stock exchanges.","ICAI Ind AS 24: Related-party disclosures are mandatory in financial statements."],action:"Review all related-party transactions for arm's length pricing, board approval, and proper disclosure. Consider independent valuation of significant transactions."},
pending_litigation:{summary:"Pending litigation, disputes, or arbitration proceedings have been identified.",laws:["Companies Act, 2013 – Schedule III: Contingent liabilities including pending litigation must be disclosed.","Arbitration and Conciliation Act, 1996: Governs arbitration proceedings and enforcement of awards.","Code of Civil Procedure, 1908: Governs civil litigation before Indian courts.","ICAI AS 29: Provisions, Contingent Liabilities, and Contingent Assets."],action:"Obtain status and quantum estimate for each proceeding from legal counsel; assess provisioning adequacy and disclosure completeness."},
contingent_liability:{summary:"Significant contingent liabilities have been identified, which could materially impact the company's financial position.",laws:["Companies Act, 2013 – Schedule III: Contingent liabilities must be disclosed in the financial statements.","ICAI AS 29: Provisions, Contingent Liabilities, and Contingent Assets.","RBI Guidelines on Provisioning: Contingent liabilities require provisioning as per RBI norms."],action:"Assess the likelihood and potential quantum of each contingent liability. Ensure adequate provisioning and disclosure."},
audit_qualification:{summary:"The auditor has issued a qualified opinion or emphasized a specific matter in their report.",laws:["Companies Act, 2013 – Section 143: Auditor's duties and reporting responsibilities.","ICAI SA 705: Modifications to the opinion in the independent auditor's report.","ICAI SA 706: Emphasis of Matter paragraphs.","SEBI LODR – Regulation 33: Audit report must be submitted with financial results."],action:"Address the auditor's concerns, implement corrective actions, and ensure future audit opinions are unqualified."},
default:{summary:"Indicators of potential defaults or non-payment of obligations have been identified.",laws:["RBI Guidelines on Early Warning Signals: Default indicators are critical for lenders.","SEBI LODR – Regulation 30: Defaults on debt obligations must be disclosed.","Insolvency and Bankruptcy Code, 2016 – Section 7: Default may trigger insolvency proceedings."],action:"Review debt repayment schedule, cash flow projections, and covenant compliance. Consider refinancing or restructuring if necessary."},
regulatory:{summary:"Regulatory or enforcement action (e.g., CBI, ED, SEBI, RBI) has been mentioned in the report.",laws:["Companies Act, 2013 – Section 134(3)(a): Board's report must disclose details of proceedings under any law.","SEBI LODR – Regulation 30: Material regulatory actions must be disclosed.","RBI Master Circular on Frauds: Regulatory actions must be reported."],action:"Engage with regulators, ensure compliance, and implement corrective actions to prevent recurrence."},
npa:{summary:"Non-performing assets (NPA) or bad loans have been identified in the company's portfolio.",laws:["RBI Guidelines on Asset Classification: NPAs must be classified and provisioned.","Insolvency and Bankruptcy Code, 2016 – Section 7: NPAs may trigger insolvency proceedings."],action:"Review loan portfolio, provisioning adequacy, and recovery mechanisms. Consider restructuring or write-offs where appropriate."},
shell_company:{summary:"Potential shell company or benami entity indicators have been identified.",laws:["Prevention of Benami Transactions Act, 1988: Benami transactions are prohibited.","Prevention of Money Laundering Act, 2002 (PMLA): Shell companies may be used for money laundering.","Income Tax Act, 1961 – Section 68: Cash credits must be explained."],action:"Investigate the entities identified, verify their legitimate business purpose, and consider filing appropriate disclosures."},
demand_notice:{summary:"A demand notice or show cause notice has been received from a regulatory authority.",laws:["Income Tax Act, 1961 – Section 156: Notice of demand.","Goods and Services Tax Act, 2017: Show cause notices and demand orders."],action:"Respond to the notice promptly, engage legal counsel, and seek resolution through appropriate channels."},
termination:{summary:"Termination risk has been identified, indicating potential loss of a critical contract, license, or arrangement.",laws:["Indian Contract Act, 1872 – Section 73: Compensation for breach of contract.","Specific Relief Act, 1963: Remedies for breach of contract."],action:"Review the contract/license terms, assess the risk of termination, and consider legal remedies."},
guarantee:{summary:"Guarantee or indemnity exposure has been identified, indicating potential contingent liability.",laws:["Companies Act, 2013 – Section 186: Guarantees require board approval.","RBI Guidelines on Corporate Guarantees: Guarantees must be properly valued and disclosed."],action:"Assess the risk of each guarantee, ensure adequate provisioning, and consider reducing exposure."},
promoter:{summary:"Promoter or controlling shareholder involvement has been identified.",laws:["Companies Act, 2013 – Section 184: Directors must disclose their interest.","SEBI LODR – Regulation 26: Promoter shareholding must be disclosed."],action:"Review promoter-related transactions, ensure compliance with disclosure requirements, and implement robust corporate governance practices."},
iepf:{summary:"IEPF or unclaimed dividend transfer has been identified.",laws:["Companies Act, 2013 – Section 124: Unclaimed dividends must be transferred to IEPF.","Companies Act, 2013 – Section 125: Investor Education and Protection Fund."],action:"Ensure timely transfer of unclaimed dividends and share certificates to IEPF."}
};

const RED_FLAG_PATTERNS = {
going_concern:{p:[[/going concern/i,0],[/material uncertainty/i,0],[/significant doubt/i,0]],kw:["audit","report","note","disclosure"],w:20},
related_party:{p:[[/related part(?:y|ies)/i,0],[/\bRPT\b/,0]],kw:["transaction","loan","sale","purchase","guarantee"],w:15},
pending_litigation:{p:[[/pending litigation/i,0],[/legal proceedings/i,0],[/\bdispute[sd]?\b/i,0],[/arbitration/i,0]],kw:["court","high court","tribunal","appeal","filed"],w:12},
contingent_liability:{p:[[/contingent liabilit(?:y|ies)/i,0]],kw:["demand","notice","claim","guarantee"],w:12},
audit_qualification:{p:[[/qualified opinion/i,0],[/adverse opinion/i,0],[/disclaimer of opinion/i,0],[/emphasis of matter/i,0]],kw:["auditor","audit","report"],w:20},
default:{p:[[/\bdefault(?:ed|ing)?\b/i,0],[/non-payment/i,0],[/\binsolvency\b/i,0]],kw:["loan","debt","repayment","borrower"],w:15},
regulatory:{p:[[/\bCBI\b/,0],[/\bED\b/,0],[/Enforcement Directorate/i,0],[/\bSEBI\b/,0],[/\binvestigation\b/i,0],[/\bscrutiny\b/i,0]],kw:["filed","registered","case","proceeding","notice","summon"],w:15},
npa:{p:[[/\bNPA\b/,0],[/non[- ]performing/i,0],[/bad loan/i,0]],kw:["asset","loan","portfolio","provision"],w:15},
shell_company:{p:[[/shell compan(?:y|ies)/i,0],[/\bbenami\b/i,0],[/offshore entity/i,0]],kw:["related","entity","director","address"],w:20},
demand_notice:{p:[[/demand notice/i,0],[/show cause/i,0],[/\bSCN\b/,0]],kw:["tax","duty","penalty","interest"],w:12},
termination:{p:[[/\bterminat(?:ed|ion)\b/i,0]],kw:["contract","agreement","license","lease"],w:10},
guarantee:{p:[[/\bguarantee[sd]?\b/i,0],[/\bguarantor\b/i,0],[/\bindemnity\b/i,0]],kw:["loan","credit","bank","financial"],w:8},
promoter:{p:[[/\bpromoter(?: group)?\b/i,0],[/controlling shareholder/i,0]],kw:["share","holding","entity"],w:5},
iepf:{p:[[/\bIEPF\b/,0],[/unclaimed dividend/i,0]],kw:["transfer","authority","fund"],w:5}
};

function extractFinancialNumbers(text){
  const nums=[]; const np=/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g;
  const units=["₹","Rs.","Rs ","Rupees","Lakh","Crore","Million","Billion"];
  for(const line of text.split("\n")){
    if(line.trim().length<3) continue;
    if(!FINANCIAL_KEYWORDS.some(k=>line.includes(k))) continue;
    let m; np.lastIndex=0;
    while((m=np.exec(line))!==null){
      const n=parseFloat(m[0].replace(/,/g,""));
      if(isNaN(n)||!(Math.abs(n)>0&&Math.abs(n)<1e15)) continue;
      const ctx=line.slice(Math.max(0,m.index-40),m.index+m[0].length+40);
      if(units.some(u=>ctx.includes(u))) nums.push(n);
    }
  }
  return nums;
}

function benfordAnalysis(numbers){
  const caveat="Benford's Law is designed for large, naturally-occurring transaction-level datasets. Numbers extracted from report narrative text are a weaker signal — informational screening, not forensic evidence.";
  if(!numbers.length) return {status:"No numbers found",overall_risk:"INSUFFICIENT_DATA",caveat};
  const fd=[],sd=[];
  for(const n of numbers){ if(n>=1){ const s=String(Math.trunc(Math.abs(n))); fd.push(+s[0]); if(s.length>=2) sd.push(+s[1]); } }
  const tf=fd.length,ts=sd.length;
  if(tf<MIN_NUMBERS_FOR_BENFORD) return {status:`Insufficient data (found ${tf}, need ${MIN_NUMBERS_FOR_BENFORD})`,overall_risk:"INSUFFICIENT_DATA",caveat};
  const fc={},sc={};
  for(const d of fd) fc[d]=(fc[d]||0)+1;
  for(const d of sd) sc[d]=(sc[d]||0)+1;
  const fo={},fe={};
  for(let d=1;d<=9;d++){ fo[d]=(fc[d]||0)/tf; fe[d]=BENFORD_EXPECTED[d]/100; }
  let mad=0; for(let d=1;d<=9;d++) mad+=Math.abs(fo[d]-fe[d]); mad/=9;
  let co=0,ce=0,ks=0; for(let d=1;d<=9;d++){ co+=fo[d]; ce+=fe[d]; ks=Math.max(ks,Math.abs(co-ce)); }
  let chi=0; for(let d=1;d<=9;d++) chi+=Math.pow((fc[d]||0)-tf*fe[d],2)/(tf*fe[d]);
  const band=(v,lo,hi)=>v<lo?"LOW":(v<hi?"MEDIUM":"HIGH");
  const mr=band(mad,0.004,0.008),kr=band(ks,0.02,0.04);
  let mad2=0,mr2="INSUFFICIENT_DATA";
  if(ts>=MIN_NUMBERS_FOR_BENFORD){
    const so={},se={};
    for(let d=0;d<=9;d++){ so[d]=(sc[d]||0)/ts; se[d]=BENFORD_EXPECTED_SECOND[d]/100; }
    for(let d=0;d<=9;d++) mad2+=Math.abs(so[d]-se[d]); mad2/=10;
    mr2=band(mad2,0.004,0.008);
  }
  const rs={LOW:0,MEDIUM:1,HIGH:2,INSUFFICIENT_DATA:0};
  const tot=(rs[mr]||0)+(rs[kr]||0)+(rs[mr2]||0);
  const overall=tot<=1?"LOW":(tot<=3?"MEDIUM":"HIGH");
  return {status:"Benford's Law applied",caveat,total_first_digits:tf,total_second_digits:ts,mad_first:mad,mad_first_risk:mr,ks_first:ks,ks_first_risk:kr,chi2_first:chi,chi_first_risk:"NOT COMPUTED (scipy not installed)",mad_second:mad2,mad_second_risk:mr2,overall_risk:overall};
}

function extractEntities(text){
  const e={named_persons:[],subsidiaries:[],auditors:[],banks:[]};
  const setA=(arr)=>[...new Set(arr)].slice(0,20);
  let m,re;
  re=/(?:Mr\.|Ms\.|Dr\.|Mrs\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g;
  while((m=re.exec(text))!==null){ const n=m[1].trim(); if(n.length>2&&n.length<60) e.named_persons.push(m[0].trim()); }
  re=/(?:subsidiary|subsidiaries|wholly[- ]owned)\s*(?:of|:)?\s*([A-Z][a-zA-Z&,.\s]{2,60}?(?:Limited|Ltd\.?|Private Limited|Pvt\.? Ltd\.?))/gi;
  while((m=re.exec(text))!==null) e.subsidiaries.push(m[1].trim());
  re=/(?:Statutory Auditors?|Independent Auditors?)\s*:?\s*([^\n.]{3,100})/g;
  while((m=re.exec(text))!==null) e.auditors.push(m[1].trim());
  re=/\b(State Bank of India|Bank of Baroda|Bank of India|Punjab National Bank|ICICI Bank|HDFC Bank|Axis Bank|Kotak Mahindra Bank|Yes Bank|IndusInd Bank|Reserve Bank of India|IDBI Bank|Canara Bank|Union Bank|Federal Bank|PNB|ICICI|HDFC|RBI|SBI|IDBI)\b/g;
  while((m=re.exec(text))!==null) e.banks.push(m[1]);
  for(const k in e) e[k]=setA(e[k]);
  return e;
}

function detectRedFlags(text){
  const flags=[];
  for(const fid in RED_FLAG_PATTERNS){
    const cfg=RED_FLAG_PATTERNS[fid]; const occ=[]; const seen=new Set();
    for(const [re] of cfg.p){
      re.lastIndex=0; let m;
      while((m=re.exec(text))!==null){
        const key=m.index+":"+m[0];
        if(seen.has(key)) continue;
        const ctx=text.slice(Math.max(0,m.index-100),m.index+m[0].length+100).replace(/\n/g," ").trim();
        if(!cfg.kw.some(k=>ctx.toLowerCase().includes(k))) continue;
        seen.add(key); occ.push({match:m[0],context:ctx});
        if(occ.length>=MAX_EVIDENCE) break;
      }
      if(occ.length>=MAX_EVIDENCE) break;
    }
    if(occ.length) flags.push({id:fid,weight:cfg.w,occurrence_count:occ.length,evidence:occ,confidence:cfg.w>=15?"HIGH":(cfg.w>=10?"MEDIUM":"LOW")});
  }
  return flags;
}

function extractChronology(text){
  const pats=[/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g,/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g,/\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/g];
  const d=new Set();
  for(const p of pats){ let m; while((m=p.exec(text))!==null) d.add(m[0]); }
  return [...d].sort().slice(0,15);
}

function computeScore(flags,benfordRisk,totalChars){
  let s=0; for(const f of flags) s+=(f.weight||5);
  if(benfordRisk==="HIGH") s+=25; else if(benfordRisk==="MEDIUM") s+=12;
  const c=[]; if(totalChars<1000) c.push("Very little text was extracted — score confidence is LOW regardless of the number shown.");
  return [Math.max(0,Math.min(100,s)),c];
}

function analyzeTitleSearch(text){
  const r={report_type:"Title Search Report",parties:{first_party:[],second_party:[]},property:"",registration:{},legal_opinion:"",limitations:[],red_flags:[],data_quality_notes:[],confidence:"LOW"};
  const fp={first_party:[/FIRST PARTY\s*[:\-]\s*([\s\S]*?)(?=SECOND PARTY|DOC\.?\s*REG|$)/i],second_party:[/SECOND PARTY\s*[:\-]\s*([\s\S]*?)(?=DOC\.?\s*REG|REGD\.?\s*DATE|I have duly|$)/i],property:[/PROPERTY ADDRESS\s*[:\-]\s*([\s\S]*?)(?=DOC\.?\s*REG|REGD\.?\s*DATE|I have duly|$)/i,/SCHEDULE OF PROPERTY\s*[:\-]\s*([\s\S]*?)(?=DOC\.?\s*REG|REGD\.?\s*DATE|WITNESS|$)/i]};
  for(const f in fp){
    for(const p of fp[f]){
      const m=text.match(p);
      if(m&&m[1].trim()){ const v=m[1].trim(); if(f==="property") r.property=v; else r.parties[f]=v.split("\n").map(l=>l.trim()).filter(Boolean); break; }
    }
  }
  if(!r.property){
    const k=text.match(/KHASRA NO\.?\s*([\d/.]+)/i); const s=text.match(/SURVEY (?:NO|NUMBER)\.?\s*([\d/.]+)/i);
    if(k) r.property="Khasra No. "+k[1]; else if(s) r.property="Survey No. "+s[1];
  }
  const regs={doc_reg_no:/DOC\.?\s*REG\s*NO\.?\s*([\d/]+)/i,addl_book_no:/ADDL\.?\s*BOOK\s*NO\.?\s*([\w\d]+)/i,volume_no:/VOL(?:UME)?\.?\s*NO\.?\s*([\w\d]+)/i,pages:/PAGE\s*NOS?\.?\s*([\d\-\s]+)/i,reg_date:/REG(?:D|ISTRATION)?\.?\s*DATE\s*[:\-]?\s*([\d./\-]+)/i};
  for(const k in regs){ const m=text.match(regs[k]); if(m) r.registration[k]=m[1].trim(); }
  const om=text.match(/LEGAL OPINION\s*[:\-]\s*([\s\S]*?)(?=LIMITATION|DISCLAIMER|\n\s*\n|$)/i);
  if(om) r.legal_opinion=om[1].trim();
  const lim=text.match(/(?:limitation|disclaimer|does not cover|not responsible|no personal responsibility).{0,200}/gi);
  r.limitations=lim?lim.slice(0,5).map(l=>l.trim()):[];
  const c=[r.parties.first_party.length>0,r.parties.second_party.length>0,!!r.property,Object.keys(r.registration).length>0,!!r.legal_opinion].filter(Boolean).length;
  if(c===0){ r.data_quality_notes.push("Document format not recognized. PARSER LIMITATION, not a finding."); r.confidence="UNRECOGNIZED_FORMAT"; }
  else{
    r.confidence=c<=2?"LOW":(c<=4?"MEDIUM":"HIGH");
    if(c>=2){
      if(!r.parties.first_party.length||!r.parties.second_party.length) r.red_flags.push("One or both parties not identified");
      if(!r.property) r.red_flags.push("Property description missing or incomplete");
      if(!Object.keys(r.registration).length) r.red_flags.push("Registration details missing");
    }
  }
  const tl=text.toLowerCase();
  if(tl.includes("caveat")) r.red_flags.push("Caveat present — recorded objection or claim on the property");
  if(tl.includes("sub-judice")||tl.includes("sub judice")) r.red_flags.push("Property described as sub-judice — active litigation");
  if(tl.includes("not verified")||tl.includes("on the basis of documents made available")) r.red_flags.push("Opinion limited to client-provided documents");
  return r;
}

async function sha512(text){
  const buf=new TextEncoder().encode(text);
  const hash=await crypto.subtle.digest("SHA-512",buf);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function generateIntegrityRecord(body){
  const canonical=JSON.stringify(body,Object.keys(body).sort());
  const digest=await sha512(canonical);
  return {content_hash_sha512:digest,hash_covers:"the full report body",generated_at:new Date().toISOString(),type:"SHA-512 integrity hash (not a cryptographic signature)",note:"Recompute to verify integrity; does not prove authorship.",verifiable:false};
}

function generateBoardSummary(flags,benford,score,verdict,caveats,title,integrity){
  const L=[];
  L.push("=".repeat(80));L.push("BOARD SUMMARY — SOPHIA FORENSIC SCREENING REPORT");L.push("=".repeat(80));L.push("");
  L.push("Automated SCREENING aid, not a legal or forensic-accounting finding.");
  L.push("All items require human review before any conclusion is drawn.");L.push("");
  L.push(`Suspicion Score: ${score}/100 — ${verdict}`);
  for(const c of caveats) L.push("   ! "+c);
  L.push("");
  if(flags.length){
    L.push(`FINANCIAL / REGULATORY FINDINGS (${flags.length} categories):`);
    for(const f of flags){
      const ref=LEGAL_REFERENCES[f.id]||{summary:"",laws:[],action:""};
      L.push("");L.push("  * "+ref.summary);
      L.push(`    Confidence: ${f.confidence} | Occurrences: ${f.occurrence_count}`);
      f.evidence.slice(0,3).forEach((ev,i)=>L.push(`    [${i+1}] ...${ev.context.slice(0,140)}...`));
      if(f.occurrence_count>3) L.push(`    ... and ${f.occurrence_count-3} more in JSON`);
      L.push("    Legal References:");
      ref.laws.slice(0,4).forEach(l=>L.push("      - "+l));
      L.push("    Recommended Action: "+ref.action);
    }
  } else {
    L.push("FINANCIAL / REGULATORY FINDINGS: None detected in this pass.");
    L.push("   (Absence of keyword match != absence of risk.)");
  }
  if(benford.status==="Benford's Law applied"){
    L.push("");L.push("STATISTICAL ANALYSIS (Benford's Law) — INFORMATIONAL:");
    L.push("  * "+benford.caveat);
    L.push(`  * First Digit MAD: ${benford.mad_first.toFixed(4)} (${benford.mad_first_risk})`);
    L.push(`  * Second Digit MAD: ${benford.mad_second.toFixed(4)} (${benford.mad_second_risk})`);
    L.push(`  * Overall: ${benford.overall_risk}`);
  } else {
    L.push("");L.push("Benford's Law: "+benford.status);
  }
  if(title){
    L.push("");L.push("TITLE SEARCH ANALYSIS:");
    if(title.confidence==="UNRECOGNIZED_FORMAT"){ L.push("  ! Format not recognized — manual review required."); }
    else{
      L.push(`  * Property: ${title.property||"Not specified"}`);
      L.push(`  * First Party: ${title.parties.first_party.slice(0,2).join(", ")||"Not extracted"}`);
      L.push(`  * Second Party: ${title.parties.second_party.slice(0,2).join(", ")||"Not extracted"}`);
      L.push(`  * Registration: ${JSON.stringify(title.registration)}`);
      L.push(`  * Confidence: ${title.confidence}`);
      if(title.red_flags.length){ L.push("  * Title Red Flags:"); title.red_flags.forEach(rf=>L.push("      - "+rf)); }
    }
  }
  L.push("");L.push("=".repeat(80));
  L.push("This report is a statistical and contextual screening aid — not a finding");
  L.push("of guilt, fraud, or defective title. Human review required.");
  L.push(`Report integrity: ${integrity.type}.`);L.push("=".repeat(80));
  return L.join("\n");
}

async function forensicScanText(text,sourceLabel){
  if(!text.trim()) return {error:"Could not extract any text from this document.",detail:sourceLabel};
  let title=null;
  if(/(?:title search|legal opinion|sale deed|khasra no\.|registration act)/i.test(text)) title=analyzeTitleSearch(text);
  const nums=extractFinancialNumbers(text);
  const benford=benfordAnalysis(nums);
  const entities=extractEntities(text);
  const flags=detectRedFlags(text);
  const chrono=extractChronology(text);
  let [score,cav]=computeScore(flags,benford.overall_risk,text.length);
  if(title&&title.confidence!=="UNRECOGNIZED_FORMAT") score=Math.min(100,score+title.red_flags.length*3);
  const verdict=score>=50?"HIGH RISK":(score>=25?"MEDIUM RISK":"LOW RISK");
  const body={document:sourceLabel,analysis_date:new Date().toISOString(),suspicion_score:score,score_caveats:cav,verdict,statistics:{total_characters:text.length,financial_numbers:nums.length,flagged_categories:flags.length,named_persons_found:entities.named_persons.length,subsidiaries_found:entities.subsidiaries.length},benford_law:benford,entities,red_flags:flags,chronology:chrono,title_search:title};
  const integrity=await generateIntegrityRecord(body);
  body.integrity=integrity;
  body.board_summary=generateBoardSummary(flags,benford,score,verdict,cav,title,integrity);
  return body;
}

// PDF extraction via pdf.js (loaded from CDN in index.html)
async function extractPdfText(file){
  if(typeof pdfjsLib==="undefined") throw new Error("PDF.js not loaded");
  const buf=await file.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let text="";
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    text+=content.items.map(it=>it.str).join(" ")+"\n";
  }
  return text;
}

async function extractXlsxText(file){
  if(typeof XLSX==="undefined") throw new Error("SheetJS not loaded");
  const buf=await file.arrayBuffer();
  const wb=XLSX.read(buf,{type:"array"});
  let text="";
  for(const name of wb.SheetNames){
    text+=`\n=== Sheet: ${name} ===\n`;
    text+=XLSX.utils.sheet_to_csv(wb.Sheets[name],{blankrows:false})+"\n";
  }
  return text;
}

async function extractCsvText(file){
  if(typeof Papa==="undefined") throw new Error("PapaParse not loaded");
  return await file.text();
}

async function extractAnyFile(file){
  const n=file.name.toLowerCase();
  if(n.endsWith(".pdf")) return {text:await extractPdfText(file),method:"pdf.js"};
  if(n.endsWith(".xlsx")||n.endsWith(".xls")) return {text:await extractXlsxText(file),method:"SheetJS"};
  if(n.endsWith(".csv")||n.endsWith(".tsv")) return {text:await extractCsvText(file),method:"PapaParse"};
  if(n.endsWith(".txt")||n.endsWith(".md")||n.endsWith(".json")) return {text:await file.text(),method:"plain text"};
  throw new Error("Unsupported file type: "+file.name+" (supported: PDF, XLSX, XLS, CSV, TSV, TXT, MD, JSON)");
}

return {forensicScanText,extractAnyFile,LEGAL_REFERENCES};
})();
