// ===============================
// Elite Players — Tournaments core
// ===============================

const STORAGE_KEY = 'elitePlayers:v1:tournaments';

// Utils
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
const sampleN = (arr, n) => shuffle(arr).slice(0, n);
const byName = name => t => (t.name || t) === name;

function loadTournaments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function saveTournaments(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
function saveTournament(updated) {
  const all = loadTournaments();
  const i = all.findIndex(t => t.id === updated.id);
  if (i !== -1) { all[i] = updated; saveTournaments(all); }
}

// Teams (32)
const TEAMS = [
  { name: 'Real Madrid', country: 'Spain', colors: ['#FFFFFF', '#FEBE10', '#00529F'] },
  { name: 'Barcelona', country: 'Spain', colors: ['#004D98', '#A50044', '#EDBB00'] },
  { name: 'Atletico Madrid', country: 'Spain', colors: ['#C60C30', '#FFFFFF', '#002D62'] },
  { name: 'Sevilla', country: 'Spain', colors: ['#E73C3C', '#FFFFFF'] },
  { name: 'Real Betis', country: 'Spain', colors: ['#009E5D', '#FFFFFF'] },
  { name: 'Bayern Munich', country: 'Germany', colors: ['#DC052D', '#0066B2'] },
  { name: 'Borussia Dortmund', country: 'Germany', colors: ['#FDE100', '#000000'] },
  { name: 'Eintracht Frankfurt', country: 'Germany', colors: ['#000000', '#1C1C1C'] },
  { name: 'Juventus', country: 'Italy', colors: ['#000000', '#FFFFFF'] },
  { name: 'Roma', country: 'Italy', colors: ['#8D1E2B', '#F7A600'] },
  { name: 'Napoli', country: 'Italy', colors: ['#70C6F5', '#1B74C4'] },
  { name: 'AC Milan', country: 'Italy', colors: ['#000000', '#A00031'] },
  { name: 'Inter Milan', country: 'Italy', colors: ['#0B64B3', '#000000'] },
  { name: 'Liverpool', country: 'England', colors: ['#C8102E', '#000000'] },
  { name: 'Man United', country: 'England', colors: ['#DA291C', '#000000'] },
  { name: 'Man City', country: 'England', colors: ['#6CABDD', '#1C2C5B'] },
  { name: 'Tottenham', country: 'England', colors: ['#D6D6D6', '#132257'] },
  { name: 'Arsenal', country: 'England', colors: ['#EF0107', '#FFFFFF'] },
  { name: 'Chelsea', country: 'England', colors: ['#034694', '#FFFFFF'] },
  { name: 'Lyon', country: 'France', colors: ['#FFFFFF', '#0D1E5B', '#E71D36'] },
  { name: 'PSG', country: 'France', colors: ['#0A2342', '#DA291C', '#FFFFFF'] },
  { name: 'Marseille', country: 'France', colors: ['#009DE0', '#FFFFFF'] },
  { name: 'Benfica', country: 'Portugal', colors: ['#E03C31', '#FFFFFF'] },
  { name: 'Flamengo', country: 'Brazil', colors: ['#C62828', '#000000'] },
  { name: 'River Plate', country: 'Argentina', colors: ['#D50000', '#000000', '#FFFFFF'] },
  { name: 'Boca Juniors', country: 'Argentina', colors: ['#F6D300', '#003A7D'] },
  { name: 'Al Hilal', country: 'KSA', colors: ['#002B7F', '#004AAD'] },
  { name: 'Al Nassr', country: 'KSA', colors: ['#FFD400', '#00205B'] },
  { name: 'Al Ittihad', country: 'KSA', colors: ['#FFD100', '#000000'] },
  { name: 'Mallorca', country: 'Spain', colors: ['#B80A1B', '#000000'] },
  { name: 'Nottingham Forest', country: 'England', colors: ['#DD0000', '#FFFFFF'] },
  { name: 'Monaco', country: 'France', colors: ['#E10600', '#FFFFFF', '#D4AF37'] }
];

// Color helpers
function hexToRgb(hex){ const h=hex.replace('#',''); const full=h.length===3?h.split('').map(x=>x+x).join(''):h; const n=parseInt(full,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function contrastColor(hex){ const {r,g,b}=hexToRgb(hex||'#222'); const yiq=(r*299+g*587+b*114)/1000; return yiq>=150?'#0E0F13':'#FFFFFF'; }

/* -------- Scheduling -------- */
function roundRobin(teams){
  const arr=[...teams]; if(arr.length%2===1) arr.push(null);
  const n=arr.length,half=n/2,rounds=[];
  for(let r=0;r<n-1;r++){
    const pairs=[];
    for(let i=0;i<half;i++){
      const t1=arr[i],t2=arr[n-1-i];
      if(t1&&t2)pairs.push({home:t1,away:t2});
    }
    rounds.push(pairs);
    const fixed=arr[0],rest=arr.slice(1); rest.unshift(rest.pop());
    arr.splice(1,rest.length,...rest); arr[0]=fixed;
  }
  return rounds;
}
function doubleRoundRobin(teams){ const first=roundRobin(teams); const second=first.map(p=>p.map(m=>({home:m.away,away:m.home}))); return [...first,...second]; }
function nextPow2(n){ let p=1; while(p<n) p*=2; return p; }
function roundName(size){ if(size>=32) return 'Round of 32'; if(size===16) return 'Round of 16'; if(size===8) return 'Quarter-finals'; if(size===4) return 'Semi-finals'; if(size===2) return 'Final'; return 'Knockout'; }
function generateKnockout(teams){
  const t=[...teams]; const target=nextPow2(t.length); const byes=target-t.length; for(let i=0;i<byes;i++) t.push(null);
  const rounds=[]; let size=t.length; let current=[];
  for(let i=0;i<size;i+=2){
    current.push({ id:`K-0-${i/2}`, home:t[i], away:t[i+1],
      scoreHome:null, scoreAway:null, played:false,
      next:{ r:1, m:Math.floor((i/2)/2), slot:(i/2)%2===0?'home':'away' } });
  }
  rounds.push({ name:roundName(size), matches:current });
  let rIndex=1;
  while(size>2){
    size=size/2;
    const matches=Array.from({length:size/2},(_,i)=>({
      id:`K-${rIndex}-${i}`, home:null, away:null,
      scoreHome:null, scoreAway:null, played:false,
      next:{ r:rIndex+1, m:Math.floor(i/2), slot:i%2===0?'home':'away' }
    }));
    rounds.push({ name:roundName(size), matches });
    rIndex++;
  }
  rounds.push({ name:'Final', matches:[{ id:`K-${rIndex}-0`, home:null, away:null, scoreHome:null, scoreAway:null, played:false, next:null }] });
  return { rounds };
}
function autopropagateByes(tournament){
  const { rounds } = tournament.structure.knockout;
  const first=rounds[0].matches;
  first.forEach(m=>{
    if((m.home && !m.away) || (!m.home && m.away)){
      m.played=true; m.scoreHome=m.home?1:0; m.scoreAway=m.away?1:0;
      const winner=m.home?m.home:m.away;
      const { r, m:mid, slot }=m.next; if(rounds[r] && rounds[r].matches[mid]) rounds[r].matches[mid][slot]=winner;
    }
  });
}
function generateLeague(teams,homeAway=true){
  const rounds=homeAway?doubleRoundRobin(teams):roundRobin(teams);
  return rounds.map((pairs,r)=>({
    name:`Matchday ${r+1}`,
    matches:pairs.map((p,i)=>({ id:`L-${r}-${i}`, home:p.home, away:p.away, scoreHome:null, scoreAway:null, played:false }))
  }));
}
function groupName(i){ return String.fromCharCode(65+i); }
function splitGroupsOf4(teams){ const s=shuffle(teams), groups=[]; for(let i=0;i<s.length;i+=4) groups.push({name:`Group ${groupName(i/4)}`,teams:s.slice(i,i+4)}); return groups; }
function generateGroups(teams){
  const groups=splitGroupsOf4(teams);
  const data=groups.map((g,gi)=>{
    const rounds=roundRobin(g.teams).map((pairs,r)=>({
      name:`Round ${r+1}`,
      matches:pairs.map((p,i)=>({ id:`G-${gi}-${r}-${i}`, home:p.home, away:p.away, scoreHome:null, scoreAway:null, played:false }))
    }));
    return { name:g.name, teams:g.teams, rounds };
  });
  return { groups:data, knockout:null };
}

/* Standings + Group->KO */
function emptyRow(name){ return { team:name, played:0, wins:0, draws:0, losses:0, gf:0, ga:0, gd:0, pts:0 }; }
function computeTable(teams, rounds){
  const table=new Map(teams.map(t=>[t.name||t, emptyRow(t.name||t)]));
  rounds.forEach(r=>r.matches.forEach(m=>{
    if(!m.played || m.home==null || m.away==null) return;
    const h=table.get(m.home.name||m.home), a=table.get(m.away.name||m.away);
    h.played++; a.played++;
    h.gf+=m.scoreHome; h.ga+=m.scoreAway;
    a.gf+=m.scoreAway; a.ga+=m.scoreHome;
    h.gd=h.gf-h.ga; a.gd=a.gf-a.ga;
    if(m.scoreHome>m.scoreAway){ h.wins++; a.losses++; h.pts+=3; }
    else if(m.scoreHome<m.scoreAway){ a.wins++; h.losses++; a.pts+=3; }
    else { h.draws++; a.draws++; h.pts++; a.pts++; }
  }));
  const rows=[...table.values()];
  rows.sort((x,y)=> y.pts-x.pts || y.gd-x.gd || y.gf-x.gf || x.team.localeCompare(y.team));
  return rows;
}
function bestThirds(allGroupsTables, need=4){
  const thirds=allGroupsTables.map(t=>t[2]).filter(Boolean);
  thirds.sort((a,b)=> b.pts-a.pts || b.gd-a.gd || b.gf-a.gf || a.team.localeCompare(b.team) );
  return thirds.slice(0,need).map(r=>r.team);
}
function buildKnockoutFromGroups(tournament){
  const gs=tournament.structure?.groups; if(!gs) return;
  const allPlayed=gs.groups.every(g=>g.rounds.every(r=>r.matches.every(m=>m.played)));
  if(!allPlayed) return;

  const tables=gs.groups.map(g=>computeTable(g.teams, g.rounds));
  const qualifies=[];
  gs.groups.forEach((g,i)=>{ const t=tables[i]; qualifies.push(t[0].team, t[1].team); });
  if(gs.groups.length===6){ const thirds=bestThirds(tables,4); qualifies.push(...thirds); }

  const nameMap=new Map(tournament.teams.map(t=>[t.name,t]));
  const qObjs=qualifies.map(n=>nameMap.get(n) || {name:n});

  let seeds=[];
  if([2,4,8].includes(gs.groups.length)){
    const orderPairs=[];
    for(let i=0;i<gs.groups.length;i+=2){
      const A=tables[i], B=tables[i+1];
      orderPairs.push(A[0].team, B[1].team, B[0].team, A[1].team);
    }
    seeds=orderPairs.map(n=>nameMap.get(n));
  } else {
    seeds=shuffle(qObjs);
  }
  tournament.structure.knockout=generateKnockout(seeds);
  autopropagateByes(tournament);
}

/* -------- Create & migrate (manual teams) -------- */
function createTournamentData({ name, format, numberOfTeams, status }){
  return {
    id:Date.now(),
    createdAt:Date.now(),
    name, format,
    numberOfTeams: parseInt(numberOfTeams,10),
    status,
    teams: [],          // manual add
    structure: null     // built after teams complete
  };
}
function migrateTournamentIfNeeded(t){
  let changed=false;
  if(!('teams' in t)) { t.teams=[]; changed=true; }
  if(typeof t.numberOfTeams === 'string') { t.numberOfTeams = parseInt(t.numberOfTeams,10); changed=true; }
  if(t.teams.length === t.numberOfTeams && !t.structure){
    t.structure = buildStructure(t.format, t.teams);
    if(t.format==='Knockout') autopropagateByes(t);
    changed=true;
  }
  return changed;
}
function buildStructure(format, teams){
  if(format==='Knockout') return { type:'knockout', knockout:generateKnockout(teams) };
  if(format==='League (Home & Away)') return { type:'league', league:{ rounds:generateLeague(teams, true) } };
  return { type:'groups', groups:generateGroups(teams) };
}
function ensureStructure(t){
  if(t.teams.length !== t.numberOfTeams){ t.structure=null; return; }
  if(!t.structure){
    t.structure = buildStructure(t.format, t.teams);
    if(t.format==='Knockout') autopropagateByes(t);
  }
}

/* -------- Fixtures Preview (static) -------- */
function fixturesFromTournament(t){
  if(!t.structure) return [];
  const fx = [];
  if(t.format === 'Knockout'){
    const first = t.structure.knockout.rounds[0].matches;
    first.forEach(m => fx.push({ a:m.home, b:m.away, round: t.structure.knockout.rounds[0].name }));
  } else if (t.format === 'League (Home & Away)'){
    t.structure.league.rounds.forEach(r => r.matches.forEach(m => fx.push({ a:m.home, b:m.away, round: r.name })));
  } else {
    t.structure.groups.groups.forEach(g => {
      g.rounds.forEach(r => r.matches.forEach(m => fx.push({ a:m.home, b:m.away, round: `${g.name} — ${r.name}` })));
    });
  }
  return fx;
}

/* -------- Rendering helpers -------- */
function teamCardStyle(t){
  const [c1,c2,c3]=(t.colors||[]).concat(['','','']).slice(0,3);
  const text=contrastColor(c1||'#1B1E28');
  const cls=(t.colors && t.colors.length>=2)?'team-card striped':'team-card solid';
  const style=`--c1:${c1||'#1B1E28'};--c2:${c2||'#151720'};--c3:${c3||'transparent'};--teamText:${text};`;
  return { cls, style };
}
function teamChipEditable(t){
  const {cls, style} = teamCardStyle(t);
  return `<div class="${cls}" style="${style}">
    <button class="remove-team" data-action="remove-team" data-name="${t.name}" aria-label="Remove">×</button>
    <span class="team-name">${t.name}</span>
    ${t.country?`<span class="country">${t.country}</span>`:''}
  </div>`;
}
function renderTeamsEditor(container, t){
  const remaining = t.numberOfTeams - t.teams.length;
  const selectedNames = new Set(t.teams.map(x => x.name));
  const available = TEAMS.filter(x => !selectedNames.has(x.name));
  const disabled = remaining <= 0 ? 'disabled' : '';
  const options = available.map(x => `<option value="${x.name}">${x.name} (${x.country||''})</option>`).join('');
  container.innerHTML += `
    <div class="teams-editor">
      <span class="count">Teams: ${t.teams.length}/${t.numberOfTeams}</span>
      <select id="team-select" ${disabled}>${options}</select>
      <button class="btn btn-primary" data-action="add-team" ${disabled}>Add</button>
      <button class="btn" data-action="fill-random" ${disabled}>Fill</button>
      <button class="btn btn-danger" data-action="clear-teams" ${t.teams.length? '' : 'disabled'}>Clear</button>
      ${remaining>0 ? `<span class="info-note">Add ${remaining} more to generate schedule & bracket.</span>` : ''}
    </div>
  `;
}
function renderTeamsGridEditable(container, t){
  container.innerHTML += `
    <h3>Teams</h3>
    <div class="teams-grid">
      ${t.teams.map(teamChipEditable).join('')}
    </div>
  `;
}
function fixtureCardHTML(a,b,round){
  const A = a ? (a.name||a) : 'TBD';
  const B = b ? (b.name||b) : 'TBD';
  return `
    <div class="fixture-card">
      <div class="fixture-teams">
        <span class="team">${A}</span>
        <span class="vs">vs</span>
        <span class="team">${B}</span>
      </div>
      ${round ? `<div class="fixture-meta">${round}</div>` : ''}
    </div>
  `;
}
function renderFixturesPreview(container, t){
  if(!t.structure){ return; }
  const fixtures = fixturesFromTournament(t);
  if(!fixtures.length) return;
  container.innerHTML += `
    <section class="fixtures-section">
      <h3>Fixtures Preview</h3>
      <div class="fixture-list">
        ${fixtures.map(f => fixtureCardHTML(f.a, f.b, f.round)).join('')}
      </div>
    </section>
  `;
}

/* -------- Shared interactive renderers -------- */
function matchCardHTML(type, rid, mid, gid, m){
  const key=`data-type="${type}" data-r="${rid}" data-m="${mid}" ${gid!==null?`data-g="${gid}"`:''}`;
  const h=m.home?(m.home.name||m.home):'TBD', a=m.away?(m.away.name||m.away):'TBD';
  if(m.played){
    return `<div class="match-card" ${key}>
      <div class="teams"><span>${h}</span> <span class="vs">vs</span> <span>${a}</span></div>
      <div class="final-score"><strong>${m.scoreHome} - ${m.scoreAway}</strong><button class="btn" data-action="reset-score">Reset</button></div>
    </div>`;
  }
  const disabled=(!m.home || !m.away);
  return `<div class="match-card" ${key}>
    <div class="teams"><span>${h}</span> <span class="vs">vs</span> <span>${a}</span></div>
    <div class="score-inputs">
      <input type="number" min="0" class="s-home" ${disabled?'disabled':''}/>
      <span>-</span>
      <input type="number" min="0" class="s-away" ${disabled?'disabled':''}/>
      <button class="btn btn-primary" data-action="save-score" ${disabled?'disabled':''}>Save</button>
    </div>
  </div>`;
}
function tableHTML(rows){
  return `<div class="table-wrap">
    <table class="standings">
      <thead><tr><th>Team</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r.team}</td><td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gd}</td><td><strong>${r.pts}</strong></td></tr>`).join('')}</tbody>
    </table>
  </div>`;
}
function renderLeague(container, league, teams){
  const table=computeTable(teams, league.rounds);
  container.innerHTML += `<h3>Standings</h3>${tableHTML(table)}<h3>Matches</h3>`;
  league.rounds.forEach((r,i)=>{
    const matchesHTML=r.matches.map((m,j)=>matchCardHTML('league', i, j, null, m)).join('');
    container.innerHTML += `<div class="round-block"><h4>${r.name}</h4><div class="matches">${matchesHTML}</div></div>`;
  });
}
function renderKnockout(container, ko){
  const cols=ko.rounds.map((round,r)=>{
    const matches=round.matches.map((m,i)=>matchCardHTML('knockout', r, i, null, m)).join('');
    return `<div class="bracket-round"><div class="round-title">${round.name}</div>${matches}</div>`;
  }).join('');
  container.innerHTML += `<h3>Knockout Bracket</h3><div class="bracket">${cols}</div>`;
}
function renderGroups(container, gs, teams, tournament){
  container.innerHTML += `<h3>Group Stage</h3>`;
  gs.groups.forEach((g,gi)=>{
    const table=computeTable(g.teams, g.rounds);
    const matches=g.rounds.map((r,i)=>`
      <div class="round-block">
        <h4>${g.name} — ${r.name}</h4>
        <div class="matches">${r.matches.map((m,j)=>matchCardHTML('group', i, j, gi, m)).join('')}</div>
      </div>`).join('');
    container.innerHTML += `<div class="group"><div class="group-table">${tableHTML(table)}</div>${matches}</div>`;
  });
  if(tournament.structure && tournament.structure.knockout){ renderKnockout(container, tournament.structure.knockout); }
}

/* -------- Render Tournament -------- */
function renderTournament(tournament){
  const infoDiv=document.getElementById('tournament-info'); if(!infoDiv) return;
  infoDiv.innerHTML = `
    <div class="card">
      <h3>${tournament.name}</h3>
      <p class="meta">Format: ${tournament.format} • Teams: ${tournament.numberOfTeams} • Status: ${tournament.status}</p>
    </div>
  `;

  // Editor + Teams
  renderTeamsEditor(infoDiv, tournament);
  renderTeamsGridEditable(infoDiv, tournament);

  // If full -> build structure then fixtures + interactive
  if(tournament.teams.length === tournament.numberOfTeams){
    ensureStructure(tournament); saveTournament(tournament);

    // Static fixtures (for screenshot)
    renderFixturesPreview(infoDiv, tournament);

    // Interactive (existing)
    if(tournament.format==='Knockout'){
      renderKnockout(infoDiv, tournament.structure.knockout);
    }else if(tournament.format==='League (Home & Away)'){
      renderLeague(infoDiv, tournament.structure.league, tournament.teams);
    }else{
      renderGroups(infoDiv, tournament.structure.groups, tournament.teams, tournament);
    }
  }
}

/* -------- Scores -------- */
function findTournamentByURL(){ const p=new URLSearchParams(window.location.search); const id=parseInt(p.get('id'),10); const all=loadTournaments(); return all.find(t=>t.id===id)||null; }
function setLeagueScore(t,r,m,h,a){ const match=t.structure.league.rounds[r].matches[m]; match.scoreHome=h; match.scoreAway=a; match.played=true; }
function resetLeagueScore(t,r,m){ const match=t.structure.league.rounds[r].matches[m]; match.scoreHome=match.scoreAway=null; match.played=false; }
function setGroupScore(t,g,r,m,h,a){ const match=t.structure.groups.groups[g].rounds[r].matches[m]; match.scoreHome=h; match.scoreAway=a; match.played=true; }
function resetGroupScore(t,g,r,m){ const match=t.structure.groups.groups[g].rounds[r].matches[m]; match.scoreHome=match.scoreAway=null; match.played=false; }
function setKnockoutScore(t,r,m,h,a){
  const ko=t.structure.knockout; const match=ko.rounds[r].matches[m];
  if(h===a){ alert('Knockout match cannot end in a draw.'); return false; }
  match.scoreHome=h; match.scoreAway=a; match.played=true;
  const winner=h>a?match.home:match.away;
  if(match.next){ const nxt=ko.rounds[match.next.r]?.matches[match.next.m]; if(nxt){ nxt[match.next.slot]=winner; } }
  return true;
}
function resetKnockoutScore(t,r,m){
  const ko=t.structure.knockout; const match=ko.rounds[r].matches[m];
  if(match.played && match.next){
    const prevWinner=(match.scoreHome>match.scoreAway)?match.home:match.away;
    const nxt=ko.rounds[match.next.r]?.matches[match.next.m];
    if(nxt && ((nxt[match.next.slot]?.name || nxt[match.next.slot]) === (prevWinner?.name || prevWinner))) nxt[match.next.slot]=null;
  }
  match.scoreHome=match.scoreAway=null; match.played=false;
}

/* -------- Home: list + delete -------- */
function renderHomeList(container){
  const tournaments=loadTournaments().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  container.innerHTML='';
  if(tournaments.length===0){
    const empty=document.createElement('div'); empty.className='empty-state';
    empty.innerHTML=`<p>No tournaments yet.</p><a class="btn btn-primary" href="create.html">Create Tournament</a>`;
    container.appendChild(empty); return;
  }
  tournaments.forEach(t=>{
    const card=document.createElement('article'); card.className='tournament-card';
    const head=document.createElement('div'); head.className='card-head';
    const title=document.createElement('h4'); title.textContent=t.name;
    const badge=document.createElement('span'); badge.className='badge'; badge.textContent=t.status;
    head.append(title,badge);

    const m1=document.createElement('p'); m1.className='meta'; m1.textContent=`Format: ${t.format}`;
    const m2=document.createElement('p'); m2.className='meta'; m2.textContent=`Teams: ${t.teams?.length||0}/${t.numberOfTeams}`;

    // actions (delete)
    const actions=document.createElement('div'); actions.className='card-actions';
    const del=document.createElement('button'); del.className='delete-btn'; del.title='Delete';
    del.setAttribute('aria-label','Delete'); del.textContent='×';
    actions.appendChild(del);

    del.addEventListener('click',(e)=>{
      e.stopPropagation();
      if(confirm(`Delete "${t.name}"?`)){
        const all=loadTournaments().filter(x=>x.id!==t.id);
        saveTournaments(all);
        renderHomeList(container);
      }
    });

    card.addEventListener('click',()=>{ window.location.href=`tournament.html?id=${t.id}`; });
    card.append(actions, head, m1, m2);
    container.appendChild(card);
  });
}

/* -------- Page wiring -------- */
document.addEventListener('DOMContentLoaded', () => {
  // index.html
  const list=document.getElementById('tournament-list');
  if(list){ renderHomeList(list); }

  // create.html
  const form=document.getElementById('tournament-form');
  if(form){
    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      const name=document.getElementById('name').value.trim();
      const format=document.getElementById('format').value;
      const numberOfTeams=parseInt(document.getElementById('numberOfTeams').value,10);
      const status=document.getElementById('status').value;
      if(name.length<3){ alert('Please enter a valid name (3+ chars).'); return; }
      const t=createTournamentData({ name, format, numberOfTeams, status });
      const all=loadTournaments(); all.push(t); saveTournaments(all);
      window.location.href='index.html';
    });
  }

  // tournament.html
  const info=document.getElementById('tournament-info');
  if(info){
    let t=findTournamentByURL();
    if(!t){ info.innerHTML='<p>Tournament not found.</p>'; return; }
    if(migrateTournamentIfNeeded(t)) saveTournament(t);
    renderTournament(t);

    // Editor actions (delegation)
    info.addEventListener('click',(ev)=>{
      const btn=ev.target.closest('[data-action]'); if(!btn) return;
      const action=btn.dataset.action;

      const all=loadTournaments();
      const idx=all.findIndex(x=>x.id===t.id); if(idx===-1) return;
      const tour=all[idx];

      if(action==='add-team'){
        const sel=info.querySelector('#team-select'); const name=sel?.value; if(!name) return;
        if(tour.teams.find(byName(name))) return;
        const team=TEAMS.find(byName(name)); if(!team) return;
        if(tour.teams.length>=tour.numberOfTeams) return;
        tour.teams.push(team);
      }
      if(action==='fill-random'){
        const picked=new Set(tour.teams.map(x=>x.name));
        const left=TEAMS.filter(x=>!picked.has(x.name));
        const need=tour.numberOfTeams - tour.teams.length;
        tour.teams.push(...shuffle(left).slice(0, Math.max(0, need)));
      }
      if(action==='clear-teams'){
        tour.teams=[]; tour.structure=null;
      }
      if(action==='remove-team'){
        const name=btn.dataset.name;
        tour.teams = tour.teams.filter(x=>x.name!==name);
        tour.structure=null;
      }

      if(tour.teams.length===tour.numberOfTeams){
        ensureStructure(tour);
      }else{
        tour.structure=null;
      }

      saveTournament(tour);
      t=tour;
      renderTournament(tour);
    });

    // Scores handlers (interactive)
    info.addEventListener('click',(ev)=>{
      const btn=ev.target.closest('button[data-action]'); if(!btn) return;
      if(['save-score','reset-score'].includes(btn.dataset.action)===false) return;
      const wrap=btn.closest('.match-card');
      const type=wrap?.dataset.type;
      const r=parseInt(wrap?.dataset.r,10);
      const m=parseInt(wrap?.dataset.m,10);
      const g=wrap?.dataset.g!==undefined?parseInt(wrap.dataset.g,10):null;

      const all=loadTournaments(); const idx=all.findIndex(x=>x.id===t.id); if(idx===-1) return;
      const tour=all[idx];

      if(btn.dataset.action==='save-score'){
        const sh=wrap.querySelector('.s-home'); const sa=wrap.querySelector('.s-away');
        const h=parseInt(sh.value,10); const a=parseInt(sa.value,10);
        if(Number.isNaN(h)||Number.isNaN(a)||h<0||a<0){ alert('Enter valid scores'); return; }
        if(type==='league') setLeagueScore(tour,r,m,h,a);
        else if(type==='group'){ setGroupScore(tour,g,r,m,h,a); buildKnockoutFromGroups(tour); }
        else if(type==='knockout'){ const ok=setKnockoutScore(tour,r,m,h,a); if(!ok) return; }
        saveTournament(tour); renderTournament(tour);
      }

      if(btn.dataset.action==='reset-score'){
        if(type==='league') resetLeagueScore(tour,r,m);
        else if(type==='group') resetGroupScore(tour,g,r,m);
        else if(type==='knockout') resetKnockoutScore(tour,r,m);
        saveTournament(tour); renderTournament(tour);
      }
    });
  }

  // teams.html
  const grid=document.getElementById('teams-grid');
  if(grid){
    grid.innerHTML='';
    const frag=document.createDocumentFragment();
    TEAMS.forEach(t=>{
      const [c1,c2,c3]=(t.colors||[]).concat(['','','']).slice(0,3);
      const card=document.createElement('div');
      card.className = (t.colors && t.colors.length>=2) ? 'team-card striped' : 'team-card solid';
      if(c1) card.style.setProperty('--c1', c1);
      if(c2) card.style.setProperty('--c2', c2);
      if(c3) card.style.setProperty('--c3', c3);
      card.style.setProperty('--teamText', contrastColor(c1 || '#1B1E28'));
      const name=document.createElement('span'); name.className='team-name'; name.textContent=t.name;
      const country=document.createElement('span'); country.className='country badge'; country.textContent=t.country || '';
      card.append(name,country);
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }
});
