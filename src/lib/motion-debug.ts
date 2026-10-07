import { ScrollTrigger } from "gsap/ScrollTrigger";
export function reportMotion(){
 document.documentElement.dataset.scrollTriggerCount=String(ScrollTrigger.getAll().length);
 if(process.env.NODE_ENV==="development")console.info("Scroll motion:",ScrollTrigger.getAll().length,"triggers");
}
