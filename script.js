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
    {id:'PC',name:'Pacific',ev:81,color:'#2bb673',states:['WA','OR','CA','AK','HI'],details:['1 Class 1 Senate seat','1 Class 2 Senate seat','3 Congressional Districts']},
    {id:'MW',name:'Mountain West',ev:49,color:'#d99b66',states:['NV','ID','MT','WY','UT','CO','AZ','NM'],details:['1 Class 2 Senate seat','1 Congressional District']},
    {id:'PL',name:'Great Plains',ev:43,color:'#a55ea4',states:['ND','SD','NE','KS','OK','MN','IA','MO'],details:['1 Class 1 Senate seat','1 Congressional District']},
    {id:'GF',name:'Gulf',ev:76,color:'#95c179',states:['TX','AR','LA','MS','AL'],details:['1 Class 1 Senate seat','2 Congressional Districts']},
    {id:'GL',name:'Great Lakes',ev:68,color:'#2c5da9',states:['WI','IL','MI','IN','OH'],details:['1 Class 2 Senate seat','2 Congressional Districts']},
    {id:'AP',name:'Appalachia',ev:68,color:'#598bbd',states:['KY','TN','WV','VA','PA'],details:['1 Class 1 Senate seat','2 Congressional Districts']},
    {id:'CR',name:'Carolina',ev:71,color:'#b84e4e',states:['NC','SC','GA','FL'],details:['1 Class 2 Senate seat','2 Congressional Districts']},
    {id:'NE',name:'New England',ev:75,color:'#be398b',states:['ME','NH','VT','MA','RI','CT','NY','NJ','DE','MD'],details:['1 Class 1 Senate seat','1 Class 2 Senate seat','2 Congressional Districts']}
  ];
  const fips = {1:'AL',2:'AK',4:'AZ',5:'AR',6:'CA',8:'CO',9:'CT',10:'DE',11:'DC',12:'FL',13:'GA',15:'HI',16:'ID',17:'IL',18:'IN',19:'IA',20:'KS',21:'KY',22:'LA',23:'ME',24:'MD',25:'MA',26:'MI',27:'MN',28:'MS',29:'MO',30:'MT',31:'NE',32:'NV',33:'NH',34:'NJ',35:'NM',36:'NY',37:'NC',38:'ND',39:'OH',40:'OK',41:'OR',42:'PA',44:'RI',45:'SC',46:'SD',47:'TN',48:'TX',49:'UT',50:'VT',51:'VA',53:'WA',54:'WV',55:'WI',56:'WY'};
  const regionByState = new Map(regions.flatMap(r => r.states.map(s => [s,r])));
  const ns = 'http://www.w3.org/2000/svg';
  let selected = null, stateNodes = new Map(), labelNodes = new Map(), totalNodes = new Map(), borderNodes = new Map(), stateFeatures = new Map();
  const el = (tag,attrs={},parent=svg) => {const node=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));parent.appendChild(node);return node;};
  const makeInfo = (region) => {
    if (!region) {
      info.innerHTML='<div class="region-info-empty"><span class="region-info-mark">+</span><div><strong>EXPLORE THE REGIONS</strong><p>Select a region on the map or in the key to see its electoral vote total and representation details.</p></div></div>';
      return;
    }
    info.innerHTML='<div class="region-info-top"><div class="region-info-title-wrap"><span class="region-info-chip" style="background:'+region.color+'"></span><strong class="region-info-title">'+region.name+' ('+region.id+')</strong></div><div class="region-info-ev">'+region.ev+' <small>EV</small></div></div><div class="region-info-details">'+region.details.map(d=>'<span><b>•</b> '+d+'</span>').join('')+'</div><p class="region-info-states">STATES: '+region.states.join(' · ')+'</p>';
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
    labelNodes.forEach((node,abbr) => node.classList.toggle('is-hidden',!!selected && regionByState.get(abbr) === selected));
    borderNodes.forEach((node,id) => node.classList.toggle('region-dissolve',!!selected && id === selected.id));
    totalNodes.forEach((node,id) => node.classList.toggle('is-visible',!!selected && id === selected.id));
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
      // Region vote totals are placed at the center of the combined state bounds.
      regions.forEach(region=>{
        const members=region.states.map(abbr=>stateGroups.get(abbr)).filter(Boolean);
        if(!members.length) return;
        const rects=members.map(node=>node.getBBox());
        const minX=Math.min(...rects.map(r=>r.x));
        const minY=Math.min(...rects.map(r=>r.y));
        const maxX=Math.max(...rects.map(r=>r.x+r.width));
        const maxY=Math.max(...rects.map(r=>r.y+r.height));
        const center=el('text',{x:(minX+maxX)/2,y:(minY+maxY)/2,'class':'region-total','data-region':region.id});
        center.textContent=region.ev+' EV';
        totalNodes.set(region.id,center);
      });
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
