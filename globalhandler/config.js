"use strict";

const batchedMessages = new Map();
const rooms = new Map();

const gridcellsize = 100; 
const server_tick_rate = 16.4 //17
const matchmaking_timeout = 120000
const player_idle_timeout = 10000
const game_start_time = 1000
const game_win_rest_time = 10000
const room_max_open_time = 600000 //600000
const maxClients = 100;

const hitboxplayer = {
 xMin: 14,
 xMax: 14,
 yMin: 50,
 yMax: 43,
  }

const playerHitboxWidth = 60; 
const playerHitboxHeight = 120;

const validDirections = [-90, 0, 180, -180, 90, 45, 135, -135, -45];

const isValidDirection = (direction) => {
return validDirections.includes(direction);
  };

const teleporters = [
  { x: 700, y: 0, width: 50, height: 50, destination: { x: -700, y: 0 } },// Example teleporter
  // Add more teleporters as needed
];

const matchmaking = {
  1: {
    1: 800
  }
}

function matchmakingsp(target) {
  // Convert the nested object into an array of values and sort them
  const values = Object.values(matchmaking[1]).sort((a, b) => a - b);
  
  let higherBound = values[values.length - 1]; // Start with the last value
  
  for (let i = 0; i < values.length; i++) {
    if (target < values[i]) {
      higherBound = values[i];
      break;
    }
  }

  return higherBound;
}

const gamemodeconfig = {
  1: {
    can_hit_dummies: false,
    can_hit_players: true,
    maxplayers: 5,
    respawns_allowed: 0,
    playerhealth: 77,
    playerspeed: 2.4,         //(0.26 * server_tick_rate) / 17,
    zonespeed: 1.2,
    usezone: true,
    health_restore: true,
    placereward: [10, 8, 6, -1, -5],
    seasoncoinsreward: [25, 17, 12, 10, 7],
    show_timer: false,
    custom_map: 4,
    teamsize: 1,
  },
  2: {
    can_hit_dummies: false,
    can_hit_players: true,
    maxplayers: 2,
    respawns_allowed: 0,
    playerhealth: 150,
    playerspeed: 2.4,
    zonespeed: 1.2,
    usezone: true,
    health_restore: true,
    placereward: [16, -8],
    seasoncoinsreward: [25, 12],
    show_timer: false,
    custom_map: 2,
    teamsize: 1,
  },
  3: {
    can_hit_dummies: true,
    can_hit_players: false,
    maxplayers: 1,
    respawns_allowed: 1,
    playerhealth: 50,
    playerspeed: 2.4,
    usezone: false,
    zonespeed: 0.8,
    health_restore: false,
    placereward: [0],
    seasoncoinsreward: [0],
    show_timer: true,
    custom_map: 3,
    teamsize: 1,
    //health_autodamage: true,
  },
  4: {
    can_hit_dummies: false,
    can_hit_players: true,
    maxplayers: 8,
    respawns_allowed: Infinity,
    playerhealth: 100,
    playerspeed: 2.4,
    usezone: false,
    zonespeed: 0.8,
    health_restore: false,
    placereward: [7, -2],
    seasoncoinsreward: [17, 10],
    show_timer: true,
    //healspawner: true,
    custom_map: 5,
    teamsize: 2,
    matchtype: "td",
  },
};

