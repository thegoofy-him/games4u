/* games4u — developer page: uploads a game to the site's GitHub repo and adds it to games.js */
(function(){
  'use strict';
  var API = 'https://api.github.com';
  var MAX_FILE = 50 * 1024 * 1024;           // skip single files over 50 MB
  var JUNK = /(^|\/)(\.git|\.github|node_modules|__MACOSX)(\/|$)|(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i;
  var MEDIA = 'games4u-media';                // where cover + screenshots go inside the game folder

  function $(s){ return document.querySelector(s); }
  function store(k, v){ try{ if(v === undefined) return localStorage.getItem(k); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){ return null; } }
  function slug(t){ return String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40); }
  function niceTitle(r){ return r.replace(/[-_.]+/g,' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); }).trim(); }
  function mb(n){ return (n/1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB'; }
  function msg(el, t, cls){ el.textContent = t || ''; el.className = 'msg ' + (cls||''); el.hidden = !t; }
  function checked(name){ return Array.prototype.map.call(document.querySelectorAll('input[name="'+name+'"]:checked'), function(i){ return i.value; }); }
  function val(id){ return $('#e-'+id).value.trim(); }
  function ext(name){ var m = /\.([a-z0-9]+)$/i.exec(name||''); return m ? m[1].toLowerCase() : 'png'; }

  /* ---------------- GitHub connection ---------------- */
  var gh = { owner:'', repo:'', token:'', branch:'main', ok:false };

  function api(path, opts){
    opts = opts || {};
    var headers = { 'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' };
    if(gh.token) headers.Authorization = 'Bearer ' + gh.token;
    if(opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body }).then(function(r){
      if(r.status === 204) return null;
      return r.json().catch(function(){ return {}; }).then(function(j){
        if(!r.ok){ var e = new Error(j.message || ('GitHub error ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function repoPath(){ return '/repos/' + gh.owner + '/' + gh.repo; }

  function guessRepo(){
    var saved = store('g4u-repo'); if(saved) return saved;
    var h = location.hostname;
    if(/\.github\.io$/i.test(h)){
      var owner = h.split('.')[0], first = location.pathname.split('/')[1];
      return owner + '/' + (first && !/\.html$/.test(first) ? first : h);
    }
    return '';
  }
  function showConnected(){
    $('#connect-form').hidden = gh.ok; $('#connected').hidden = !gh.ok;
    $('#conn-state').textContent = gh.ok ? 'connected' : 'not connected';
    $('#conn-label').textContent = gh.ok ? (gh.owner + '/' + gh.repo + ' · ' + gh.branch) : '';
    render();
  }
  function connect(silent){
    var m = $('#c-repo').value.trim().replace(/^https?:\/\/github\.com\//i,'').replace(/\/+$/,'').split('/');
    var token = $('#c-token').value.trim();
    var out = $('#c-msg');
    if(m.length < 2 || !m[0] || !m[1]){ if(!silent) msg(out, 'Type the repo as username/repo-name, for example tzuk123/games4u.', 'err'); return Promise.resolve(); }
    if(!token){ if(!silent) msg(out, 'Paste your access token.', 'err'); return Promise.resolve(); }
    gh.owner = m[0]; gh.repo = m[1]; gh.token = token;
    msg(out, 'Connecting…');
    return api(repoPath()).then(function(info){
      if(info.permissions && info.permissions.push === false) throw Object.assign(new Error('read-only'), { status: 403 });
      gh.branch = info.default_branch || 'main'; gh.ok = true;
      if($('#c-remember').checked){ store('g4u-repo', gh.owner + '/' + gh.repo); store('g4u-token', token); }
      msg(out, ''); showConnected();
    }).catch(function(e){
      gh.ok = false; showConnected();
      msg(out, e.status === 401 ? 'That token didn’t work. Copy the whole token and try again.'
        : e.status === 404 ? 'Repo not found. Check the name, and that the token includes this repo.'
        : e.status === 403 ? 'This account can’t edit the repo. Ask the owner to add you as a collaborator.'
        : 'Couldn’t reach GitHub. Check your internet connection.', 'err');
    });
  }
  $('#c-go').addEventListener('click', function(){ connect(false); });
  $('#c-out').addEventListener('click', function(){
    gh.ok = false; gh.token = ''; store('g4u-token', null); $('#c-token').value = ''; showConnected();
  });

  /* ---------------- game files ---------------- */
  // each file: { path, size, blob } (from computer) or { path, size, sha, from:{owner,repo} } (from GitHub)
  var files = [], filesFrom = null;

  function cleanList(list){
    var skipped = 0;
    list = list.filter(function(f){ if(JUNK.test(f.path)) return false; if(f.size > MAX_FILE){ skipped++; return false; } return true; });
    // strip one shared top folder (e.g. "game-main/…" from a GitHub zip)
    var firsts = {}; list.forEach(function(f){ firsts[f.path.split('/')[0]] = 1; });
    var keys = Object.keys(firsts);
    if(keys.length === 1 && list.every(function(f){ return f.path.indexOf('/') > 0; })){
      var cut = keys[0].length + 1; list.forEach(function(f){ f.path = f.path.slice(cut); });
    }
    return { list: list, skipped: skipped };
  }
  function pickEntry(list){
    var html = list.map(function(f){ return f.path; }).filter(function(p){ return /\.html?$/i.test(p); });
    var pref = ['index.html','dist/index.html','build/index.html','public/index.html','docs/index.html','src/index.html'];
    for(var i=0;i<pref.length;i++) if(html.indexOf(pref[i]) >= 0) return { all: html, best: pref[i] };
    html.sort(function(a,b){ var d = a.split('/').length - b.split('/').length; if(d) return d; return (/index\.html?$/i.test(b)?1:0) - (/index\.html?$/i.test(a)?1:0); });
    return { all: html, best: html[0] || '' };
  }
  function setFiles(list, from, label){
    var c = cleanList(list); files = c.list; filesFrom = from;
    var out = $('#files-msg');
    if(!files.length){ msg(out, 'No files found there.', 'err'); $('#entry-row').hidden = true; render(); return; }
    var e = pickEntry(files), total = files.reduce(function(s,f){ return s + (f.size||0); }, 0);
    var sel = $('#e-entry'); sel.innerHTML = '';
    e.all.forEach(function(p){ var o = document.createElement('option'); o.value = o.textContent = p; sel.appendChild(o); });
    sel.value = e.best; $('#entry-row').hidden = !e.all.length;
    var note = files.length + ' files · ' + mb(total) + ' · ' + label;
    if(c.skipped) note += ' · skipped ' + c.skipped + ' file(s) over 50 MB';
    if(!e.all.length){
      var hasPkg = files.some(function(f){ return f.path === 'package.json'; });
      msg(out, note + '. No HTML page found' + (hasPkg ? '. This game needs a build step (npm run build) before it can be added.' : '.'), 'err');
    } else msg(out, note, total > 200*1048576 ? 'err' : 'ok');
    render();
  }

  // from computer: folder
  $('#b-folder').addEventListener('click', function(){ $('#in-folder').click(); });
  $('#in-folder').addEventListener('change', function(){
    var list = Array.prototype.map.call(this.files, function(f){ return { path: f.webkitRelativePath || f.name, size: f.size, blob: f }; });
    setFiles(list, 'computer', 'from your computer'); this.value = '';
  });
  // from computer: zip
  $('#b-zip').addEventListener('click', function(){ $('#in-zip').click(); });
  $('#in-zip').addEventListener('change', function(){
    var file = this.files[0]; this.value = ''; if(!file) return;
    if(!window.JSZip){ msg($('#files-msg'), 'Couldn’t open zip files right now. Unzip it and choose the folder instead.', 'err'); return; }
    msg($('#files-msg'), 'Opening ' + file.name + '…');
    JSZip.loadAsync(file).then(function(zip){
      var jobs = [];
      zip.forEach(function(path, entry){ if(!entry.dir) jobs.push(entry.async('blob').then(function(b){ return { path: path, size: b.size, blob: b }; })); });
      return Promise.all(jobs);
    }).then(function(list){ setFiles(list, 'computer', 'from ' + file.name); })
      .catch(function(){ msg($('#files-msg'), 'That zip file couldn’t be opened.', 'err'); });
  });
  // from computer: drag and drop
  var drop = $('#drop');
  drop.addEventListener('dragover', function(e){ e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function(){ drop.classList.remove('over'); });
  drop.addEventListener('drop', function(e){
    e.preventDefault(); drop.classList.remove('over');
    var items = e.dataTransfer.items, entries = [];
    for(var i=0;i<items.length;i++){ var en = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry(); if(en) entries.push(en); }
    if(!entries.length) return;
    if(entries.length === 1 && entries[0].isFile && /\.zip$/i.test(entries[0].name)){
      entries[0].file(function(f){ var dt = new DataTransfer(); dt.items.add(f); $('#in-zip').files = dt.files; $('#in-zip').dispatchEvent(new Event('change')); }); return;
    }
    msg($('#files-msg'), 'Reading files…');
    var list = [];
    function walk(en, prefix){
      return new Promise(function(res){
        if(en.isFile){ en.file(function(f){ list.push({ path: prefix + f.name, size: f.size, blob: f }); res(); }, function(){ res(); }); return; }
        var reader = en.createReader(), all = [];
        (function more(){ reader.readEntries(function(batch){
          if(!batch.length){ Promise.all(all.map(function(c){ return walk(c, prefix + en.name + '/'); })).then(res); return; }
          all = all.concat(Array.prototype.slice.call(batch)); more();
        }, function(){ res(); }); })();
      });
    }
    Promise.all(entries.map(function(en){ return walk(en, ''); })).then(function(){ setFiles(list, 'computer', 'from your computer'); });
  });

  // from GitHub link
  function parseRepo(s){ var m = /github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[\/?#].*)?$/i.exec(s||''); return m ? { owner: m[1], repo: m[2] } : null; }
  $('#b-import').addEventListener('click', function(){
    var src = parseRepo(val('source')), out = $('#files-msg');
    if(!src){ msg(out, 'Paste a GitHub link like https://github.com/owner/repo.', 'err'); return; }
    if(!gh.ok){ msg(out, 'Connect to GitHub first (step 1).', 'err'); return; }
    $('#e-source').value = 'https://github.com/' + src.owner + '/' + src.repo;
    msg(out, 'Reading ' + src.owner + '/' + src.repo + '…');
    var info;
    api('/repos/' + src.owner + '/' + src.repo).then(function(i){
      info = i;
      if(!val('author')) $('#e-author').value = src.owner;
      if(!val('title')) $('#e-title').value = niceTitle(src.repo);
      var lic = i.license && i.license.spdx_id;
      if(lic && !$('#e-license').value){ var map = { MIT:'MIT', 'Apache-2.0':'Apache-2.0', 'GPL-3.0':'GPL-3.0', 'MPL-2.0':'MPL-2.0', 'BSD-2-Clause':'BSD', 'BSD-3-Clause':'BSD' }; if(map[lic]) $('#e-license').value = map[lic]; }
      return api('/repos/' + src.owner + '/' + src.repo + '/git/trees/' + encodeURIComponent(i.default_branch) + '?recursive=1');
    }).then(function(tree){
      var list = (tree.tree||[]).filter(function(t){ return t.type === 'blob'; }).map(function(t){ return { path: t.path, size: t.size||0, sha: t.sha, from: src }; });
      var lic = info.license && info.license.spdx_id;
      setFiles(list, 'github', 'from GitHub' + (tree.truncated ? ' (repo too big, some files missing)' : '') + (lic && lic !== 'NOASSERTION' ? ' · license: ' + lic : ' · no license found'));
    }).catch(function(e){
      msg(out, e.status === 404 ? 'That repo wasn’t found. Check the link (private repos can’t be imported).' : 'Couldn’t read that repo: ' + e.message, 'err');
    });
  });

  /* ---------------- images ---------------- */
  var cover = null, shots = [];
  function pic(file, i, kind){
    var d = document.createElement('div'); d.className = 'pic';
    var img = document.createElement('img'); img.src = URL.createObjectURL(file); img.alt = '';
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Remove';
    b.addEventListener('click', function(){ if(kind === 'cover') cover = null; else shots.splice(i,1); renderPics(); });
    d.appendChild(img); d.appendChild(b); return d;
  }
  function renderPics(){
    var c = $('#cover-pics'), s = $('#shot-pics'); c.innerHTML = ''; s.innerHTML = '';
    if(cover) c.appendChild(pic(cover, 0, 'cover'));
    shots.forEach(function(f, i){ s.appendChild(pic(f, i, 'shot')); });
    $('#b-cover').textContent = cover ? 'Change cover image' : 'Choose cover image';
    render();
  }
  $('#b-cover').addEventListener('click', function(){ $('#in-cover').click(); });
  $('#in-cover').addEventListener('change', function(){ if(this.files[0]) cover = this.files[0]; this.value=''; renderPics(); });
  $('#b-shots').addEventListener('click', function(){ $('#in-shots').click(); });
  $('#in-shots').addEventListener('change', function(){ shots = shots.concat(Array.prototype.slice.call(this.files)).slice(0, 8); this.value=''; renderPics(); });

  /* ---------------- entry + checklist ---------------- */
  var existing = (window.PORTSIDE_GAMES || []).map(function(g){ return g.id; });
  function gameId(){ return slug(val('title')); }
  function entry(){
    var e = {
      id: gameId(), title: val('title'), tagline: val('tagline'),
      description: val('description'), howTo: val('howTo'),
      genre: val('genre'), difficulty: checked('difficulty')[0] || '',
      players: checked('players'), controls: checked('controls'), session: val('session'),
      entry: $('#e-entry').value || 'index.html', aspect: val('aspect'),
      cover: cover ? MEDIA + '/cover.' + ext(cover.name) : '',
      screenshots: shots.map(function(f, i){ return MEDIA + '/shot' + (i+1) + '.' + ext(f.name); }),
      author: val('author'), license: val('license'), source: val('source')
    };
    Object.keys(e).forEach(function(k){ if(e[k] === '' || (Array.isArray(e[k]) && !e[k].length)) delete e[k]; });
    return e;
  }
  function checks(){
    var e = entry();
    return [
      ['Connected to GitHub', gh.ok],
      ['Game files with a start page', files.length > 0 && !!$('#e-entry').value],
      ['Title', !!e.title],
      ['Title not already used', !!e.id && existing.indexOf(e.id) < 0],
      ['One-line pitch', !!e.tagline], ['Description', (e.description||'').length >= 20], ['How to play', !!e.howTo],
      ['Cover image', !!cover], ['Players chosen', !!(e.players && e.players.length)],
      ['Difficulty chosen', !!e.difficulty], ['Controls chosen', !!(e.controls && e.controls.length)],
      ['License checked', !!e.license]
    ];
  }
  var busy = false;
  function render(){
    var c = checks();
    $('#checklist').innerHTML = c.map(function(x){ return '<li class="'+(x[1]?'ok':'')+'">'+x[0]+'</li>'; }).join('');
    $('#b-publish').disabled = busy || !c.every(function(x){ return x[1]; });
    $('#tag-count').textContent = val('tagline').length + ' / 90';
  }
  $('#form').addEventListener('input', render);
  $('#form').addEventListener('change', render);
  $('#form').addEventListener('submit', function(e){ e.preventDefault(); });

  /* ---------------- publish ---------------- */
  function blobToB64(blob){
    return new Promise(function(res, rej){ var r = new FileReader(); r.onload = function(){ res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(blob); });
  }
  function b64ToText(b64){ var bin = atob(b64.replace(/\s/g,'')), bytes = new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); }
  function insertEntry(text, json){
    var idx = text.lastIndexOf('];');
    if(idx < 0) throw new Error('games.js looks different than expected. Ask for help before publishing.');
    var before = text.slice(0, idx).replace(/\s+$/,'');
    var last = before.slice(-1);
    var sep = (last === '[' || last === ',') ? '' : ',';
    return before + sep + '\n  ' + json.replace(/\n/g, '\n  ') + ',\n' + text.slice(idx);
  }
  function bar(done, total){ $('#progress').hidden = false; $('#bar').style.width = Math.round(100 * done / Math.max(1,total)) + '%'; }
  function pool(items, n, fn){
    var i = 0, out = new Array(items.length);
    function next(){ if(i >= items.length) return Promise.resolve(); var k = i++; return fn(items[k], k).then(function(r){ out[k] = r; return next(); }); }
    var runners = []; for(var j=0;j<Math.min(n, items.length);j++) runners.push(next());
    return Promise.all(runners).then(function(){ return out; });
  }

  $('#b-publish').addEventListener('click', function(){
    if(busy) return;
    var e = entry(), out = $('#pub-msg'), R = repoPath();
    busy = true; render(); bar(0, 1);
    var head, baseTree, gamesJs;
    var uploads = files.map(function(f){ return { path: 'games/' + e.id + '/' + f.path, file: f }; });
    if(cover) uploads.push({ path: 'games/' + e.id + '/' + e.cover, file: { blob: cover } });
    shots.forEach(function(f, i){ uploads.push({ path: 'games/' + e.id + '/' + e.screenshots[i], file: { blob: f } }); });
    var total = uploads.length + 3, done = 0;

    msg(out, 'Checking the site…');
    api(R + '/git/ref/heads/' + encodeURIComponent(gh.branch)).then(function(ref){
      head = ref.object.sha;
      return api(R + '/git/commits/' + head);
    }).then(function(c){
      baseTree = c.tree.sha;
      return api(R + '/contents/games.js?ref=' + encodeURIComponent(gh.branch));
    }).then(function(g){
      gamesJs = b64ToText(g.content);
      if(new RegExp('"id":\\s*"' + e.id + '"').test(gamesJs)) throw new Error('A game with this title is already on the site. Change the title.');
      msg(out, 'Uploading ' + uploads.length + ' files…');
      return pool(uploads, 4, function(u){
        var getB64 = u.file.blob ? blobToB64(u.file.blob)
          : api('/repos/' + u.file.from.owner + '/' + u.file.from.repo + '/git/blobs/' + u.file.sha).then(function(b){ return b.content.replace(/\s/g,''); });
        return getB64.then(function(b64){
          return api(R + '/git/blobs', { method:'POST', body: JSON.stringify({ content: b64, encoding: 'base64' }) });
        }).then(function(b){ done++; bar(done, total); msg(out, 'Uploading files… ' + done + ' / ' + uploads.length); return { path: u.path, mode: '100644', type: 'blob', sha: b.sha }; });
      });
    }).then(function(tree){
      tree.push({ path: 'games.js', mode: '100644', type: 'blob', content: insertEntry(gamesJs, JSON.stringify(e, null, 2)) });
      msg(out, 'Saving…');
      return api(R + '/git/trees', { method:'POST', body: JSON.stringify({ base_tree: baseTree, tree: tree }) });
    }).then(function(t){
      done++; bar(done, total);
      return api(R + '/git/commits', { method:'POST', body: JSON.stringify({ message: 'Add game: ' + e.title, tree: t.sha, parents: [head] }) });
    }).then(function(c){
      done++; bar(done, total);
      return api(R + '/git/refs/heads/' + encodeURIComponent(gh.branch), { method:'PATCH', body: JSON.stringify({ sha: c.sha }) });
    }).then(function(){
      bar(1, 1); busy = false; existing.push(e.id); render();
      out.className = 'msg ok'; out.hidden = false;
      out.innerHTML = 'Published! <b>' + e.title.replace(/[<>&]/g,'') + '</b> will be live in about a minute: <a href="play.html?game=' + encodeURIComponent(e.id) + '">open its page</a>.';
    }).catch(function(err){
      busy = false; render();
      msg(out, err.status === 403 || err.status === 404 ? 'GitHub refused the upload. Check your token has Contents: Read and write for this repo.'
        : err.status === 422 ? 'Someone else updated the site at the same moment. Click Publish again.'
        : err.status === 409 ? 'The repo is empty or busy. Make sure the site files are uploaded, then try again.'
        : (err.message || 'Something went wrong. Try again.'), 'err');
    });
  });

  $('#b-reset').addEventListener('click', function(){
    $('#form').reset(); files = []; cover = null; shots = []; filesFrom = null;
    $('#entry-row').hidden = true; $('#progress').hidden = true;
    msg($('#files-msg'), ''); msg($('#pub-msg'), ''); renderPics(); scrollTo(0, 0);
  });

  /* ---------------- start ---------------- */
  $('#c-repo').value = guessRepo();
  var savedToken = store('g4u-token');
  if(savedToken){ $('#c-token').value = savedToken; connect(true); } else showConnected();
  renderPics();
})();
