const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
});

const navDropdown = navigation?.querySelector('.nav-dropdown');
const newsAnalysisLink = navDropdown?.querySelector('.nav-link');

newsAnalysisLink?.addEventListener('click', (event) => {
  if (window.matchMedia('(max-width: 850px)').matches && !navDropdown.classList.contains('open')) {
    event.preventDefault();
    navDropdown.classList.add('open');
    newsAnalysisLink.setAttribute('aria-expanded', 'true');
  }
});

navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    if (link.closest('.nav-dropdown-menu')) {
      const toast = document.querySelector('.toast');
      if (toast) {
        toast.textContent = 'Op-ed submissions are coming soon.';
        toast.classList.add('show');
        window.setTimeout(() => toast.classList.remove('show'), 2200);
      }
    } else if (link.classList.contains('nav-link')) {
      navigation.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('is-active'));
      link.classList.add('is-active');
    }
    if (!link.closest('.nav-dropdown-menu')) {
      navigation.classList.remove('open');
      navDropdown?.classList.remove('open');
      newsAnalysisLink?.setAttribute('aria-expanded', 'false');
      menuButton?.setAttribute('aria-expanded', 'false');
      menuButton?.setAttribute('aria-label', 'Open navigation');
    }
  });
});

const setActiveNavigationLink = () => {
  const currentHash = window.location.hash;
  if (!currentHash) return;
  const matchingLink = [...(navigation?.querySelectorAll('.nav-link') || [])]
    .find((link) => link.getAttribute('href') === currentHash);
  if (matchingLink) {
    navigation.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('is-active'));
    matchingLink.classList.add('is-active');
  }
};
window.addEventListener('hashchange', setActiveNavigationLink);
setActiveNavigationLink();

const newsletterForm = document.querySelector('#newsletter-form');
const formStatus = document.querySelector('.form-status');
newsletterForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#email');
  if (!email?.checkValidity()) {
    email?.reportValidity();
    return;
  }
  if (formStatus) {
    formStatus.textContent = 'Thanks for your interest! Newsletter delivery will be connected when an email platform is configured.';
  }
  newsletterForm.reset();
});

document.querySelectorAll('a[href="#support"], a[href="#shop"], a[href="#voter-guide"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = link.getAttribute('href');
    if (target === '#support' && link.classList.contains('btn')) return;
    if (target === '#shop' || target === '#voter-guide') {
      event.preventDefault();
      const toast = document.querySelector('.toast');
      if (toast) {
        toast.textContent = 'This section is coming soon.';
        toast.classList.add('show');
        window.setTimeout(() => toast.classList.remove('show'), 2200);
      }
    }
  });
});

