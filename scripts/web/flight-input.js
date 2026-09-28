const keys={KeyW:'forward',ArrowUp:'forward',KeyS:'brake',ArrowDown:'brake',KeyA:'yawLeft',ArrowLeft:'yawLeft',KeyD:'yawRight',ArrowRight:'yawRight',KeyQ:'left',KeyE:'right',Space:'up',KeyC:'down',ShiftLeft:'boost',ShiftRight:'boost'};
const limit=n=>Math.max(-1,Math.min(1,n));

export function flightInput({canvas,active,toggle,dock,reset,changeView}) {
  const held=new Set(),pressed=new Map(),pulses=new Map();
  const buttons=[...document.querySelectorAll('[data-flight-action]')];
  const stick=document.querySelector('#flight-stick');
  let gesture=null;
  const blocked=()=>document.hidden||!!document.querySelector('dialog[open]');
  const editable=target=>target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable="true"]');
  function releaseStick(){gesture=null;stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px');document.body.classList.remove('steering');}
  function clear(){held.clear();pressed.clear();pulses.clear();releaseStick();buttons.forEach(b=>b.classList.remove('is-pressed'));}
  function pulse(action){pulses.set(action,performance.now()+150);}
  function any(action){return [...held].some(code=>keys[code]===action)||[...pressed.values()].includes(action)||(pulses.get(action)||0)>performance.now();}
  function moveGesture(event){
    if(!gesture||event.pointerId!==gesture.id)return;
    const radius=gesture.onStick?44:110;
    gesture.x=limit((event.clientX-gesture.x0)/radius);gesture.y=limit((event.clientY-gesture.y0)/radius);
    const length=Math.max(1,Math.hypot(gesture.x,gesture.y));gesture.x/=length;gesture.y/=length;
    stick.style.setProperty('--stick-x',`${gesture.x*34}px`);stick.style.setProperty('--stick-y',`${gesture.y*34}px`);
  }
  for(const button of buttons){
    button.addEventListener('pointerdown',event=>{
      if(!active()||blocked())return;
      event.preventDefault();button.setPointerCapture(event.pointerId);
      pressed.set(event.pointerId,button.dataset.flightAction);button.classList.add('is-pressed');
    });
    const release=event=>{pressed.delete(event.pointerId);button.classList.remove('is-pressed');};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
    button.addEventListener('click',()=>{if(active()&&!blocked())pulse(button.dataset.flightAction);});
  }
  for(const surface of [canvas,stick]){
    surface.addEventListener('pointerdown',event=>{
      if(!active()||blocked()||gesture||event.button!==0)return;
      event.preventDefault();surface.setPointerCapture(event.pointerId);
      const box=stick.getBoundingClientRect(),onStick=surface===stick;
      gesture={id:event.pointerId,surface,onStick,x0:onStick?box.x+box.width/2:event.clientX,y0:onStick?box.y+box.height/2:event.clientY,x:0,y:0};
      if(onStick)moveGesture(event);
      document.body.classList.add('steering');canvas.focus({preventScroll:true});
    });
    surface.addEventListener('pointermove',moveGesture);
    for(const name of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(name,event=>{if(gesture?.id===event.pointerId)releaseStick();});
  }
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||blocked()||editable(event.target)||event.metaKey||event.altKey)return;
    if(event.code==='KeyP'&&!event.repeat&&!event.ctrlKey){event.preventDefault();toggle();return;}
    if(!active())return;
    if(event.code==='Escape'){event.preventDefault();clear();dock();return;}
    if(event.code==='KeyR'&&!event.repeat&&!event.ctrlKey){event.preventDefault();clear();reset();return;}
    if(event.code==='KeyV'&&!event.repeat&&!event.ctrlKey){event.preventDefault();changeView();return;}
    if(event.ctrlKey)return;
    const action=keys[event.code];if(!action)return;
    if(event.code==='Space'&&event.target!==canvas&&event.target?.closest?.('button,a'))return;
    event.preventDefault();held.add(event.code);if(!event.repeat)pulse(action);
  },{capture:true});
  document.addEventListener('keyup',event=>held.delete(event.code));
  addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  for(const dialog of document.querySelectorAll('dialog')){
    new MutationObserver(()=>{if(dialog.open)clear();}).observe(dialog,{attributes:true,attributeFilter:['open']});
  }
  return {
    clear,
    sample(){
      if(!active()||blocked()){clear();return {};}
      for(const b of buttons)b.classList.toggle('is-pressed',any(b.dataset.flightAction));
      const engaged=gesture&&Math.hypot(gesture.x,gesture.y)>.08;
      const thrust=engaged?(gesture.onStick?Math.max(0,-gesture.y):1):0;
      const turn=engaged?-gesture.x:0;
      const climb=engaged&&!gesture.onStick?-gesture.y:0;
      return {forward:Math.max(Number(any('forward')),thrust),strafe:Number(any('right'))-Number(any('left')),rise:limit(Number(any('up'))-Number(any('down'))+climb),yaw:limit(Number(any('yawLeft'))-Number(any('yawRight'))+turn),boost:any('boost'),brake:Math.max(Number(any('brake')),engaged&&gesture.onStick?Math.max(0,gesture.y):0)};
    },
  };
}
