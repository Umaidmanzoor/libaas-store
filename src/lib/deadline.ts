export async function withDeadline<T>(task:Promise<T>,milliseconds=10000):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([task,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("Request timed out")),milliseconds)})]);}
  finally{clearTimeout(timer);}
}