/* Electoral map: render US state geometry and interactive eight-region aggregation. */
(() => {
  const svg = document.querySelector('#electoral-svg');
  const legend = document.querySelector('#electoral-legend');
  const info = document.querySelector('#region-info');
  const loading = document.querySelector('#map-loading');
  if (!svg || !legend || !info) return;

  const regions = [
    {id:'PC',name:'Pacific',ev:81,color:'#2bb673',states:['WA','OR','CA','AK','HI'],senateClasses:[1,2],districts:3},
    {id:'MW',name:'Mountain West',ev:49,color:'#d99b66',states:['NV','ID','MT','WY','UT','CO','AZ','NM'],senateClasses:[2],districts:1},
    {id:'PL',name:'Great Plains',ev:43,color:'#a55ea4',states:['ND','SD','NE','KS','OK','MN','IA','MO'],senateClasses:[1],districts:1},
    {id:'GF',name:'Gulf',ev:76,color:'#95c179',states:['TX','AR','LA','MS','AL'],senateClasses:[1],districts:2},
    {id:'GL',name:'Great Lakes',ev:68,color:'#2c5da9',states:['WI','IL','MI','IN','OH'],senateClasses:[2],districts:2},
    {id:'AP',name:'Appalachia',ev:68,color:'#598bbd',states:['KY','TN','WV','VA','PA'],senateClasses:[1],districts:2},
    {id:'CR',name:'Carolina',ev:71,color:'#b84e4e',states:['NC','SC','GA','FL'],senateClasses:[2],districts:2},
    {id:'NE',name:'New England',ev:75,color:'#be398b',states:['ME','NH','VT','MA','RI','CT','NY','NJ','DE','MD'],senateClasses:[1,2],districts:2}
  ];
  const fips = {1:'AL',2:'AK',4:'AZ',5:'AR',6:'CA',8:'CO',9:'CT',10:'DE',11:'DC',12:'FL',13:'GA',15:'HI',16:'ID',17:'IL',18:'IN',19:'IA',20:'KS',21:'KY',22:'LA',23:'ME',24:'MD',25:'MA',26:'MI',27:'MN',28:'MS',29:'MO',30:'MT',31:'NE',32:'NV',33:'NH',34:'NJ',35:'NM',36:'NY',37:'NC',38:'ND',39:'OH',40:'OK',41:'OR',42:'PA',44:'RI',45:'SC',46:'SD',47:'TN',48:'TX',49:'UT',50:'VT',51:'VA',53:'WA',54:'WV',55:'WI',56:'WY'};
  const regionByState = new Map(regions.flatMap(r => r.states.map(s => [s,r])));
  const ns = 'http://www.w3.org/2000/svg';
  let selected = null, stateNodes = new Map(), labelNodes = new Map(), totalNodes = new Map(), borderNodes = new Map(), stateFeatures = new Map();
  const el = (tag,attrs={},parent=svg) => {const node=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));parent.appendChild(node);return node;};
  const makeInfo = (region) => {
    const intro = document.getElementById('network-intro');
    if (!region) {
      info.classList.remove('is-open');
      if (intro) intro.hidden = false;
      info.innerHTML='';
      return;
    }
    if (intro) intro.hidden = true;
    info.classList.add('is-open');
    const senateCards = region.senateClasses.map((seatClass)=>'<article class="contact-member"><div class="contact-avatar" aria-hidden="true">+</div><div class="contact-member-copy"><span class="contact-role">U.S. SENATOR · CLASS '+seatClass+'</span><strong>Seat holder not added</strong><span class="contact-meta">Party not provided</span><span class="contact-discord">Discord contact coming soon</span></div></article>').join('');
    const repCards = Array.from({length:region.districts},(_,index)=>'<article class="contact-member"><div class="contact-avatar" aria-hidden="true">+</div><div class="contact-member-copy"><span class="contact-role">REGIONAL REPRESENTATIVE · SEAT '+(index+1)+'</span><strong>Seat holder not added</strong><span class="contact-meta">Party not provided</span><span class="contact-discord">Discord contact coming soon</span></div></article>').join('');
    info.innerHTML='<div class="directory-heading"><div><span class="directory-kicker">CONTACT YOUR REPRESENTATIVE</span><h3>'+region.name+' <span>REGION</span></h3></div><span class="directory-region-mark" style="--region-color:'+region.color+'">'+region.id+'</span></div><div class="contact-group"><div class="contact-group-title">U.S. SENATE</div><div class="contact-member-list">'+senateCards+'</div></div><div class="contact-group"><div class="contact-group-title">U.S. HOUSE</div><div class="contact-member-list">'+repCards+'</div></div>';
  };
  const setSelected = (region) => {
    selected = selected?.id === region?.id ? null : region;
    stateNodes.forEach((node,abbr) => {
      const own = regionByState.get(abbr);
      node.classList.toggle('is-muted',!!selected && own !== selected);
      node.classList.toggle('region-hover',!!selected && own === selected);
      node.classList.toggle('is-selected-region',!!selected && own === selected);
      if (own) node.style.setProperty('--region-color',own.color);
    });
    borderNodes.forEach((node,id) => node.classList.toggle('region-dissolve',!!selected && id === selected.id));
    legend.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.region === selected?.id)));
    makeInfo(selected);
  };
  const hoverRegion = (region,on) => {
    if (selected) return;
    stateNodes.forEach((node,abbr) => {const active=on && regionByState.get(abbr) === region;node.classList.toggle('region-hover',active);node.style.setProperty('--region-color',region.color);});
  };
  regions.forEach(region => {
    const button=document.createElement('button');
    button.type='button';button.dataset.region=region.id;button.setAttribute('aria-pressed','false');
    button.innerHTML='<span class="legend-swatch" style="background:'+region.color+'"></span><span class="legend-name">'+region.name+'</span><span class="legend-ev">'+region.ev+' EV</span>';
    button.addEventListener('click',()=>setSelected(region));
    button.addEventListener('mouseenter',()=>hoverRegion(region,true));
    button.addEventListener('mouseleave',()=>hoverRegion(region,false));
    legend.appendChild(button);
  });

  const load = async () => {
    try {
      // The state geometry is bundled with the site. No map CDN or mapping
      // libraries are required at runtime.
      const response=await fetch('./us_map.svg',{cache:'force-cache'});
      if(!response.ok) throw new Error('Bundled map file returned '+response.status);
      const source=await response.text();
      const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
      if(parsed.querySelector('parsererror')) throw new Error('Bundled map SVG is invalid');
      const sourceSvg=parsed.documentElement;
      const viewBox=sourceSvg.getAttribute('viewBox');
      if(viewBox) svg.setAttribute('viewBox',viewBox);
      else {
        const width=parseFloat(sourceSvg.getAttribute('width'))||962;
        const height=parseFloat(sourceSvg.getAttribute('height'))||583;
        svg.setAttribute('viewBox','0 0 '+width+' '+height);
      }
      const layer=el('g',{'class':'states-layer'});
      svg.appendChild(layer);
      const stateGroups=new Map();
      const bounds=[];
      regions.forEach(region=>{
        const regionLayer=el('g',{'class':'region-layer','data-region':region.id});
        const boxes=[];
        region.states.forEach(abbr=>{
          const sourceGroup=parsed.getElementById(abbr)||parsed.querySelector('[id="'+abbr+'"]');
          if(!sourceGroup) return;
          const group=document.createElementNS(ns,'g');
          group.setAttribute('class','state-unit');
          group.setAttribute('data-state',abbr);
          group.setAttribute('data-region',region.id);
          group.setAttribute('tabindex','0');
          group.setAttribute('role','button');
          group.setAttribute('aria-label',abbr+', '+region.name+' region');
          sourceGroup.querySelectorAll('path').forEach(original=>{
            const path=original.cloneNode(true);
            path.setAttribute('class','state-shape');
            path.removeAttribute('style');
            path.setAttribute('fill','#292929');
            group.appendChild(path);
          });
          sourceGroup.querySelectorAll('text').forEach(original=>{
            const label=original.cloneNode(true);
            label.setAttribute('class','state-label');
            label.removeAttribute('style');
            group.appendChild(label);
            labelNodes.set(abbr,label);
          });
          regionLayer.appendChild(group);
          stateGroups.set(abbr,group);
          group.addEventListener('click',event=>{event.stopPropagation();setSelected(region);});
          group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(region);}});
          group.addEventListener('mouseenter',()=>hoverRegion(region,true));
          group.addEventListener('mouseleave',()=>hoverRegion(region,false));
        });
        layer.appendChild(regionLayer);
      });
      stateGroups.forEach((node,abbr)=>stateNodes.set(abbr,node));
      // DC is shown as a clean map pin: its geographic footprint is too
      // small at this scale and the source file's leader-line artwork looks
      // like a stray triangle when cropped to the state geometry.
      const dcGroup=el('g',{'class':'dc-map-shape'},layer);
      el('circle',{cx:'800.1',cy:'242.4',r:'4.2','class':'dc-marker'},dcGroup);
      const dcLabel=el('text',{x:'808',y:'239','class':'dc-label'},dcGroup);
      dcLabel.textContent='DC';
      svg.addEventListener('click',event=>{if(event.target===svg)setSelected(null);});
      loading?.classList.add('is-hidden');
    } catch(error) {
      if(loading)loading.textContent='The map could not load. Please refresh to try again.';
      console.error('Electoral map failed to initialize:',error);
    }
  };
  load();
})();


