'use strict';
// The shell, screen aperture and controls have independent coordinates.
const CONSOLE_LAYOUTS={
 classique:{screen:{x:43,y:53,w:274,h:235},pad:{x:78,y:373},buttons:[{x:258,y:376},{x:302,y:357}],systemY:467},
 grand:{screen:{x:21,y:40,w:318,h:332},pad:{x:78,y:437},buttons:[{x:258,y:442},{x:302,y:423}],systemY:493}
};
function consoleArtwork(mode,decor='decor.png'){
 const c=CONSOLE_LAYOUTS[mode],s=c.screen,p='pocket-'+mode,x=s.x+16,y=s.y+22,w=s.w-32,h=s.h-47;
 const chartBottom=y+h-8,chartH=mode==='grand'?31:22,photoTop=y+37,photoH=h-37-chartH-13;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 580" role="img" aria-label="Console portable Micro Rider, ${mode==='grand'?'grand écran':'écran classique'}">
 <defs>
 <linearGradient id="${p}-shell" x2=".8" y2="1"><stop stop-color="#ece9df"/><stop offset=".5" stop-color="#d4d1c5"/><stop offset="1" stop-color="#b8b6ac"/></linearGradient>
 <linearGradient id="${p}-edge" x2="0" y2="1"><stop stop-color="#fffdf7"/><stop offset="1" stop-color="#8e8e86"/></linearGradient>
 <linearGradient id="${p}-bezel" x2="1" y2="1"><stop stop-color="#777780"/><stop offset="1" stop-color="#4e505c"/></linearGradient>
 <linearGradient id="${p}-key" x2="0" y2="1"><stop stop-color="#45464a"/><stop offset="1" stop-color="#1e2024"/></linearGradient>
 <radialGradient id="${p}-button" cx=".32" cy=".25"><stop stop-color="#ba486c"/><stop offset=".65" stop-color="#8b294b"/><stop offset="1" stop-color="#5a1b37"/></radialGradient>
 <clipPath id="${p}-display"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/></clipPath>
 <filter id="${p}-shadow" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#0b1628" flood-opacity=".24"/></filter>
 </defs>
 <path d="M27 17H333Q346 17 346 32V513Q346 566 294 566H27Q14 566 14 552V32Q14 17 27 17Z" fill="#96998f" filter="url(#${p}-shadow)"/>
 <path d="M25 11H330Q341 11 341 25V506Q341 556 291 556H25Q13 556 13 543V25Q13 11 25 11Z" fill="url(#${p}-shell)" stroke="url(#${p}-edge)" stroke-width="2"/>
 <path d="M18 30H337M18 35H337" stroke="#aaa99f" stroke-opacity=".5"/>
 <path d="M25 17H329M20 45V535" stroke="#fffdf7" stroke-opacity=".55" fill="none"/>
 <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="13" fill="url(#${p}-bezel)" stroke="#888a8b"/>
 <path d="M${s.x+17} ${s.y+12}H${s.x+s.w-18}" stroke="#ba5475" stroke-width="2"/>
 <rect x="${x-3}" y="${y-3}" width="${w+6}" height="${h+6}" rx="5" fill="#202b34"/>
 <g clip-path="url(#${p}-display)">
 <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#142c37"/>
 <image href="${decor}" x="${x}" y="${photoTop}" width="${w}" height="${photoH}" preserveAspectRatio="xMidYMid slice"/>
 <rect x="${x}" y="${y}" width="${w}" height="37" fill="#102433"/>
 <text x="${x+9}" y="${y+23}" fill="#f5e8a1" font-family="monospace" font-size="20" font-weight="bold">215<tspan font-size="10"> W</tspan></text>
 <text x="${x+w-8}" y="${y+15}" fill="#a5dfdc" font-family="monospace" font-size="10" text-anchor="end">84 RPM</text>
 <text x="${x+w-8}" y="${y+29}" fill="#dae9ef" font-family="monospace" font-size="10" text-anchor="end">24 KM/H</text>
 <rect x="${x}" y="${photoTop+photoH}" width="${w}" height="${chartH+13}" fill="#102433"/>
 ${[.27,.42,.57,.8,.4,.8,.96,.35].map((v,i)=>`<rect x="${x+7+i*(w-14)/8}" y="${chartBottom-v*chartH}" width="${(w-14)/8-2}" height="${v*chartH}" fill="${['#84909c','#40b6d8','#54ba86','#edbf47','#84909c','#edbf47','#e27850','#40b6d8'][i]}"/>`).join('')}
 <path d="M${x+w*.38} ${chartBottom-chartH-3}V${chartBottom+2}" stroke="#fff6de" stroke-width="2"/>
 </g>
 <circle cx="${s.x+8}" cy="${s.y+s.h-11}" r="2" fill="#a7c38c"/><text x="${s.x+17}" y="${s.y+s.h-8}" fill="#b7bcc6" font-family="sans-serif" font-size="5.5" letter-spacing="1">COLOR / RIDE SYSTEM</text>
 <text x="34" y="${s.y+s.h+24}" fill="#3f4d71" font-family="sans-serif" font-size="12" font-weight="bold" font-style="italic">MICRO RIDER <tspan font-size="10" letter-spacing="2">POCKET</tspan></text>
 <g data-pad="" transform="translate(${c.pad.x} ${c.pad.y})">
 <path d="M-10-30H10V-10H30V10H10V30H-10V10H-30V-10H-10Z" fill="#88887f" transform="translate(0 3)"/>
 <path d="M-10-28H10V-10H28V10H10V28H-10V10H-28V-10H-10Z" fill="url(#${p}-key)" stroke="#17191c" stroke-width="1.5"/>
 <path d="M-7-24H7M-24-7V7M24-7V7" fill="none" stroke="#727476" stroke-width="1"/>
 <circle r="6" fill="#272a2e" stroke="#1b1e22"/><path data-direction="" d="" fill="#8e9699"/>
 </g>
 ${c.buttons.map((b,i)=>`<g data-face="${i===0?'b':'a'}"><circle cx="${b.x}" cy="${b.y+2}" r="18" fill="#aaa79e"/><circle cx="${b.x}" cy="${b.y}" r="15.5" fill="url(#${p}-button)" stroke="#5d2039" stroke-width="1.5"/><path d="M${b.x-8} ${b.y-7}Q${b.x} ${b.y-12} ${b.x+7} ${b.y-7}" stroke="#df7e95" stroke-opacity=".6" fill="none"/><text x="${b.x}" y="${b.y+32}" text-anchor="middle" fill="#3f4d71" font-family="sans-serif" font-size="9" font-weight="bold">${i===0?'B':'A'}</text></g>`).join('')}
 <g transform="translate(146 ${c.systemY}) rotate(-18)"><rect width="28" height="9" rx="4.5" fill="#909189"/><rect x="1" width="26" height="6" rx="3" fill="#686d70"/></g>
 <g transform="translate(188 ${c.systemY}) rotate(-18)"><rect width="28" height="9" rx="4.5" fill="#909189"/><rect x="1" width="26" height="6" rx="3" fill="#686d70"/></g>
 <text x="151" y="${c.systemY+23}" fill="#626875" font-family="sans-serif" font-size="6.5" letter-spacing=".7">SELECT</text><text x="193" y="${c.systemY+23}" fill="#626875" font-family="sans-serif" font-size="6.5" letter-spacing=".7">START</text>
 <g transform="translate(255 510) rotate(-27)">${[0,1,2,3,4].map(i=>`<rect x="${i*10}" y="0" width="4" height="34" rx="2" fill="#82857e"/><path d="M${i*10+1} 3V30" stroke="#5f655e"/>`).join('')}</g>
 <path d="M33 535H86" stroke="#c0bfb4" stroke-width="2"/><circle cx="30" cy="49" r="2" fill="#b0b1a7"/>
 </svg>`;
}
if(typeof module!=='undefined')module.exports={consoleArtwork,CONSOLE_LAYOUTS};