const mapsconfig = {
  1: {
    walls: [{"x":-750,"y":800},{"x":700,"y":800},{"x":750,"y":800},{"x":-800,"y":750},{"x":-650,"y":750},{"x":-600,"y":750},{"x":-550,"y":750},{"x":-500,"y":750},{"x":-200,"y":750},{"x":400,"y":750},{"x":450,"y":750},{"x":500,"y":750},{"x":550,"y":750},{"x":600,"y":750},{"x":750,"y":750},{"x":-650,"y":700},{"x":-200,"y":700},{"x":-150,"y":700},{"x":600,"y":700},{"x":-650,"y":650},{"x":-150,"y":650},{"x":-100,"y":650},{"x":-50,"y":650},{"x":0,"y":650},{"x":50,"y":650},{"x":100,"y":650},{"x":150,"y":650},{"x":600,"y":650},{"x":-650,"y":600},{"x":650,"y":600},{"x":650,"y":550},{"x":-300,"y":450},{"x":-250,"y":450},{"x":-200,"y":450},{"x":-150,"y":450},{"x":150,"y":450},{"x":200,"y":450},{"x":250,"y":450},{"x":-550,"y":400},{"x":-250,"y":400},{"x":-200,"y":400},{"x":-150,"y":400},{"x":150,"y":400},{"x":200,"y":400},{"x":250,"y":400},{"x":-550,"y":350},{"x":200,"y":350},{"x":250,"y":350},{"x":-600,"y":300},{"x":-600,"y":250},{"x":100,"y":250},{"x":450,"y":250},{"x":-650,"y":200},{"x":-150,"y":200},{"x":100,"y":200},{"x":450,"y":200},{"x":-150,"y":150},{"x":100,"y":150},{"x":450,"y":150},{"x":500,"y":150},{"x":-450,"y":100},{"x":-150,"y":100},{"x":100,"y":100},{"x":450,"y":100},{"x":500,"y":100},{"x":-450,"y":50},{"x":-400,"y":50},{"x":-150,"y":50},{"x":100,"y":50},{"x":450,"y":50},{"x":500,"y":50},{"x":-500,"y":0},{"x":-450,"y":0},{"x":-150,"y":0},{"x":100,"y":0},{"x":400,"y":0},{"x":450,"y":0},{"x":500,"y":0},{"x":-500,"y":-50},{"x":500,"y":-50},{"x":-550,"y":-100},{"x":-500,"y":-100},{"x":500,"y":-100},{"x":550,"y":-100},{"x":-600,"y":-150},{"x":500,"y":-150},{"x":550,"y":-150},{"x":-600,"y":-200},{"x":-150,"y":-200},{"x":-100,"y":-200},{"x":-50,"y":-200},{"x":0,"y":-200},{"x":50,"y":-200},{"x":100,"y":-200},{"x":-400,"y":-400},{"x":250,"y":-400},{"x":600,"y":-400},{"x":-450,"y":-450},{"x":-400,"y":-450},{"x":-350,"y":-450},{"x":-100,"y":-450},{"x":200,"y":-450},{"x":250,"y":-450},{"x":550,"y":-450},{"x":600,"y":-450},{"x":-500,"y":-500},{"x":-450,"y":-500},{"x":-400,"y":-500},{"x":-150,"y":-500},{"x":-100,"y":-500},{"x":-50,"y":-500},{"x":200,"y":-500},{"x":250,"y":-500},{"x":550,"y":-500},{"x":600,"y":-500},{"x":-150,"y":-550},{"x":-100,"y":-550},{"x":-50,"y":-550},{"x":500,"y":-550},{"x":550,"y":-550},{"x":450,"y":-600},{"x":500,"y":-600},{"x":-750,"y":-650},{"x":-700,"y":-700},{"x":750,"y":-700},{"x":700,"y":-750},{"x":750,"y":-750}],
    width: 800,
    height: 800,
    spawns: [
      { x: 0, y: 0 },
      { x: 0, y: -700 },
      { x: 300, y: 300 },
      { x: 400, y: 400 },
      { x: 400, y: 450 },
    ]  
  },

  2: {  
    walls: [{"x":-125,"y":775},{"x":125,"y":775},{"x":-125,"y":725},{"x":125,"y":725},{"x":-125,"y":675},{"x":125,"y":675},{"x":-625,"y":625},{"x":-575,"y":625},{"x":-525,"y":625},{"x":-475,"y":625},{"x":-125,"y":625},{"x":125,"y":625},{"x":475,"y":625},{"x":525,"y":625},{"x":575,"y":625},{"x":625,"y":625},{"x":-625,"y":575},{"x":-425,"y":575},{"x":-125,"y":575},{"x":125,"y":575},{"x":425,"y":575},{"x":625,"y":575},{"x":-625,"y":525},{"x":-375,"y":525},{"x":-125,"y":525},{"x":125,"y":525},{"x":375,"y":525},{"x":625,"y":525},{"x":-625,"y":475},{"x":-125,"y":475},{"x":125,"y":475},{"x":625,"y":475},{"x":-575,"y":425},{"x":-125,"y":425},{"x":125,"y":425},{"x":575,"y":425},{"x":-525,"y":375},{"x":-125,"y":375},{"x":125,"y":375},{"x":525,"y":375},{"x":-475,"y":325},{"x":-125,"y":325},{"x":125,"y":325},{"x":475,"y":325},{"x":-775,"y":125},{"x":-725,"y":125},{"x":-675,"y":125},{"x":-625,"y":125},{"x":-575,"y":125},{"x":-525,"y":125},{"x":-475,"y":125},{"x":-425,"y":125},{"x":-375,"y":125},{"x":-325,"y":125},{"x":325,"y":125},{"x":375,"y":125},{"x":425,"y":125},{"x":475,"y":125},{"x":525,"y":125},{"x":575,"y":125},{"x":625,"y":125},{"x":675,"y":125},{"x":725,"y":125},{"x":775,"y":125},{"x":-775,"y":-125},{"x":-725,"y":-125},{"x":-675,"y":-125},{"x":-625,"y":-125},{"x":-575,"y":-125},{"x":-525,"y":-125},{"x":-475,"y":-125},{"x":-425,"y":-125},{"x":-375,"y":-125},{"x":-325,"y":-125},{"x":325,"y":-125},{"x":375,"y":-125},{"x":425,"y":-125},{"x":475,"y":-125},{"x":525,"y":-125},{"x":575,"y":-125},{"x":625,"y":-125},{"x":675,"y":-125},{"x":725,"y":-125},{"x":775,"y":-125},{"x":-475,"y":-325},{"x":-125,"y":-325},{"x":125,"y":-325},{"x":475,"y":-325},{"x":-525,"y":-375},{"x":-125,"y":-375},{"x":125,"y":-375},{"x":525,"y":-375},{"x":-575,"y":-425},{"x":-125,"y":-425},{"x":125,"y":-425},{"x":575,"y":-425},{"x":-625,"y":-475},{"x":-125,"y":-475},{"x":125,"y":-475},{"x":625,"y":-475},{"x":-625,"y":-525},{"x":-375,"y":-525},{"x":-125,"y":-525},{"x":125,"y":-525},{"x":375,"y":-525},{"x":625,"y":-525},{"x":-625,"y":-575},{"x":-425,"y":-575},{"x":-125,"y":-575},{"x":125,"y":-575},{"x":425,"y":-575},{"x":625,"y":-575},{"x":-625,"y":-625},{"x":-575,"y":-625},{"x":-525,"y":-625},{"x":-475,"y":-625},{"x":-125,"y":-625},{"x":125,"y":-625},{"x":475,"y":-625},{"x":525,"y":-625},{"x":575,"y":-625},{"x":625,"y":-625},{"x":-125,"y":-675},{"x":125,"y":-675},{"x":-125,"y":-725},{"x":125,"y":-725},{"x":-125,"y":-775},{"x":125,"y":-775}],
    width: 800,
    height: 800,
    spawns: [
      { x: 0, y: 0 },
      { x: 0, y: -800 },
      { x: 0, y: 800 },
      { x: -800, y: 0 },
      { x: 800, y: 0 },
    ]  
  },
  3: {
    walls: [{"x":-125,"y":325},{"x":-125,"y":275},{"x":-125,"y":225},{"x":-275,"y":175},{"x":-225,"y":175},{"x":-175,"y":175},{"x":-125,"y":175},{"x":525,"y":75},{"x":525,"y":25},{"x":525,"y":-25},{"x":525,"y":-75},{"x":525,"y":-125},{"x":-325,"y":-175},{"x":-275,"y":-175},{"x":-225,"y":-175},{"x":-175,"y":-175},{"x":525,"y":-175},{"x":-175,"y":-225},{"x":-125,"y":-225},{"x":-75,"y":-225},{"x":-25,"y":-225}],
    width: 400,
    height: 500,
    spawns: [
      {"x":-0,"y":0},
    ],
    dummies: {
      a1: { x: 100, y: 0, h: 100, sh: 100, t: 1 },
      a2: { x: 300, y: 0, h: 100, sh: 100, t: 1 },
      b3: { x: -100, y: 0, h: 500, sh: 500, t: 2 },
      b4: { x: -200, y: -400, h: 500, sh: 500, t: 2 },
    },
  },
  4: {  
    walls: [{"x":-175,"y":25,"type":4},{"x":-175,"y":-25,"type":4},{"x":-175,"y":-75,"type":4},{"x":175,"y":25,"type":4},{"x":175,"y":75,"type":4},{"x":225,"y":375,"type":4},{"x":175,"y":425,"type":4},{"x":125,"y":475,"type":4},{"x":225,"y":675,"type":4},{"x":175,"y":675,"type":4},{"x":75,"y":675,"type":4},{"x":125,"y":675,"type":4},{"x":25,"y":625,"type":4},{"x":-25,"y":575,"type":4},{"x":175,"y":875,"type":4},{"x":-125,"y":775,"type":4},{"x":-75,"y":775,"type":4},{"x":-25,"y":775,"type":4},{"x":-25,"y":825,"type":4},{"x":-25,"y":875,"type":4},{"x":-25,"y":925,"type":4},{"x":-175,"y":775,"type":4},{"x":225,"y":875,"type":4},{"x":225,"y":825,"type":4},{"x":275,"y":825,"type":4},{"x":325,"y":775,"type":4},{"x":-25,"y":225,"type":4},{"x":-25,"y":175,"type":4},{"x":25,"y":175,"type":4},{"x":25,"y":125,"type":4},{"x":-25,"y":125,"type":4},{"x":-75,"y":125,"type":4},{"x":125,"y":-25,"type":4},{"x":75,"y":-75,"type":4},{"x":-325,"y":275,"type":4},{"x":-325,"y":225,"type":4},{"x":-25,"y":375,"type":4},{"x":-125,"y":525,"type":4},{"x":-75,"y":525,"type":4},{"x":-25,"y":525,"type":4},{"x":-125,"y":375,"type":4},{"x":-225,"y":375,"type":4},{"x":-275,"y":375,"type":4},{"x":225,"y":-175,"type":4},{"x":225,"y":-225,"type":4},{"x":225,"y":-325,"type":4},{"x":225,"y":-275,"type":4},{"x":125,"y":-425,"type":4},{"x":75,"y":-475,"type":4},{"x":-125,"y":-525,"type":4},{"x":-175,"y":-525,"type":4},{"x":-175,"y":-475,"type":4},{"x":-275,"y":-375,"type":4},{"x":-175,"y":-425,"type":4},{"x":-225,"y":-375,"type":4},{"x":225,"y":-875,"type":4},{"x":-225,"y":-875,"type":4},{"x":-275,"y":-875,"type":4},{"x":-325,"y":-875,"type":4},{"x":275,"y":-875,"type":4},{"x":325,"y":-875,"type":4},{"x":175,"y":-825,"type":4},{"x":-175,"y":-825,"type":4},{"x":-75,"y":-825,"type":4},{"x":75,"y":-825,"type":4},{"x":125,"y":-775,"type":4},{"x":-125,"y":-775,"type":4},{"x":275,"y":-625,"type":4},{"x":225,"y":-625,"type":4},{"x":225,"y":-575,"type":4},{"x":175,"y":-575,"type":4},{"x":-225,"y":-675,"type":4},{"x":-225,"y":-725,"type":4},{"x":-275,"y":-775,"type":4},{"x":175,"y":275,"type":4},{"x":275,"y":575,"type":4},{"x":275,"y":-575,"type":5},{"x":-175,"y":-575,"type":5},{"x":225,"y":-825,"type":5},{"x":175,"y":-775,"type":5},{"x":-175,"y":-875,"type":5},{"x":325,"y":-25,"type":5},{"x":275,"y":-25,"type":5},{"x":275,"y":25,"type":5},{"x":325,"y":25,"type":5},{"x":375,"y":-25,"type":5},{"x":375,"y":-75,"type":5},{"x":-325,"y":25,"type":5},{"x":-375,"y":-25,"type":5},{"x":-375,"y":25,"type":5},{"x":-375,"y":-125,"type":5},{"x":-325,"y":-25,"type":5},{"x":-375,"y":-75,"type":5},{"x":-325,"y":-75,"type":5},{"x":-425,"y":-125,"type":5},{"x":-425,"y":-175,"type":5},{"x":-375,"y":575,"type":5},{"x":-325,"y":575,"type":5},{"x":-325,"y":525,"type":5},{"x":-325,"y":625,"type":5},{"x":-275,"y":575,"type":5},{"x":-275,"y":625,"type":5},{"x":-275,"y":675,"type":5},{"x":-325,"y":675,"type":5},{"x":325,"y":325,"type":5},{"x":375,"y":425,"type":5},{"x":375,"y":525,"type":5},{"x":375,"y":625,"type":5},{"x":375,"y":575,"type":5},{"x":375,"y":475,"type":5},{"x":425,"y":475,"type":5},{"x":425,"y":525,"type":5},{"x":425,"y":575,"type":5},{"x":475,"y":525,"type":5},{"x":425,"y":425,"type":5},{"x":325,"y":625,"type":5},{"x":325,"y":475,"type":5},{"x":325,"y":525,"type":5},{"x":325,"y":425,"type":5},{"x":325,"y":975,"type":5},{"x":375,"y":1025,"type":5},{"x":375,"y":975,"type":5},{"x":425,"y":1025,"type":5},{"x":375,"y":1075,"type":5},{"x":325,"y":1075,"type":5},{"x":325,"y":1025,"type":5},{"x":275,"y":1075,"type":5},{"x":-325,"y":1075,"type":5},{"x":-325,"y":1025,"type":5},{"x":-275,"y":1075,"type":5},{"x":-275,"y":1025,"type":5},{"x":-375,"y":1025,"type":5},{"x":-375,"y":975,"type":5},{"x":-325,"y":975,"type":5},{"x":-275,"y":975,"type":5},{"x":275,"y":-325,"type":5},{"x":25,"y":-625,"type":5},{"x":-25,"y":-625,"type":5},{"x":-25,"y":-275,"type":5},{"x":-75,"y":-275,"type":5},{"x":-75,"y":375,"type":5},{"x":-175,"y":375,"type":5}],
    width: 300,
    height: 1000,
    spawns: [{"x":0,"y":-0},{"x":256,"y":-457},{"x":-258,"y":-237},{"x":255,"y":173},{"x":-150,"y":651}],
   // spawns: [{"x":129,"y":-965},{"x":256,"y":-457},{"x":-258,"y":-237},{"x":255,"y":173},{"x":-150,"y":651}],
  },
  5: {  
    walls: [{"x":325,"y":-825,"type":6},{"x":-325,"y":825,"type":6},{"x":-325,"y":-825,"type":6},{"x":325,"y":825,"type":6},{"x":-325,"y":-775,"type":6},{"x":325,"y":775,"type":6},{"x":-275,"y":-725,"type":6},{"x":275,"y":725,"type":6},{"x":325,"y":-775,"type":6},{"x":-325,"y":775,"type":6},{"x":275,"y":-725,"type":6},{"x":-275,"y":725,"type":6},{"x":125,"y":-625,"type":6},{"x":-125,"y":625,"type":6},{"x":75,"y":-625,"type":6},{"x":-75,"y":625,"type":6},{"x":75,"y":-575,"type":6},{"x":-75,"y":575,"type":6},{"x":125,"y":-575,"type":6},{"x":-125,"y":575,"type":6},{"x":-125,"y":-625,"type":6},{"x":125,"y":625,"type":6},{"x":-75,"y":-625,"type":6},{"x":75,"y":625,"type":6},{"x":-75,"y":-575,"type":6},{"x":75,"y":575,"type":6},{"x":-125,"y":-575,"type":6},{"x":125,"y":575,"type":6},{"x":-275,"y":-475,"type":6},{"x":275,"y":475,"type":6},{"x":-275,"y":-425,"type":6},{"x":275,"y":425,"type":6},{"x":-325,"y":-425,"type":6},{"x":325,"y":425,"type":6},{"x":-325,"y":-475,"type":6},{"x":325,"y":475,"type":6},{"x":275,"y":-475,"type":6},{"x":-275,"y":475,"type":6},{"x":275,"y":-425,"type":6},{"x":-275,"y":425,"type":6},{"x":325,"y":-475,"type":6},{"x":-325,"y":475,"type":6},{"x":325,"y":-425,"type":6},{"x":-325,"y":425,"type":6},{"x":75,"y":-325,"type":6},{"x":-75,"y":325,"type":6},{"x":-75,"y":-325,"type":6},{"x":75,"y":325,"type":6},{"x":-75,"y":-275,"type":6},{"x":75,"y":275,"type":6},{"x":-75,"y":-225,"type":6},{"x":75,"y":225,"type":6},{"x":75,"y":-275,"type":6},{"x":-75,"y":275,"type":6},{"x":75,"y":-225,"type":6},{"x":-75,"y":225,"type":6},{"x":125,"y":-325,"type":6},{"x":-125,"y":325,"type":6},{"x":-125,"y":-325,"type":6},{"x":125,"y":325,"type":6},{"x":75,"y":-175,"type":6},{"x":-75,"y":175,"type":6},{"x":125,"y":-175,"type":6},{"x":-125,"y":175,"type":6},{"x":-75,"y":-175,"type":6},{"x":75,"y":175,"type":6},{"x":-125,"y":-175,"type":6},{"x":125,"y":175,"type":6},{"x":-325,"y":75,"type":6},{"x":325,"y":-75,"type":6},{"x":-375,"y":75,"type":6},{"x":375,"y":-75,"type":6},{"x":375,"y":75,"type":6},{"x":-375,"y":-75,"type":6},{"x":325,"y":75,"type":6},{"x":-325,"y":-75,"type":6},{"x":-325,"y":-125,"type":6},{"x":325,"y":125,"type":6},{"x":-325,"y":125,"type":6},{"x":325,"y":-125,"type":6}],
    width: 500,
    height: 800,
    spawns: [{"x":75,"y":-775},{"x":-75,"y":-775},{"x":-175,"y":-775},{"x":175,"y":-775},{"x":-75,"y":775},{"x":75,"y":775},{"x":175,"y":775},{"x":-175,"y":775}]  
  //  spawns: [{"x":75,"y":-775},{"x":-75,"y":-775},{"x":-75,"y":775},{"x":75,"y":775}]  
  },
};


