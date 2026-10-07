export function trustedOrigin(value:string|null,configured:(string|undefined)[],host:string|null,netlify:boolean){
 try{
  const origin=new URL(value||"");
  if(!["http:","https:"].includes(origin.protocol))return false;
  if(configured.some(value=>{try{return !!value&&origin.origin===new URL(value).origin;}catch{return false;}}))return true;
  return !netlify&&["localhost","127.0.0.1","[::1]"].includes(origin.hostname)&&origin.host===host;
 }catch{return false;}
}
