// In-game replacements for browser prompt/confirm. No native dialog overrides.
let activeGameDialog=false;
function gameDialog(message,initial,entry=false){
 if(activeGameDialog)return Promise.resolve(entry?null:false);
 activeGameDialog=true;
 return new Promise(resolve=>{
 const previous=document.activeElement,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const shield=[...document.body.children].filter(e=>e.tagName!=='SCRIPT').map(e=>[e,e.inert]);shield.forEach(([e])=>e.inert=true);
 const overlay=document.createElement('div');overlay.id='game-dialog';overlay.className='modal-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','game-dialog-title');overlay.innerHTML=`<form class="modal"><div class="modal-header"><h3 id="game-dialog-title">${entry?'Enter Details':'Confirm Action'}</h3></div><div class="modal-body"><${entry?'label for="game-dialog-input"':'p'}>${esc(message)}</${entry?'label':'p'}>${entry?`<input type="text" id="game-dialog-input" value="${esc(initial)}" autocomplete="off">`:''}</div><div class="modal-footer"><button class="btn btn-secondary" type="button" id="game-dialog-cancel">Cancel</button><button class="btn btn-primary" type="submit">${entry?'Save':'Confirm'}</button></div></form>`;
 const close=ok=>{const value=entry?(ok?overlay.querySelector('input').value:null):ok;overlay.remove();shield.forEach(([e,was])=>e.inert=was);activeGameDialog=false;if(previous?.isConnected)previous.focus({preventScroll:true});resolve(value);};
 overlay.querySelector('form').onsubmit=e=>{e.preventDefault();close(true);};overlay.querySelector('#game-dialog-cancel').onclick=()=>close(false);
 overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close(false);}if(e.key==='Tab'){const nodes=[...overlay.querySelectorAll('input,button')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
 document.body.append(overlay);const target=entry?overlay.querySelector('input'):overlay.querySelector('#game-dialog-cancel');target.focus();if(entry)target.select();
 });
}
function gameConfirm(message){return gameDialog(message,'',false);}
function gamePrompt(message,initial=''){return gameDialog(message,initial,true);}