/* 1: {
    cooldown: 800,
    distance: 300,
    maxexistingtime: 2000,
    maxbounces: 5,
    damage: 5,
    width: 5,
    height: 5,
    useplayerangle: false,
    bullets: [
             { angle: 0, speed: 30, delay: 0, offset: 0 },
       { angle: 0, speed: 30, delay: 50, offset: 10 },
       { angle: 0, speed: 30, delay: 100, offset: -10 },
         { angle: 0, speed: 30, delay: 150, offset: 0 },
       { angle: 0, speed: 30, delay: 200, offset: 10 },
       { angle: 0, speed: 30, delay: 250, offset: -10 },
     /* { angle: 90, speed: 13, delay: 0, offset: 0 },
      { angle: 0, speed: 13, delay: 0, offset: 0 },
      { angle: 180, speed: 13, delay: 0, offset: 0 },
      { angle: -90, speed: 13, delay: 0, offset: 0 },
      { angle: 45, speed: 13, delay: 0, offset: 0 },
      { angle: -45, speed: 13, delay: 0, offset: 0 },
      { angle: -135, speed: 13, delay: 0, offset: 0 },
      { angle: 135, speed: 13, delay: 0, offset: 0 }

  ]
  },
      */
  




const gunsconfig = {
  1: {
    cooldown: 500,
    distance: 300,
    maxexistingtime: 400,
    maxbounces: 5,
    damage: 12,
    width: 6,
    height: 8,
    useplayerangle: true,
    bullets: [
             { angle: 0, speed: 30, delay: 0, offset: 0 },
       { angle: 0, speed: 30, delay: 70, offset: 10 },

     /* { angle: 90, speed: 13, delay: 0, offset: 0 },
      { angle: 0, speed: 13, delay: 0, offset: 0 },
      { angle: 180, speed: 13, delay: 0, offset: 0 },
      { angle: -90, speed: 13, delay: 0, offset: 0 },
      { angle: 45, speed: 13, delay: 0, offset: 0 },
      { angle: -45, speed: 13, delay: 0, offset: 0 },
      { angle: -135, speed: 13, delay: 0, offset: 0 },
      { angle: 135, speed: 13, delay: 0, offset: 0 }

      */
    ],
    damageconfig: [
      { threshold: 35, damageMultiplier: 1 },    // Layer 1: Full damage if within 25% of max distance
      { threshold: 60, damageMultiplier: 0.70 }, // Layer 2: 3/4 damage if within 50% of max distance
      { threshold: 100, damageMultiplier: 0.25 } // Layer 4: 1/4 damage if within 100% of max distance
      // You can add more layers here
  ],
  },
  2: {
    cooldown: 600,
    distance: 300,
    maxexistingtime: 2000,
    maxbounces: 5,
    damage: 25,
    width: 6,
    height: 8,
    useplayerangle: true,
    bullets: [
      { angle: 0, speed: 37, delay: 0, offset: 0 },
      

    ],
    damageconfig: [
      { threshold: 45, damageMultiplier: 1 },    // Layer 1: Full damage if within 25% of max distance
      { threshold: 80, damageMultiplier: 0.80 }, // Layer 2: 3/4 damage if within 50% of max distance
      { threshold: 100, damageMultiplier: 0.70 } // Layer 4: 1/4 damage if within 100% of max distance
      // You can add more layers here
  ],
  },
  3: {
    cooldown: 1000,
    damage: 15,
    useplayerangle: true,
    maxexistingtime: 2000,
    width: 6,
    height: 8,
    bullets: [
      { angle: 0, speed: 10, distance: 500, delay: 0, offset: 0 },
      { angle: 20, speed: 10, distance: 500, delay: 100, offset: 0 },
      { angle: -20, speed: 10, distance: 500, delay: 200, offset: 0 },
      { angle: 40, speed: 10, distance: 500, delay: 300, offset: 0 },
      { angle: -40, speed: 10, distance: 500, delay: 400, offset: 0 }
    ]
  },

  4: {
    cooldown: 800,
    distance: 250,
    maxexistingtime: 500,
    maxbounces: 5,
    damage: 6,
    width: 6,
    height: 8,
    useplayerangle: true,
    can_bullets_bounce: false,
    bullets: [
      // Shotgun pellets configuration
     // { angle: -8, speed: 25, delay: 0, offset: 0 },
      { angle: -5, speed: 27, delay: 0, offset: 0 },
      { angle: 0, speed: 27, delay: 0, offset: 0 },
      { angle: 5, speed: 27, delay: 0, offset: 0 },
     // { angle: 8, speed: 25, delay: 0, offset: 0 }
  ],
    damageconfig: [
      { threshold: 25, damageMultiplier: 1 },   
      { threshold: 55, damageMultiplier: 0.8 }, // Layer 1: Full damage if within 25% of max distance // Layer 2: 3/4 damage if within 50% of max distance
      { threshold: 100, damageMultiplier: 0.30 } // Layer 4: 1/4 damage if within 100% of max distance
      // You can add more layers here
  ],
  },
  5: {
    cooldown: 300,
    distance: 250,
    maxexistingtime: 5000,
    maxbounces: 5,
    damage: 6,
    width: 49,
    height: 49,
    useplayerangle: true,
    can_bullets_bounce: true,
    bullets: [
      // Shotgun pellets configuration
     { angle: -8, speed: 25, delay: 0, offset: 40 },
    { angle: -8, speed: 25, delay: 0, offset: 20 },
   //  { angle: -8, speed: 25, delay: 0, offset: 0 },
  //  { angle: -5, speed: 27, delay: 0, offset: 0 },
      { angle: 0, speed: 13, delay: 0, offset: 0 },
    // { angle: 5, speed: 27, delay: 0, offset: 0 },
  //   { angle: 8, speed: 25, delay: 0, offset: 0 }
  ],
    damageconfig: [
      { threshold: 100, damageMultiplier: 1 } // Layer 4: 1/4 damage if within 100% of max distance
      // You can add more layers here
  ],
  },
};


