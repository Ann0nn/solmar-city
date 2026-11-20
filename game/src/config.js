// Solmar City configuration: city layout, districts, palette, tuning.
// All numbers are in metres, seconds and dollars; nothing here is loaded from the network.
export const CITY = {
  half: 210,
  roadGap: 60,
  roadWidth: 14,
  roadLines: [-180, -180 + 60, -60, 0, 60, 120, 180],
  blockCenters: [-150, -90, -30, 30, 90, 150],
  beachZ: 212,
  seaZ: 262,
  wall: 240,
};

export const PALETTE = {
  sky: 0x8ec9ee,
  fog: 0xcfe6f2,
  sun: 0xfff2d0,
  ground: 0x8fae7e,
  sand: 0xe9d8a0,
  sea: 0x1f8fc4,
  road: 0x34373d,
  sidewalk: 0xb9b2a2,
  building: [0xf2e8d8, 0xf5c9a8, 0xa8d8d0, 0xf0f0e8, 0xe8b8b0, 0xc8d8f0, 0xf8e0a0, 0xd8c8b8],
  car: [0xc23b2e, 0x2e6fc2, 0xe8c832, 0x3aa655, 0x8a5fc2, 0xe8e8e8, 0x22262c, 0xe8822e, 0x20b8a8],
  shirt: [0xd84a4a, 0x4a8ad8, 0x54b85a, 0xe8c83a, 0xb05ac8, 0xe8803a, 0x38b8b0, 0xf0f0f0],
};

// District rectangles, checked in order; the first match wins.
export const DISTRICTS = [
  { name: 'Palm Heights', x0: -240, z0: -240, x1: 240, z1: -120 },
  { name: 'Old Town', x0: -240, z0: -120, x1: -120, z1: 60 },
  { name: 'Coral Plaza', x0: 60, z0: -120, x1: 240, z1: 0 },
  { name: 'Downtown', x0: -60, z0: -60, x1: 60, z1: 60 },
  { name: 'The Marina', x0: -240, z0: 60, x1: -120, z1: 240 },
  { name: 'The Harbor', x0: 120, z0: 0, x1: 240, z1: 240 },
  { name: 'South Beach', x0: -120, z0: 150, x1: 120, z1: 240 },
];

export function districtAt(x, z) {
  if (z > CITY.beachZ) return 'Solmar Beach';
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  }
  return 'Solmar City';
}

export const TUNING = {
  walkSpeed: 6.5,
  sprintSpeed: 10,
  carAccel: 16,
  carBrake: 28,
  carMaxSpeed: 34,
  carMaxReverse: 10,
  carTurn: 1.9,
  trafficSpeed: 9,
  pedSpeed: 1.6,
  pedFleeSpeed: 5,
  copCarSpeed: 30,
  copFootSpeed: 7,
  arrestTime: 2.2,
  unseenFadeTime: 12,
  pistolDamage: 34,
  punchDamage: 12,
  pistolRange: 55,
  pistolMag: 12,
  pickupRespawn: 30,
  bustedFine: 150,
  wastedFine: 200,
};

export const SAVE_KEY = 'solmar-city-save-v1';
export const MISSION_REWARDS = { getaway: 800, harbor: 1200 };
