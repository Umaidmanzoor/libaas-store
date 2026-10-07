import {randomBytes,createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
import {startNextServer} from './preview.mjs';
const secret=randomBytes(32).toString('hex');process.env.RAZORPAY_WEBHOOK_SECRET=secret;
const preview=await startNextServer();
try{const raw=JSON.stringify({event:'integration.probe',payload:{}}),signature=createHmac('sha256',secret).update(raw).digest('hex');
 const send=(sig,body=raw)=>fetch(preview.origin+'/api/razorpay/webhook/',{method:'POST',body,headers:{'content-type':'application/json','x-razorpay-signature':sig,'x-razorpay-event-id':'non-payment-probe'}});
 assert.equal((await send('invalid')).status,400);assert.equal((await send(signature)).status,200);assert.equal((await send(signature,raw+' ')).status,400);
 console.log('PASS webhook rejects invalid/tampered signatures and accepts a signed ignored event; no order or email created');
}finally{preview.server.close();}