class SpatialGrid {
  constructor(gridcellsize) {
    this.cellSize = gridcellsize;
    this.grid = new Map();
  }

  _getCellKey(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  addObject(obj) {
    const key = this._getCellKey(obj.x, obj.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(obj);
  }

  removeObject(obj) {
    if (!obj.obj_id) {
      throw new Error("Object must have an 'obj_id' property to be removed.");
    }
  
    const key = this._getCellKey(obj.x, obj.y);
    if (this.grid.has(key)) {
      const cell = this.grid.get(key);
      // Find the index of the object to be removed using obj_id
      const index = cell.findIndex(item => item.obj_id === obj.obj_id);
      if (index !== -1) {
        cell.splice(index, 1);
        // If the cell becomes empty, delete it from the grid
        if (cell.length === 0) {
          this.grid.delete(key);
        }
      }
    }
  }
  





  addWall(wall) {
    const key = this._getCellKey(wall.x, wall.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push(wall);
  }

  getObjectsInAreaWithId(xMin, xMax, yMin, yMax, id) {
    const objects = [];
    const startX = Math.floor(xMin / this.cellSize);
    const endX = Math.floor(xMax / this.cellSize);
    const startY = Math.floor(yMin / this.cellSize);
    const endY = Math.floor(yMax / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        if (this.grid.has(key)) {
          const cellObjects = this.grid.get(key);
          // Filter by ID if provided
          const filteredObjects = cellObjects.filter(obj => obj.id === id);
          objects.push(...filteredObjects);
        }
      }
    }
    return objects;
  }

  getObjectsInArea(xMin, xMax, yMin, yMax) {
    const objects = [];
    const startX = Math.floor(xMin / this.cellSize);
    const endX = Math.floor(xMax / this.cellSize);
    const startY = Math.floor(yMin / this.cellSize);
    const endY = Math.floor(yMax / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        if (this.grid.has(key)) {
          objects.push(...this.grid.get(key));
        }
      }
    }
    return objects;
  }


  getWallsInArea(xMin, xMax, yMin, yMax) {
    const walls = [];
    const startX = Math.floor(xMin / this.cellSize);
    const endX = Math.floor(xMax / this.cellSize);
    const startY = Math.floor(yMin / this.cellSize);
    const endY = Math.floor(yMax / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        if (this.grid.has(key)) {
          walls.push(...this.grid.get(key));
        }
      }
    }
    return walls;
  }
}

// Initialize grids for all maps
// Adjust as necessary
Object.keys(mapsconfig).forEach(mapKey => {
  const map = mapsconfig[mapKey];
  const grid = new SpatialGrid(gridcellsize);

  map.walls.forEach(wall => grid.addWall(wall));

  // Save the grid in the map configuration
  map.grid = grid;
});


function extractWallCoordinates(mapConfig) {
  return mapConfig.walls.map(({ x, y }) => ({ x, y }));
}

const transformedMaps = Object.keys(mapsconfig).reduce((acc, key) => {
  acc[key] = extractWallCoordinates(mapsconfig[key]);
  return acc;
}, {});




//helper functions for grid retrival

module.exports = {
  batchedMessages,
  server_tick_rate,
  matchmaking_timeout,
  player_idle_timeout,
  game_start_time,
  game_win_rest_time,
  maxClients,
  isValidDirection,
  teleporters,
  playerHitboxWidth, 
  playerHitboxHeight,
  gunsconfig,
  mapsconfig,
  matchmakingsp,
  gamemodeconfig,
  rooms,
  room_max_open_time,
  SpatialGrid,
  gridcellsize,
};