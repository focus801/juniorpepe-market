import { createClient } from '@supabase/supabase-js';
import './style.css';

const app = document.querySelector('#app');
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { app.textContent = 'Supabase 환경변수가 필요합니다.'; throw Error('Missing Supabase env'); }
const sb = createClient(url, key);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults = ['재화판매','재화구매','전사-힘퍼템','해적-힘퍼템','궁수-덱퍼템','해적-덱퍼템','인퍼템','럭퍼템','올스텟퍼템','hp퍼템','드랍퍼템','캐시템and자석펫','이외-아이템'];
const states = ['판매 중','예약 중','판매 완료'];
const grades = ['','레어','에픽','유니크','레전드리'];
const equipment = ['','무기','모자','상의','하의','한벌옷','장갑','신발','망토','어깨장식','벨트','귀고리','반지','펜던트','얼굴장식','눈장식','보조무기','엠블렘','기타'];
const statOptions = ['','STR','DEX','INT','LUK','공격력','마력','HP','MP','방어력','이동속도','점프력','올스탯'];
const potentialOptions = ['','STR','DEX','INT','LUK','올스탯','최대 HP','최대 MP','공격력','마력','크리티컬 데미지','크리티컬 확률','보스 몬스터 공격 시 데미지','몬스터 방어율 무시','데미지','아이템 드롭률','메소 획득량','모든 스킬의 재사용 대기시간 감소','상태 이상 내성','기타(직접 입력)'];
const sets = {
 '칠흑의 보스 세트':['루즈 컨트롤 머신 마크','마력이 깃든 안대','몽환의 벨트','커맨더 포스 이어링','거대한 공포','고통의 근원','창세의 뱃지','저주받은 적의 마도서','저주받은 청의 마도서','저주받은 황의 마도서','저주받은 녹의 마도서','미트라의 분노'],
 '광휘의 보스 세트':[],
 '아케인셰이드':['아케인셰이드 무기','아케인셰이드 모자','아케인셰이드 한벌옷','아케인셰이드 장갑','아케인셰이드 신발','아케인셰이드 망토','아케인셰이드 어깨장식'],
 '에테르넬':['에테르넬 모자','에테르넬 상의','에테르넬 하의','에테르넬 장갑','에테르넬 신발','에테르넬 망토','에테르넬 어깨장식'],
 '루타비스/카루타':['하이네스 모자','이글아이 상의','트릭스터 하의','파프니르 무기'],
 '앱솔랩스':['앱솔랩스 무기','앱솔랩스 모자','앱솔랩스 한벌옷','앱솔랩스 장갑','앱솔랩스 신발','앱솔랩스 망토','앱솔랩스 어깨장식'],
 '여명의 보스 세트':['트와일라이트 마크','에스텔라 이어링','데이브레이크 펜던트','가디언 엔젤 링'],
 '보스 장신구 세트':['응축된 힘의 결정석','아쿠아틱 레터 눈장식','블랙빈 마크','파풀라투스 마크','데아 시두스 이어링','실버블라썸 링','고귀한 이피아의 반지','핑크빛 성배','골든 클로버 벨트','매커네이터 펜던트','도미네이터 펜던트','크리스탈 웬투스 뱃지','로얄 블랙메탈 숄더']
};
// The equipment lists are suggestions, not a verified exhaustive KMS catalog.
// Actual icon selection is deliberately manual until a licensed, verified icon catalog is connected.
let session = null, admin = false, adminView = false, items = [], categories = [], search = '', selectedCategory = '전체', editId = null, channel = null;
const money = n => {
 if(n == null) return '가격 문의';
 const v = Number(n);
 if(!Number.isSafeInteger(v) || v < 0) return '가격 확인 필요';
 const eok = Math.floor(v / 100000000);
 const cheon = Math.floor((v % 100000000) / 10000000);
 const rest = v % 10000000;
 const parts = [];
 if(eok) parts.push(`${eok.toLocaleString('ko-KR')}억`);
 if(cheon) parts.push(`${cheon}천만`);
 if(rest) parts.push(`${rest.toLocaleString('ko-KR')}`);
 return (parts.join(' ') || '0') + ' 메소';
};
const priceParts = n => {const v=Number(n??0);return {eok:Math.floor(v/100000000),cheon:Math.floor((v%100000000)/10000000),rest:v%10000000};};
function priceFields(price){const p=priceParts(price);return `<div class="price-editor"><div class="price-unit"><label for="priceEok">억</label><input id="priceEok" name="price_eok" inputmode="numeric" type="number" min="0" step="1" placeholder="0" value="${price==null?'':p.eok}"></div><div class="price-unit"><label for="priceCheon">천만</label><input id="priceCheon" name="price_cheon" inputmode="numeric" type="number" min="0" max="9" step="1" placeholder="0~9" value="${price==null?'':p.cheon}"></div><div class="price-unit"><label for="priceRest">나머지 메소 (선택)</label><input id="priceRest" name="price_rest" inputmode="numeric" type="number" min="0" max="9999999" step="1" placeholder="0" value="${price==null||!p.rest?'':p.rest}"></div></div><p class="muted price-hint">억과 천만 칸에 숫자만 입력하세요. 모두 비우면 가격 문의로 표시됩니다. <strong id="pricePreview">${money(price)}</strong></p>`;}
function readPrice(form){const keys=['price_eok','price_cheon','price_rest'];const vals=keys.map(k=>String(form.elements.namedItem(k)?.value??'').trim());if(vals.every(v=>v===''))return null;const [eok,cheon,rest]=vals.map(v=>v===''?0:Number(v));if(![eok,cheon,rest].every(Number.isSafeInteger)||eok<0||cheon<0||cheon>9||rest<0||rest>9999999)throw Error('가격은 억(0 이상), 천만(0~9), 나머지 메소(0~9,999,999)로 입력하세요.');const total=eok*100000000+cheon*10000000+rest;if(!Number.isSafeInteger(total)||total>9223372036854775807)throw Error('가격이 너무 큽니다.');return total;}
const publicImage = path => path ? sb.storage.from('item-images').getPublicUrl(path).data.publicUrl : '';
const opts = (values, selected) => values.map(v => `<option value="${esc(v)}" ${String(v) === String(selected ?? '') ? 'selected' : ''}>${esc(v || '선택 안 함')}</option>`).join('');
const field = (title, name, value = '', type = 'text', extra = '') => `<label>${esc(title)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const area = (title, name, value = '', hint = '') => `<label>${esc(title)}<textarea name="${esc(name)}" rows="3" placeholder="${esc(hint)}">${esc(value)}</textarea></label>`;
const parseLines = text => String(text || '').split('\n').filter(Boolean).map(line => { const m = line.match(/^(.+?)\s+(\S.*)$/); return m ? {stat:m[1],value:m[2]} : {stat:'기타(직접 입력)',value:line}; });
const parseFlame = text => String(text || '').split(/[\n/]+/).map(s => s.trim()).filter(Boolean).map(line => {const m=line.match(/^(.+?)\s+([+\-]?\d.*)$/);return m?{stat:m[1],value:m[2]}:{stat:'',value:line}});
function loader(show) { document.querySelector('#loading')?.remove(); if (show) { const d=document.createElement('div'); d.className='loading'; d.id='loading'; d.innerHTML='<div><img src="/pepe-loading.gif" alt="로딩" onerror="this.style.display=\'none\'"><span>잠시만 기다려 주세요</span></div>'; document.body.append(d); } }
function row(label,value) {return value == null || !String(value).trim() ? '' : `<div class="stat-row"><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`;}
function card(x) { const img=publicImage(x.image_path); return `<article class="item"><div class="item-top"><button type="button" class="photo" data-image="${esc(x.image_path||'')}" title="원본 이미지 확대" ${!img?'disabled':''}>${img?`<img loading="lazy" src="${esc(img)}" alt="${esc(x.name)}">`:'이미지 없음'}</button><div><div class="stars">${x.starforce == null ? '' : '★ '+esc(x.starforce)+'성'}</div><h3>${esc(x.name)}</h3><div class="meta">${esc(x.server||'서버 미설정')}${x.item_level?' · Lv.'+esc(x.item_level):''}${x.equipment_type?' · '+esc(x.equipment_type):''}</div></div></div><div>${row('추가옵션',x.flame)}${row('주문서 작',x.scroll_info)}${row('잠재능력',[x.potential_grade,x.potential_lines].filter(Boolean).join('\n'))}${row('에디셔널',[x.additional_grade,x.additional_lines].filter(Boolean).join('\n'))}${row('가위 횟수',x.scissors_count==null?'':x.scissors_count+'회')}${row('업그레이드',x.upgrade_count==null?'':x.upgrade_count+'회')}${row('기타 옵션',x.extra_options)}</div>${x.description?`<div class="desc">${esc(x.description)}</div>`:''}<div class="item-bottom"><div><div class="price">${money(x.price)}</div><span class="status ${x.status==='판매 중'?'on':''}">${esc(x.status)}</span></div>${x.status==='판매 중'&&x.contact_url?`<a class="contact" href="${esc(x.contact_url)}" target="_blank" rel="noopener noreferrer">거래 문의</a>`:''}</div></article>`; }
function optionRows(kind, options, existing, count) { const parsed=kind==='flame'?parseFlame(existing):parseLines(existing); return `<div class="option-grid" data-kind="${kind}">${Array.from({length:count},(_,i)=>{const v=parsed[i]||{stat:'',value:''};const selected=options.includes(v.stat)?v.stat:'기타(직접 입력)';return `<div class="option-line"><select aria-label="${kind} ${i+1}번째 옵션" data-option-stat="${kind}" data-index="${i}">${opts(options,selected==='기타(직접 입력)'&& !v.stat?'':selected)}</select><input aria-label="${kind} ${i+1}번째 수치" data-option-value="${kind}" data-index="${i}" placeholder="예: +12%, +32, -2초" value="${esc(v.value)}"><input class="custom-stat" data-option-custom="${kind}" data-index="${i}" placeholder="기타 옵션명" value="${esc(selected==='기타(직접 입력)'&&v.stat!=='기타(직접 입력)'?v.stat:'')}" ${selected==='기타(직접 입력)'?'':'hidden'}></div>`}).join('')}</div>`; }
function adminPanel() {if(!session)return `<section class="panel"><h2>관리자 로그인</h2><form id="login">${field('이메일','email','','email','required autocomplete="username"')}${field('비밀번호','password','','password','required autocomplete="current-password"')}<button>로그인</button></form><p id="message" class="message"></p></section>`; if(!admin)return '<section class="panel"><h2>접근 권한 없음</h2><p>Supabase 관리자 권한을 확인하세요.</p></section>';
const x=items.find(i=>String(i.id)===String(editId))||{};
return `<section class="panel"><h2>카테고리 관리</h2><p class="muted">상품이 없는 카테고리도 손님 화면에 표시됩니다.</p><form id="addCategory" class="category-admin"><input name="name" maxlength="60" placeholder="새 카테고리 이름" required><button>추가</button></form><div>${categories.map(c=>`<span class="category-chip">${esc(c.name)} <button type="button" class="danger" data-remove-cat="${esc(c.id)}">×</button></span>`).join(' ')}</div><p id="categoryMessage" class="message"></p></section>
<section class="panel"><h2>${editId?'아이템 수정':'새 아이템 등록'}</h2><form id="itemForm"><div class="fields"><label>장비 세트 (선택 보조)<select id="gearSet"><option value="">세트 선택 안 함</option>${opts(Object.keys(sets),'')}</select></label><label>세트 내 장비 (선택 보조)<select id="gearItem"><option value="">장비를 먼저 선택하세요</option></select></label></div><p class="muted">장비 목록은 입력 보조용 예시입니다. 직업별 정확한 아이템명과 실제 아이콘은 아직 자동 연결되지 않습니다. 실제 아이템명을 확인해 입력하고, 게임 스크린샷을 별도로 업로드하세요.</p><div class="fields">${field('아이템 이름','name',x.name,'text','maxlength="100" required')}${field('서버','server',x.server||'루나','text','maxlength="50"')}<label>판매 카테고리<select name="category">${opts(categories.map(c=>c.name),x.category||categories[0]?.name)}</select></label><label>장비 종류<select name="equipment_type">${opts(equipment,x.equipment_type)}</select></label>${field('장비 레벨','item_level',x.item_level,'number','min="0"')}${field('스타포스','starforce',x.starforce,'number','min="0" max="30"')}<div class="price-field"><h3>가격 (메소)</h3>${priceFields(x.price)}</div><label>판매 상태<select name="status">${opts(states,x.status||'판매 중')}</select></label>${field('가위 횟수','scissors_count',x.scissors_count,'number','min="0"')}${field('업그레이드 가능 횟수','upgrade_count',x.upgrade_count,'number','min="0"')}<label>잠재 등급<select name="potential_grade">${opts(grades,x.potential_grade)}</select></label><label>에디 등급<select name="additional_grade">${opts(grades,x.additional_grade)}</select></label>${field('문의 링크 (https://)','contact_url',x.contact_url,'url','placeholder="https://open.kakao.com/..."')}</div>
<div class="option-section"><h3>추가옵션</h3><p class="muted">수치를 직접 입력하세요. 올스탯은 선택 목록의 맨 아래에 있습니다.</p>${optionRows('flame',statOptions,x.flame,6)}<label class="muted">추가옵션 직접 입력 (선택 사항)<textarea name="flame_extra" rows="2" placeholder="선택형에 없는 옵션을 입력">${esc(parseFlame(x.flame).slice(6).map(v=>[v.stat,v.value].filter(Boolean).join(' ')).join('\n'))}</textarea></label></div>
${area('주문서 강화','scroll_info',x.scroll_info,'주흔 30%, 놀긍 등')}
<div class="option-section"><h3>잠재능력 (3줄)</h3>${optionRows('potential',potentialOptions,x.potential_lines,3)}</div><div class="option-section"><h3>에디셔널 (3줄)</h3>${optionRows('additional',potentialOptions,x.additional_lines,3)}</div>
${area('기타 옵션','extra_options',x.extra_options,'소울, 특수 강화 등')}${area('상품 설명','description',x.description)}<label>아이템 원본 스크린샷 (JPG/PNG/WEBP, 최대 5MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp"></label>${x.image_path?'<p class="muted">현재 이미지 유지됨. 새 이미지를 올리면 교체됩니다.</p>':''}<div class="actions"><button id="save" type="submit">${editId?'수정 저장':'아이템 등록'}</button>${editId?'<button id="cancel" type="button" class="ghost">수정 취소</button>':''}</div><p id="message" class="message"></p></form></section><section class="panel"><h2>아이템 관리 (${items.length})</h2>${items.map(i=>`<div class="manage-row"><div><strong>${esc(i.name)}</strong><small>${esc(i.category)} · ${esc(i.status)} · ${money(i.price)}</small></div><div><button class="ghost" data-edit="${esc(i.id)}">수정</button><button class="danger" data-delete="${esc(i.id)}">삭제</button></div></div>`).join('')||'<p>등록된 아이템이 없습니다.</p>'}</section><section class="panel"><h2>관리자 비밀번호 변경</h2><form id="passwordForm">${field('새 비밀번호','password','','password','required minlength="8" autocomplete="new-password"')}${field('새 비밀번호 확인','confirm','','password','required minlength="8" autocomplete="new-password"')}<button>비밀번호 변경</button><p class="message" id="passwordMessage"></p></form></section>`; }
function render() {
 
function render() {
  const matches = items.filter(x =>
    `${x.name} ${x.description || ''} ${x.server || ''} ${x.potential_lines || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const names = categories.map(c => c.name);
  const orphans = matches.filter(x => !names.includes(x.category));

  const nav = [
    { name: '전체', count: matches.length },
    ...categories.map(c => ({
      name: c.name,
      count: matches.filter(x => x.category === c.name).length
    }))
  ];

  if (orphans.length) {
    nav.push({ name: '기타', count: orphans.length });
  }

  if (!nav.some(c => c.name === selectedCategory)) {
    selectedCategory = '전체';
  }

  const shown = selectedCategory === '전체'
    ? matches
    : selectedCategory === '기타'
      ? orphans
      : matches.filter(x => x.category === selectedCategory);

  const categoryButtons = nav.map(c => `
    <button
      type="button"
      class="category-nav-button ${selectedCategory === c.name ? 'active' : ''}"
      data-category="${esc(c.name)}"
      aria-pressed="${selectedCategory === c.name}"
    >
      <span>${esc(c.name)}</span>
      <small>${c.count}</small>
    </button>
  `).join('');

  const productList = shown.length
    ? `<div class="grid">${shown.map(card).join('')}</div>`
    : `<div class="market-empty">${
        search
          ? '검색 조건에 맞는 아이템이 없습니다.'
          : '등록된 아이템이 없습니다.'
      }</div>`;

  const marketView = `
    <div class="market-layout">
      <aside class="market-sidebar" aria-label="판매 카테고리">
        <h2>카테고리</h2>
        <nav class="category-nav">
          ${categoryButtons}
        </nav>
      </aside>

      <div class="market-content">
        <div class="toolbar">
          <input
            id="search"
            aria-label="아이템 검색"
            placeholder="아이템 이름, 서버, 옵션 검색"
            value="${esc(search)}"
          >
        </div>

        <div class="market-results-heading">
          <h2>${esc(selectedCategory)}</h2>
          <span>${shown.length}개 아이템</span>
        </div>

        ${productList}
      </div>
    </div>
  `;

  const logoutButton = session
    ? '<button id="logout" class="ghost">로그아웃</button>'
    : '';

  app.innerHTML = `
    <header>
      <div class="wrap head">
        <a class="logo" href="/">
          <img
            src="/pepe-logo.png"
            alt="주니어페페"
            onerror="this.style.display='none'"
          >
          주니어페페 <span>MARKET</span>
        </a>

        <div>
          <button id="adminToggle" class="ghost">
            ${adminView ? '상점 보기' : '관리자'}
          </button>
          ${logoutButton}
        </div>
      </div>
    </header>

    <main class="wrap">
      <section class="hero">
        <div class="eyebrow">MAPLESTORY ITEM MARKET</div>
        <h1>주니어페페 상점</h1>
        <p>
          판매 아이템을 한눈에 확인하고 문의하세요.
          결제는 홈페이지에서 진행하지 않습니다.
        </p>
      </section>

      ${adminView ? adminPanel() : marketView}
    </main>

    <footer>
      주니어페페 상점 · 게임사와 무관한 개인 홍보 페이지
    </footer>
  `;

  bind();
}

function collectOptions(form,kind) {return [...form.querySelectorAll(`[data-option-stat="${kind}"]`)].map(select=>{const i=select.dataset.index;const value=form.querySelector(`[data-option-value="${kind}"][data-index="${i}"]`).value.trim();const stat=select.value==='기타(직접 입력)'?form.querySelector(`[data-option-custom="${kind}"][data-index="${i}"]`).value.trim():select.value;return {stat,value};}).filter(x=>x.stat&&x.value).map(x=>`${x.stat} ${x.value}`).join('\n');}
function bind() {document.querySelector('#adminToggle').onclick=()=>{adminView=!adminView;editId=null;render()};document.querySelector('#logout')?.addEventListener('click',()=>sb.auth.signOut());document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{selectedCategory=b.dataset.category;render()}));document.querySelectorAll('[name^="price_"]').forEach(el=>el.addEventListener('input',()=>{const out=document.querySelector('#pricePreview');if(!out)return;try{out.textContent=money(readPrice(document.querySelector('#itemForm')))}catch{out.textContent='입력값을 확인하세요'}}));document.querySelector('#search')?.addEventListener('input',e=>{search=e.target.value;const p=e.target.selectionStart;render();const el=document.querySelector('#search');el.focus();el.setSelectionRange(p,p)});document.querySelector('#login')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)document.querySelector('#message').textContent=error.message});document.querySelector('#itemForm')?.addEventListener('submit',saveItem);document.querySelector('#addCategory')?.addEventListener('submit',addCategory);document.querySelector('#passwordForm')?.addEventListener('submit',changePassword);document.querySelector('#cancel')?.addEventListener('click',()=>{editId=null;render()});document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editId=b.dataset.edit;render();window.scrollTo(0,0)});document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removeItem(b.dataset.delete));document.querySelectorAll('[data-remove-cat]').forEach(b=>b.onclick=()=>removeCategory(b.dataset.removeCat));document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>openImage(b.dataset.image));document.querySelectorAll('[data-option-stat]').forEach(el=>el.addEventListener('change',()=>{const custom=document.querySelector(`[data-option-custom="${el.dataset.optionStat}"][data-index="${el.dataset.index}"]`);custom.hidden=el.value!=='기타(직접 입력)'}));const gearSet=document.querySelector('#gearSet'),gearItem=document.querySelector('#gearItem');gearSet?.addEventListener('change',()=>{const list=sets[gearSet.value]||[];gearItem.innerHTML='<option value="">직접 입력 또는 장비 선택</option>'+opts(list,'')});gearItem?.addEventListener('change',()=>{if(gearItem.value)document.querySelector('[name="name"]').value=gearItem.value});}
function openImage(path) {if(!path)return;const overlay=document.createElement('div');overlay.className='modal';overlay.innerHTML=`<div class="modal-content"><button class="ghost" type="button">닫기 ✕</button><img src="${esc(publicImage(path))}" alt="아이템 원본 이미지"></div>`;overlay.querySelector('button').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};document.body.append(overlay);}
async function load() {const [a,b]=await Promise.all([sb.from('items').select('*').order('created_at',{ascending:false}),sb.from('market_categories').select('*').order('sort_order',{ascending:true}).order('id',{ascending:true})]);if(a.error)console.error(a.error);else items=a.data||[];if(b.error){console.error(b.error);categories=defaults.map((name,i)=>({id:i,name}))}else categories=b.data||[];render();}
async function checkAdmin() {const {data,error}=await sb.rpc('is_admin');admin=!error&&data===true;}
async function addCategory(e) {e.preventDefault();if(!admin)return;const name=String(new FormData(e.target).get('name')).trim();if(!name)return;const {error}=await sb.from('market_categories').insert({name,sort_order:categories.length*10+10});if(error)document.querySelector('#categoryMessage').textContent=error.message;else await load();}
async function removeCategory(id) {if(!admin)return;const c=categories.find(x=>String(x.id)===String(id));if(!c)return;if(items.some(x=>x.category===c.name)){alert('이 카테고리에 등록된 아이템이 있어 삭제할 수 없습니다.');return}if(!confirm(`${c.name} 카테고리를 삭제할까요?`))return;const {error}=await sb.from('market_categories').delete().eq('id',id);if(error)alert(error.message);else await load();}
async function saveItem(e) {e.preventDefault();if(!admin)return;const form=e.target,f=new FormData(form),btn=document.querySelector('#save'),msg=document.querySelector('#message'),old=items.find(x=>String(x.id)===String(editId));let uploaded=null;btn.disabled=true;msg.textContent='저장 중...';loader(true);try{let image_path=old?.image_path||null;const file=f.get('image');if(file?.size){if(file.size>5*1024*1024)throw Error('이미지는 5MB 이하여야 합니다.');const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];if(!ext)throw Error('JPG, PNG, WEBP만 업로드할 수 있습니다.');uploaded=`${crypto.randomUUID()}.${ext}`;const {error}=await sb.storage.from('item-images').upload(uploaded,file,{contentType:file.type});if(error)throw error;image_path=uploaded;}const nullableNumber=k=>String(f.get(k)||'').trim()===''?null:Number(f.get(k));const link=String(f.get('contact_url')||'').trim();if(link&&!/^https:\/\/[^\s]+$/i.test(link))throw Error('문의 링크는 https:// 주소만 가능합니다.');const flame=[collectOptions(form,'flame'),String(f.get('flame_extra')||'').trim()].filter(Boolean).join('\n');const row={name:String(f.get('name')).trim(),server:String(f.get('server')||'').trim(),category:String(f.get('category')),equipment_type:String(f.get('equipment_type')||''),item_level:nullableNumber('item_level'),starforce:nullableNumber('starforce'),price:readPrice(form),status:String(f.get('status')),scissors_count:nullableNumber('scissors_count'),upgrade_count:nullableNumber('upgrade_count'),potential_grade:String(f.get('potential_grade')||''),additional_grade:String(f.get('additional_grade')||''),flame,scroll_info:String(f.get('scroll_info')||''),potential_lines:collectOptions(form,'potential'),additional_lines:collectOptions(form,'additional'),extra_options:String(f.get('extra_options')||''),description:String(f.get('description')||''),contact_url:link||null,image_path};if(!row.name)throw Error('아이템 이름을 입력하세요.');const result=old?await sb.from('items').update(row).eq('id',old.id):await sb.from('items').insert(row);if(result.error)throw result.error;if(old?.image_path&&uploaded)await sb.storage.from('item-images').remove([old.image_path]);editId=null;await load();}catch(err){if(uploaded)await sb.storage.from('item-images').remove([uploaded]);msg.textContent=err.message||'저장 실패';}finally{loader(false);btn.disabled=false;}}
async function removeItem(id) {if(!admin||!confirm('이 아이템을 삭제할까요?'))return;const old=items.find(x=>String(x.id)===String(id));const {error}=await sb.from('items').delete().eq('id',id);if(error){alert(error.message);return}if(old?.image_path)await sb.storage.from('item-images').remove([old.image_path]);await load();}
async function changePassword(e) {e.preventDefault();if(!admin)return;const f=new FormData(e.target),p=String(f.get('password')),msg=document.querySelector('#passwordMessage');if(p!==f.get('confirm')){msg.textContent='비밀번호가 일치하지 않습니다.';return}const {error}=await sb.auth.updateUser({password:p});msg.textContent=error?error.message:'비밀번호가 변경되었습니다.';if(!error)e.target.reset();}
async function start() {loader(true);try{const {data:{session:s}}=await sb.auth.getSession();session=s;await checkAdmin();await load();sb.auth.onAuthStateChange((_event,s)=>{session=s;setTimeout(async()=>{await checkAdmin();await load()},0)});channel=sb.channel('public-items-v2').on('postgres_changes',{event:'*',schema:'public',table:'items'},()=>load()).subscribe();}catch(err){console.error(err);app.innerHTML='<main class="wrap"><h1>연결 오류</h1><p>Supabase 연결을 확인하세요.</p></main>'}finally{loader(false);}}
start();
