"use strict";var target,formatDate,types;window.fetch&&(target=window.location.href.replace("http://localhost:3000","https://dennisreimann.de"),formatDate=function(t){return new Date(t).toString().replace(/\w+\s(\w+)\s(\d+)\s(\d+)\s(\d+:\d+).*/,"$1 $2, $3 - $4")},types={reply:{items:[],template:function(t){return t.length?'\n          <div class="wbm-type wbm-replies">\n            <h4 class="wbm-headline">Replies</h4>\n            <div class="wbm-items">\n              '.concat(t.map(function(t){var n=t.data,e=n.url,a=n.author,c=n.content,n=n.published,t=t.activity.sentence;return'\n                <article class="wbm-item wbm-reply" title="'.concat(t,'">\n                  <header class="wbm-header">\n                    <a href="').concat(a.url,'" class="wbm-author">\n                      <img src="').concat(a.photo,'" alt="').concat(a.name,'" />\n                      <span>').concat(a.name,'</span>\n                    </a>\n                    <a href="').concat(e,'" class="wbm-time">\n                      <time datetime="').concat(n,'">').concat(formatDate(n),'</time>\n                    </a>\n                  </header>\n                  <div class="wbm-content">').concat(c,"</div>\n                </article>")}).join(""),"\n            </div>\n          </div>"):null}},link:{items:[],template:function(t){return t.length?'\n          <div class="wbm-type wbm-links">\n            <h4 class="wbm-headline">Links</h4>\n            <div class="wbm-items">\n              '.concat(t.map(function(t){var n=t.data,e=n.url,a=n.author,c=n.content,n=n.published,t=t.activity.sentence;return'\n                <article class="wbm-item wbm-link" title="'.concat(t,'">\n                  <header class="wbm-header">\n                    <a href="').concat(a.url,'" class="wbm-author">\n                      <img src="').concat(a.photo,'" alt="').concat(a.name,'" />\n                      <span>').concat(a.name,'</span>\n                    </a>\n                    <a href="').concat(e,'" class="wbm-time">\n                      <time datetime="').concat(n,'">').concat(formatDate(n),'</time>\n                    </a>\n                  </header>\n                  <div class="wbm-content">').concat(c,"</div>\n                </article>")}).join(""),"\n            </div>\n          </div>"):null}},like:{items:[],template:function(t){return t.length?'\n          <div class="wbm-type wbm-likes">\n            <h4 class="wbm-headline">Likes</h4>\n            <div class="wbm-items">\n              '.concat(t.map(function(t){var n=t.data,e=n.url,n=n.author,t=t.activity.sentence;return'\n                <a href="'.concat(e,'" class="wbm-item wbm-like wbm-author" title="').concat(t,'">\n                  <img src="').concat(n.photo,'" alt="').concat(n.name,'" />\n                </a>')}).join(""),"\n            </div>\n          </div>"):null}},repost:{items:[],template:function(t){return t.length?'\n          <div class="wbm-type wbm-reposts">\n            <h4 class="wbm-headline">Reposts</h4>\n            <div class="wbm-items">\n              '.concat(t.map(function(t){var n=t.data,e=n.url,n=n.author,t=t.activity.sentence;return'\n                <a href="'.concat(e,'" class="wbm-item wbm-repost wbm-author" title="').concat(t,'">\n                  <img src="').concat(n.photo,'" alt="').concat(n.name,'" />\n                </a>')}).join(""),"\n            </div>\n          </div>"):null}}},window.fetch("https://webmention.io/api/mentions?perPage=500&target=".concat(target)).then(function(t){return t.json()}).catch(function(t){}).then(function(t){t.links.forEach(function(t){var n=types[t.activity.type];n&&n.items.push(t)});var e=[];Object.keys(types).forEach(function(t){var n=types[t],t=n.items,t=(0,n.template)(t);t&&e.push(t)}),e.length&&(document.getElementById("articleMentions").innerHTML+="<h3>Feedback</h3>".concat(e.join("")))}).catch(function(t){}));