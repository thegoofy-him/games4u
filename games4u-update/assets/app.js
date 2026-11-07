/* games4u — library page and game page */
(function(){
  var GAMES = (window.PORTSIDE_GAMES || []).filter(function(g){ return g && g.id && g.title; });

  var MODES = { solo:'1 player', local:'2 players, same device', online:'Online multiplayer' };
  var DIFFS = { easy:['Easy',1], medium:['Medium',2], hard:['Hard',3] };
  var CONTROLS = { keyboard:'Keyboard', mouse:'Mouse', touch:'Touch', gamepad:'Gamepad' };

  function $(s){ return document.querySelector(s); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function folder(g){ return 'games/' + encodeURIComponent(g.id) + '/'; }
  function asset(g, file){ return /^https?:\/\//.test(file) ? file : folder(g) + file; }
  function initials(t){ return String(t||'?').split(/\s+/).filter(Boolean).map(function(w){return w[0];}).join('').slice(0,3).toUpperCase(); }
  function pips(k){ var d = DIFFS[k]; if(!d) return ''; var h='<span class="diff" title="'+d[0]+'">'; for(var i=1;i<=3;i++) h+='<i class="'+(i<=d[1]?'on':'')+'"></i>'; return h+'</span> '+d[0]; }
  function playersShort(m){ m=m||[]; var p=[]; if(m.indexOf('solo')>=0)p.push('1P'); if(m.indexOf('local')>=0||m.indexOf('online')>=0)p.push('2P'); if(m.indexOf('online')>=0)p.push('Online'); return p.join(' · '); }
  function coverHtml(g){ return g.cover ? '<img class="cover" src="'+esc(asset(g,g.cover))+'" alt="" loading="lazy">' : '<div class="ph" aria-hidden="true">'+esc(initials(g.title))+'</div>'; }

  /* ---------------- library ---------------- */
  function library(){
    var fPlayers='any', fDiff='any', query='';
    function renderFilters(){
      var P=[['any','All'],['1','1 player'],['2','2 players']], D=[['any','Any'],['easy','Easy'],['medium','Medium'],['hard','Hard']];
      $('#f-players').innerHTML='<span class="lbl">Players</span>'+P.map(function(x){return '<button type="button" class="chip" data-k="'+x[0]+'" aria-pressed="'+(fPlayers===x[0])+'">'+x[1]+'</button>';}).join('');
      $('#f-diff').innerHTML='<span class="lbl">Difficulty</span>'+D.map(function(x){return '<button type="button" class="chip" data-k="'+x[0]+'" aria-pressed="'+(fDiff===x[0])+'">'+x[1]+'</button>';}).join('');
    }
    function renderGrid(){
      var grid=$('#grid');
      if(!GAMES.length){ grid.innerHTML='<div class="empty"><h3>No games yet</h3><p>The first games are being ported. Check back soon.</p></div>'; return; }
      var list=GAMES.filter(function(g){ var m=g.players||[];
        if(fPlayers==='1'&&m.indexOf('solo')<0) return false;
        if(fPlayers==='2'&&m.indexOf('local')<0&&m.indexOf('online')<0) return false;
        if(fDiff!=='any'&&g.difficulty!==fDiff) return false;
        if(query&&((g.title||'')+' '+(g.tagline||'')+' '+(g.genre||'')).toLowerCase().indexOf(query)<0) return false;
        return true; });
      if(!list.length){ grid.innerHTML='<div class="empty"><h3>No matches</h3><p>No games match these filters.</p></div>'; return; }
      grid.innerHTML=list.map(function(g){
        return '<a class="card" href="play.html?game='+encodeURIComponent(g.id)+'">'+coverHtml(g)+
          '<div class="meta"><h3>'+esc(g.title)+'</h3>'+(g.tagline?'<p>'+esc(g.tagline)+'</p>':'')+
          '<div class="facts">'+(g.genre?'<span class="fact">'+esc(g.genre)+'</span>':'')+
          (playersShort(g.players)?'<span class="fact">'+playersShort(g.players)+'</span>':'')+
          (g.difficulty?'<span class="fact">'+pips(g.difficulty)+'</span>':'')+'</div></div></a>';
      }).join('');
    }
    $('#f-players').addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;fPlayers=b.dataset.k;renderFilters();renderGrid();});
    $('#f-diff').addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;fDiff=b.dataset.k;renderFilters();renderGrid();});
    $('#q').addEventListener('input',function(e){query=e.target.value.trim().toLowerCase();renderGrid();});
    renderFilters(); renderGrid();
  }

  /* ---------------- game page ---------------- */
  function play(){
    var id=new URLSearchParams(location.search).get('game');
    var g=GAMES.filter(function(x){return x.id===id;})[0];
    var main=$('#play');
    if(!g){ main.innerHTML='<div class="empty" style="margin-top:30px"><h3>Game not found</h3><p>It may have been removed.</p><a class="btn" href="index.html">Back to all games</a></div>'; return; }
    document.title=g.title+' · games4u';
    var ar=String(g.aspect||'16:9').split(':'); var arCss=(+ar[0]||16)+'/'+(+ar[1]||9);
    var shots=g.screenshots||[], ctrl=(g.controls||[]).map(function(c){return CONTROLS[c]||c;});
    var phone=(g.controls||[]).indexOf('touch')>=0;
    main.innerHTML=
      '<div class="play-head"><a class="btn" href="index.html">← All games</a><h1>'+esc(g.title)+'</h1></div>'+
      '<div class="frame" id="frame" style="--ar:'+arCss+'">'+
        '<iframe id="game" title="'+esc(g.title)+'" allow="fullscreen; autoplay; gamepad; pointer-lock" allowfullscreen loading="lazy"></iframe>'+
        '<button class="start" id="start" type="button"><span><b>▶ Play</b><small>'+esc(ctrl.join(' · ')||'Click to start')+'</small></span></button>'+
      '</div>'+
      '<div class="toolbar"><button class="btn" id="b-restart" type="button">Restart</button><button class="btn" id="b-full" type="button">Full screen</button></div>'+
      '<div class="info"><div style="display:grid;gap:22px;min-width:0">'+
        (g.tagline?'<p class="tagline">'+esc(g.tagline)+'</p>':'')+
        (g.description?'<div><h2>About</h2><p class="prose">'+esc(g.description)+'</p></div>':'')+
        (g.howTo?'<div><h2>How to play</h2><p class="prose">'+esc(g.howTo)+'</p></div>':'')+
        (shots.length?'<div><h2>Screenshots</h2><div class="shots">'+shots.map(function(s,i){return '<img src="'+esc(asset(g,s))+'" alt="'+esc(g.title)+' screenshot '+(i+1)+'" loading="lazy">';}).join('')+'</div></div>':'')+
      '</div><aside class="side"><dl class="specs">'+
        ((g.players||[]).length?'<dt>Players</dt><dd>'+g.players.map(function(m){return MODES[m]||m;}).join(', ')+'</dd>':'')+
        (g.difficulty?'<dt>Difficulty</dt><dd>'+pips(g.difficulty)+'</dd>':'')+
        (g.genre?'<dt>Genre</dt><dd>'+esc(g.genre)+'</dd>':'')+
        (ctrl.length?'<dt>Controls</dt><dd>'+esc(ctrl.join(', '))+'</dd>':'')+
        (g.session?'<dt>Session</dt><dd>'+esc(g.session)+'</dd>':'')+
        '<dt>Phones</dt><dd>'+(phone?'Works on phones':'Best on a computer')+'</dd></dl>'+
        '<div><h2>Credits</h2>'+(g.author?'<div>Made by <b>'+esc(g.author)+'</b></div>':'')+(g.license?'<div>License: <b>'+esc(g.license)+'</b></div>':'')+
        (g.source?'<div class="src"><a href="'+esc(g.source)+'" target="_blank" rel="noopener">'+esc(g.source.replace(/^https?:\/\//,''))+'</a></div>':'')+'</div>'+
        '<p class="small">Ported to games4u. All credit goes to the original creator.</p></aside></div>';

    var frame=$('#frame'), iframe=$('#game'), src=folder(g)+(g.entry||'index.html');
    function start(){ iframe.src=src; $('#start').hidden=true; iframe.addEventListener('load',function(){ try{iframe.focus();}catch(e){} },{once:true}); }
    $('#start').addEventListener('click',start);
    $('#b-restart').addEventListener('click',function(){ if($('#start').hidden){ iframe.src='about:blank'; setTimeout(function(){iframe.src=src;},30); } else start(); });
    $('#b-full').addEventListener('click',function(){
      if(!$('#start').hidden) start();
      var el=frame, req=el.requestFullscreen||el.webkitRequestFullscreen;
      if(document.fullscreenElement||document.webkitFullscreenElement){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); }
      else if(req){ var p=req.call(el); if(p&&p.catch)p.catch(function(){}); }
    });
    // keep arrow keys and space from scrolling the page while the game has focus nearby
    window.addEventListener('keydown',function(e){ if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key)>=0 && document.activeElement===document.body && $('#start').hidden){ e.preventDefault(); } });
  }

  if(document.body.dataset.page==='library') library();
  if(document.body.dataset.page==='play') play();
})();
