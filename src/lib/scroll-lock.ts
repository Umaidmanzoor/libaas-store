let locks=0;
let restore:(()=>void)|undefined;
export function lockPageScroll(){
 if(locks++===0){const y=window.scrollY,body=document.body;const original={position:body.style.position,top:body.style.top,width:body.style.width};body.style.position="fixed";body.style.top=`-${y}px`;body.style.width="100%";window.dispatchEvent(new CustomEvent("store-overlay",{detail:true}));restore=()=>{Object.assign(body.style,original);window.scrollTo(0,y);window.dispatchEvent(new CustomEvent("store-overlay",{detail:false}));};}
 let released=false;return ()=>{if(released)return;released=true;if(--locks===0){restore?.();restore=undefined;}};
}