// Cinematic intro: the soundtrack runs under continuous back-and-forth word motion.
(() => {
  const screen = document.getElementById('politickin-intro');
  if (!screen) return;
  const audio = document.getElementById('politickin-intro-audio');
  const prompt = document.getElementById('intro-sound-prompt');
  const soundButton = document.getElementById('intro-sound-button');
  const field = screen.querySelector('.intro-word-field');
  const words = [
    'BREAKING NEWS','DEMOCRACY','THE PEOPLE','ACCOUNTABILITY','WASHINGTON',
    'ELECTIONS','THE SENATE','THE HOUSE','PUBLIC POLICY','YOUR VOICE',
    'THE TRUTH','POWER','FREEDOM','THE PEOPLE DESERVE TO KNOW','POLITICS',
    'INDEPENDENT NEWS','THE VOTE','CIVIC POWER','THE BIG PICTURE','LIVE',
    'JUSTICE','THE CONSTITUTION','THE NATION','HOLD POWER ACCOUNTABLE'
  ];

  words.forEach((word,index) => {
    const item = document.createElement('span');
    item.className = 'intro-flying-word';
    item.textContent = word;
    item.style.setProperty('--x', ((index*37)%112-6)+'%');
    item.style.setProperty('--y', ((index*53)%108-4)+'%');
    item.style.setProperty('--size', (15+(index%5)*7)+'px');
    item.style.setProperty('--duration', (2.2+(index%5)*.55)+'s');
    item.style.setProperty('--delay', (-index*.31)+'s');
    item.style.setProperty('--rotate', ((index%7)-3)*8+'deg');
    item.style.setProperty('--opacity', (.42+(index%4)*.14).toFixed(2));
    item.style.setProperty('--distance', (38+(index%4)*19)+'vw');
    item.style.setProperty('--direction', index%2 ? '1' : '-1');
    field.appendChild(item);
  });

  const startAudio = () => {
    if (!audio) return;
    audio.volume = .82;
    const attempt = audio.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(() => {
        if (prompt) prompt.hidden = true;
      }).catch(() => {
        if (prompt) prompt.hidden = false;
      });
    }
  };

  const finishSequence = () => {
    if (screen.classList.contains('is-ending')) return;
    screen.classList.add('is-ending');
    if (prompt) prompt.hidden = true;
    window.setTimeout(() => screen.remove(), 1250);
  };

  audio?.addEventListener('ended', finishSequence, { once:true });
  audio?.addEventListener('error', () => {
    if (prompt) {
      prompt.hidden = false;
      soundButton.textContent = 'RETRY SOUND';
    }
  });

  soundButton?.addEventListener('click', () => {
    if (audio) {
      audio.currentTime = 0;
      startAudio();
    }
  });

  // Attempt immediate playback. If the browser blocks autoplay, the intro waits
  // for the visitor's tap and then runs for the full length of the soundtrack.
  startAudio();
})();
