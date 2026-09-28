// Scene-first controls: pointer exploration hides chrome; deliberate input restores it.
export function setupImmersiveUI(canvas) {
  const body=document.body;
  const hud=[...document.querySelectorAll('[data-hud]')];
  const more=document.querySelector('#more-options');
  const panel=document.querySelector('#hangar-options');
  const reveal=document.querySelector('#reveal-controls');
  const hover=matchMedia('(hover: hover)');
  let idleTimer, hintTimer, ready=false, quiet=false, keyboard=false, gesture=null,flight=false;
  const hasDialog=()=>!!document.querySelector('dialog[open]');
  const isHud=node=>hud.some(el=>el.contains(node));
  function schedule() {
    clearTimeout(idleTimer);
    if(ready&&!quiet&&!flight)idleTimer=setTimeout(()=>hide(),4200);
  }
  function show() {
    if(!ready||body.classList.contains('arriving'))return;
    quiet=false;body.classList.remove('ui-quiet');
    hud.forEach(el=>el.inert=false);
    if(document.activeElement===reveal)canvas.focus({preventScroll:true});
    reveal.hidden=true;schedule();
  }
  function hide(force=false) {
    if(!ready||flight||hasDialog()||body.classList.contains('arriving'))return;
    if(!force&&(!panel.hidden||(keyboard&&isHud(document.activeElement))||(hover.matches&&hud.some(el=>el.matches(':hover'))))){schedule();return;}
    closeOptions();quiet=true;clearTimeout(idleTimer);
    body.classList.add('ui-quiet','hint-dismissed');
    if(isHud(document.activeElement))canvas.focus({preventScroll:true});
    hud.forEach(el=>el.inert=true);reveal.hidden=false;
  }
  function closeOptions(restoreFocus=false) {
    panel.hidden=true;more.setAttribute('aria-expanded','false');
    if(restoreFocus)more.focus({preventScroll:true});
    schedule();
  }
  more.addEventListener('click',()=>{
    const opening=panel.hidden;
    panel.hidden=!opening;more.setAttribute('aria-expanded',String(opening));
    body.classList.add('hint-dismissed');
    if(opening&&keyboard)panel.querySelector('button').focus({preventScroll:true});
    schedule();
  });
  panel.addEventListener('click',event=>{
    const item=event.target.closest('button,a');
    if(item&&item.id!=='lights')closeOptions();
  });
  document.querySelector('#hide-controls').addEventListener('click',()=>hide(true));
  reveal.addEventListener('click',show);
  document.addEventListener('pointerdown',event=>{
    keyboard=false;
    if(!panel.hidden&&!panel.contains(event.target)&&!more.contains(event.target))closeOptions();
    if(event.target===canvas)gesture={x:event.clientX,y:event.clientY,moved:false};
  },{capture:true});
  document.addEventListener('pointermove',event=>{
    if(gesture&&event.buttons){
      if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>7){gesture.moved=true;hide(true);}
    }else if(event.pointerType!=='touch'&&!event.buttons)show();
  },{passive:true});
  document.addEventListener('pointerup',()=>{
    if(gesture&&!gesture.moved)show();
    gesture=null;
  },{passive:true});
  document.addEventListener('pointercancel',()=>{gesture=null;});
  canvas.addEventListener('wheel',()=>hide(true),{passive:true});
  document.addEventListener('keydown',event=>{
    keyboard=true;
    if(hasDialog())return;
    if(event.key==='Escape'&&!panel.hidden){closeOptions(true);event.preventDefault();return;}
    if(event.key.toLowerCase()==='h'&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!body.classList.contains('arriving')){
      event.preventDefault();quiet?show():hide(true);return;
    }
    show();
  },{capture:true});
  document.addEventListener('focusin',event=>{if(isHud(event.target))show();});
  for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>{
    show();
    // References is launched from a panel that closes behind the modal.
    if(dialog.id==='references')more.focus({preventScroll:true});
  });
  return {
    setFlight(active){flight=active;closeOptions();show();},
    arrive() {
      ready=false;quiet=false;clearTimeout(idleTimer);clearTimeout(hintTimer);
      closeOptions();body.classList.remove('ui-quiet');hud.forEach(el=>el.inert=false);reveal.hidden=true;
    },
    ready() {
      ready=true;show();
      hintTimer=setTimeout(()=>body.classList.add('hint-dismissed'),3600);
    },
  };
}
