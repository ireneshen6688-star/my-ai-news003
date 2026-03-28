var a={},N=(R,_,M)=>(a.__chunk_9191=(v,S,x)=>{"use strict";var j=Object.create,u=Object.defineProperty,y=Object.getOwnPropertyDescriptor,i=Object.getOwnPropertyNames,O=Object.getPrototypeOf,b=Object.prototype.hasOwnProperty,p=(e,t,n,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of i(t))b.call(e,r)||r===n||u(e,r,{get:()=>t[r],enumerable:!(o=y(t,r))||o.enumerable});return e},w=((e,t)=>function(){return t||(0,e[i(e)[0]])((t={exports:{}}).exports,t),t.exports})({"../../node_modules/dedent-tabs/dist/dedent-tabs.js"(e){Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(t){for(var n=typeof t=="string"?[t]:t.raw,o="",r=0;r<n.length;r++)if(o+=n[r].replace(/\\\n[ \t]*/g,"").replace(/\\`/g,"`").replace(/\\\$/g,"$").replace(/\\\{/g,"{"),r<(1>=arguments.length?0:arguments.length-1)){var P=o.substring(o.lastIndexOf(`
`)+1).match(/^(\s*)\S?/);o+=((1>r+1||arguments.length<=r+1?void 0:arguments[r+1])+"").replace(/\n/g,`
`+P[1])}var d=o.split(`
`),l=null;if(d.forEach(function(s){var k=Math.min,h=s.match(/^(\s+)\S+/);if(h){var m=h[1].length;l=l?k(l,m):m}}),l!==null){var C=l;o=d.map(function(s){return s[0]===" "||s[0]==="	"?s.slice(C):s}).join(`
`)}return o.trim().replace(/\\n/g,`
`)}}}),c={};((e,t)=>{for(var n in t)u(e,n,{get:t[n],enumerable:!0})})(c,{getOptionalRequestContext:()=>g,getRequestContext:()=>E}),v.exports=p(u({},"__esModule",{value:!0}),c),x(6075);var f=((e,t,n)=>(n=e!=null?j(O(e)):{},p(!t&&e&&e.__esModule?n:u(n,"default",{value:e,enumerable:!0}),e)))(w()),q=Symbol.for("__cloudflare-request-context__");function g(){let e=_[q];if((process?.release?.name==="node"?"nodejs":"edge")=="nodejs")throw Error(f.default`
			\`getRequestContext\` and \`getOptionalRequestContext\` can only be run
			inside the edge runtime, so please make sure to have included
			\`export const runtime = 'edge'\` in all the routes using such functions
			(regardless of whether they are used directly or indirectly through imports).
		`);return e}function E(){let e=g();if(!e)throw process?.env?.NEXT_PHASE==="phase-production-build"?Error(f.default`
				\n\`getRequestContext\` is being called at the top level of a route file, this is not supported
				for more details see https://developers.cloudflare.com/pages/framework-guides/nextjs/ssr/troubleshooting/#top-level-getrequestcontext \n
			`):Error("Failed to retrieve the Cloudflare request context.");return e}},a.__chunk_6075=()=>{},a);export{N as __getNamedExports};
