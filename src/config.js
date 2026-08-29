// Tuning values for the whole game. Sizes are in world units.
export const CONFIG = {
  baseSize: 4.2,        // footprint of the ground floor (x and z)
  foundationFloors: 3,  // floors already standing when a run starts
  floorHeight: 0.78,    // height of a single floor
  carryGap: 2.4,        // how high above the tower the UFO carries the next floor

  startSpeed: 3.2,      // sideways speed of the carried floor, units/second
  speedGain: 0.06,      // extra speed per completed floor
  maxSpeed: 9.5,

  perfectEps: 0.14,     // |offset| under this counts as a perfect drop
  perfectReward: 0.16,  // footprint regained once the streak is long enough
  rewardStreak: 3,      // perfect drops in a row needed before the reward kicks in
  missThreshold: 0.06,  // overlap at or below this is a miss

  dropDuration: 0.16,   // seconds for a dropped floor to reach its resting spot
  gravity: 26,          // used by the sliced-off debris

  visibleFloors: 40,    // floors kept below the top before they are recycled
  hueStart: 205,        // building colour drifts as it climbs
  hueDrift: 2.2
};

// How far the carried floor travels either side of the floor below it.
export function travelFor(size) {
  return Math.min(4.6, size * 0.9 + 1.7);
}
