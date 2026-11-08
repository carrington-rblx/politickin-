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
    });
    labelNodes.forEach((node,abbr) => node.classList.toggle('is-hidden',!!selected && regionByState.get(abbr) === selected));
    borderNodes.forEach((node,id) => node.classList.toggle('region-dissolve',!!selected && id === selected.id));
    totalNodes.forEach((node,id) => node.classList.toggle('is-visible',!!selected && id === selected.id));
    legend.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.region === selected?.id)));
    makeInfo(selected);
  };
  const hoverRegion = (region,on) => {
    if (selected) return;
    stateNodes.forEach((node,abbr) => node.classList.toggle('region-hover',on && regionByState.get(abbr) === region));
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
      const [topoModule, geoModule, topology] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/topojson-client@3/+esm'),
        import('https://cdn.jsdelivr.net/npm/d3-geo@3/+esm'),
        fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then(r=>{if(!r.ok)throw new Error('Map data unavailable');return r.json();})
      ]);
      const topo=topoModule.default||topoModule;
      const geo=geoModule.default||geoModule;
      const collection=topo.feature(topology,topology.objects.states);
      const projection=geo.geoAlbersUsa().fitExtent([[22,18],[938,574]],collection);
      const path=geo.geoPath(projection);
      const stateGeometries=topology.objects.states.geometries;
      const byId=new Map(stateGeometries.map(g=>[Number(g.id),g]));
      const drawLayer=el('g',{'class':'states-layer'});
      collection.features.filter(feature=>Number(feature.id)!==11).forEach(feature=>{
        const abbr=fips[Number(feature.id)],region=regionByState.get(abbr);
        if(!abbr||!region)return;
        stateFeatures.set(abbr,feature);
        const node=el('path',{d:path(feature),fill:region.color,'class':'state-shape','data-state':abbr,'data-region':region.id,tabindex:'0',role:'button','aria-label':abbr+', '+region.name+' region'},drawLayer);
        node.addEventListener('click',event=>{event.stopPropagation();setSelected(region);});
        node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(region);}});
        node.addEventListener('mouseenter',()=>hoverRegion(region,true));
        node.addEventListener('mouseleave',()=>hoverRegion(region,false));
        stateNodes.set(abbr,node);
      });
      const borders=topo.mesh(topology,topology.objects.states,(a,b)=>a!==b);
      const borderPath=path(borders);
      regions.forEach(region=>{
        const geometries=region.states.map(s=>byId.get(Object.keys(fips).find(k=>fips[k]===s))).filter(Boolean);
        const merged={type:'GeometryCollection',geometries};
        const centroid=path.centroid(merged);
        const center=el('text',{x:centroid[0],y:centroid[1],'class':'region-total','data-region':region.id},svg);
        center.textContent=region.ev+' EV';
        totalNodes.set(region.id,center);
        const labels=el('g',{'class':'labels-layer','data-region':region.id});
        region.states.forEach(abbr=>{
          const feature=stateFeatures.get(abbr);if(!feature)return;
          const [x,y]=path.centroid(feature);
          const label=el('text',{x,y,'class':'state-label','data-state':abbr},labels);
          label.textContent=abbr;
          labelNodes.set(abbr,label);
        });
        const internal=geometries.length>1?topo.mesh(topology,{type:'GeometryCollection',geometries},(a,b)=>region.states.includes(fips[Number(a.id)])&&region.states.includes(fips[Number(b.id)])):null;
        if(internal){
          const edge=el('path',{d:path(internal),'class':'state-borders','data-region':region.id});
          borderNodes.set(region.id,edge);
        }
      });
      // Draw the national boundary mesh above state fills and internal region boundaries.
      const boundary=el('path',{d:borderPath,'class':'state-borders national-borders'});
      boundary.setAttribute('stroke','#777');
      boundary.setAttribute('stroke-width','1.1');
      // DC is intentionally a separate, labeled callout rather than a region member.
      const dc=projection([-77.0369,38.9072]);
      if(dc){
        el('path',{d:'M '+(dc[0]-17)+' '+(dc[1]-15)+' L '+(dc[0]-4)+' '+(dc[1]-4),'class':'dc-leader'});
        el('circle',{cx:dc[0],cy:dc[1],r:5,'class':'dc-dot'});
        const label=el('text',{x:dc[0]-20,y:dc[1]-18,'text-anchor':'end','class':'dc-label'});
        label.textContent='DC · 3 EV';
      }
      // Clicking open map space clears the current region.
      svg.addEventListener('click',event=>{if(event.target===svg)setSelected(null);});
      loading?.classList.add('is-hidden');
    } catch(error) {
      if(loading)loading.textContent='The map could not load. Please check your connection and refresh.';
      console.error('Electoral map failed to initialize:',error);
    }
  };
  load();
})();
