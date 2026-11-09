// Shared metabolic ON/OFF criteria for every programming profile.
// S12 supplies the base references; the variants are app programming options.
export const METABOLIC_TIMINGS={
 activation:{seconds:240,on:30,off:10,minOn:20,variants:[[30,10],[25,15],[20,20]]},
 strength:{seconds:300,on:20,off:30,minOn:15,variants:[[20,30],[15,35]]},
 main:{seconds:720,on:25,off:20,minOn:15,variants:[[25,20],[20,25],[15,30]]},
 core:{seconds:240,on:25,off:15,minOn:15,variants:[[25,15],[20,20],[15,25]]},
 metabolic:{seconds:300,on:30,off:20,minOn:20,variants:[[30,20],[25,25],[20,30]]},
 recovery:{seconds:300,on:300,off:0,minOn:1,variants:[]}
};
