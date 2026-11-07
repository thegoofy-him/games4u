/* Portside Arcade — developer tool: builds a games.js entry from the form */
(function(){
  function $(s){ return document.querySelector(s); }
  var existing = (window.PORTSIDE_GAMES || []).map(function(g){ return g.id; });
  var DRAFT_KEY = 'portside-dev-draft';
  var FIELDS = ['source','author','license','id','entry','aspect','title','tagline','description','howTo','cover','shots','genre','session'];

  function slug(t){ return String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40); }
  function checked(name){ return Array.prototype.map.call(document.querySelectorAll('input[name="'+name+'"]:checked'), function(i){ return i.value; }); }
  function val(id){ return $('#e-'+id).value.trim(); }

  function entry(){
    var shots = val('shots').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    var e = {
      id: val('id'), title: val('title'), tagline: val('tagline'),
      description: val('description'), howTo: val('howTo'),
      genre: val('genre'), difficulty: checked('difficulty')[0] || '',
      players: checked('players'), controls: checked('controls'), session: val('session'),
      entry: val('entry') || 'index.html', aspect: val('aspect'),
      cover: val('cover'), screenshots: shots,
      author: val('author'), license: val('license'), source: val('source')
    };
    Object.keys(e).forEach(function(k){ if(e[k]===''||(Array.isArray(e[k])&&!e[k].length)) delete e[k]; });
    return e;
  }
  function checks(e){
    var idOk = !!e.id && /^[a-z0-9-]+$/.test(e.id);
    return [
      ['Folder name: lowercase letters, numbers, dashes', idOk],
      ['Folder name not already used', idOk && existing.indexOf(e.id) < 0],
      ['Title', !!e.title], ['One-line pitch', !!e.tagline],
      ['Description', (e.description||'').length >= 20], ['How to play', !!e.howTo],
      ['Cover image', !!e.cover], ['Players chosen', !!(e.players&&e.players.length)],
      ['Difficulty chosen', !!e.difficulty], ['Controls chosen', !!(e.controls&&e.controls.length)],
      ['License checked', !!e.license]
    ];
  }
  function render(){
    var e = entry(), c = checks(e), ready = c.every(function(x){ return x[1]; });
    $('#checklist').innerHTML = c.map(function(x){ return '<li class="'+(x[1]?'ok':'')+'">'+x[0]+'</li>'; }).join('');
    $('#out').textContent = JSON.stringify(e, null, 2) + ',';
    $('#copy').disabled = !ready;
    $('#tag-count').textContent = (e.tagline||'').length + ' / 90';
    $('#id-echo').textContent = e.id || 'id';
    document.querySelectorAll('.id-echo2').forEach(function(n){ n.textContent = e.id || 'id'; });
    saveDraft();
  }
  function msg(t, cls){ var m=$('#msg'); m.textContent=t||''; m.className='msg '+(cls||''); m.hidden=!t; }

  function saveDraft(){
    var d = {}; FIELDS.forEach(function(f){ d[f]=$('#e-'+f).value; });
    ['players','difficulty','controls'].forEach(function(n){ d[n]=checked(n); });
    try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); }catch(err){}
  }
  function loadDraft(){
    var d; try{ d = JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'); }catch(err){}
    if(!d) return;
    FIELDS.forEach(function(f){ if(d[f]!=null) $('#e-'+f).value=d[f]; });
    ['players','difficulty','controls'].forEach(function(n){
      document.querySelectorAll('input[name="'+n+'"]').forEach(function(i){ i.checked=(d[n]||[]).indexOf(i.value)>=0; });
    });
  }

  $('#fill').addEventListener('click', function(){
    var m = val('source').match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[\/?#].*)?$/i);
    if(!m){ msg('Paste a GitHub repo link like https://github.com/owner/repo.','err'); return; }
    $('#e-source').value = 'https://github.com/'+m[1]+'/'+m[2];
    if(!val('author')) $('#e-author').value = m[1];
    if(!val('title')) $('#e-title').value = m[2].replace(/[-_.]+/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
    if(!val('id')) $('#e-id').value = slug(m[2]);
    msg('Filled in. Now read the repo’s LICENSE file and pick the license.','ok'); render();
  });
  $('#e-title').addEventListener('input', function(){ if(!$('#e-id').dataset.touched) $('#e-id').value = slug(val('title')); });
  $('#e-id').addEventListener('input', function(){ this.dataset.touched='1'; });
  $('#form').addEventListener('input', render);
  $('#form').addEventListener('change', render);
  $('#form').addEventListener('submit', function(e){ e.preventDefault(); });

  $('#copy').addEventListener('click', function(){
    var text = $('#out').textContent;
    function fallback(){ var r=document.createRange(); r.selectNodeContents($('#out')); var s=getSelection(); s.removeAllRanges(); s.addRange(r); msg('Selected. Press Ctrl+C (or ⌘+C) to copy.','ok'); }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ msg('Copied. Paste it into games.js.','ok'); }, fallback);
    } else fallback();
  });
  $('#reset').addEventListener('click', function(){
    $('#form').reset(); $('#e-entry').value='index.html'; delete $('#e-id').dataset.touched;
    try{ localStorage.removeItem(DRAFT_KEY); }catch(err){}
    msg(''); render();
  });

  loadDraft(); render();
})();
