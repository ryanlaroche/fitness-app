type ExerciseInfo = {
  description: string;
  tips: string[];
};

const exerciseDb: Record<string, ExerciseInfo> = {
  "bench press": {
    description: "Compound chest exercise pressing a barbell or dumbbells from a supine position.",
    tips: ["Keep shoulder blades retracted and squeezed together", "Lower bar to mid-chest, not neck", "Drive feet into floor for leg drive"],
  },
  "incline bench press": {
    description: "Upper chest-focused press on a 30-45 degree incline bench.",
    tips: ["Set incline to 30-45 degrees", "Lower bar to upper chest / clavicle area", "Don't flare elbows too wide"],
  },
  "decline bench press": {
    description: "Lower chest-focused press on a decline bench.",
    tips: ["Use a moderate decline angle", "Keep wrists stacked over elbows", "Use a spotter for safety"],
  },
  "overhead press": {
    description: "Compound shoulder exercise pressing weight overhead from shoulder height.",
    tips: ["Brace core tight throughout the lift", "Press in a slight arc around your face", "Lock out fully at the top"],
  },
  "military press": {
    description: "Strict standing overhead press with a barbell, targeting shoulders.",
    tips: ["Keep strict form — no leg drive", "Squeeze glutes to stabilize", "Start with bar at collarbone level"],
  },
  "squat": {
    description: "Fundamental lower body compound movement, barbell on upper back.",
    tips: ["Break at hips and knees simultaneously", "Keep chest up and core braced", "Push knees out over toes"],
  },
  "back squat": {
    description: "Barbell squat with the bar on upper traps, targeting quads and glutes.",
    tips: ["Keep the bar centered on your traps", "Hit at least parallel depth", "Drive up through your heels"],
  },
  "front squat": {
    description: "Barbell squat with bar in front rack position, more quad-dominant.",
    tips: ["Keep elbows high to prevent bar rolling", "Stay more upright than back squat", "Use a clean grip or cross-arm grip"],
  },
  "deadlift": {
    description: "Full-body pull lifting a barbell from the floor to hip height.",
    tips: ["Keep bar close to your body the entire pull", "Engage lats before lifting", "Push the floor away rather than pulling up"],
  },
  "romanian deadlift": {
    description: "Hip-hinge movement lowering weight along the legs, targeting hamstrings and glutes.",
    tips: ["Keep a slight bend in knees throughout", "Push hips back, don't squat down", "Feel the stretch in your hamstrings"],
  },
  "sumo deadlift": {
    description: "Wide-stance deadlift variation that emphasizes hips and inner thighs.",
    tips: ["Point toes out 30-45 degrees", "Push knees out over toes", "Keep chest tall as you pull"],
  },
  "barbell row": {
    description: "Compound back exercise rowing a barbell to the torso from a bent-over position.",
    tips: ["Keep back flat at roughly 45 degrees", "Pull to lower chest / upper belly", "Squeeze shoulder blades at the top"],
  },
  "bent over row": {
    description: "Back-building row performed from a hip-hinged position.",
    tips: ["Maintain a neutral spine throughout", "Initiate the pull with your elbows", "Control the negative portion"],
  },
  "pull up": {
    description: "Upper body pull exercise hanging from a bar, targeting lats and biceps.",
    tips: ["Start from a dead hang for full ROM", "Drive elbows down and back", "Avoid excessive kipping"],
  },
  "chin up": {
    description: "Supinated-grip pull-up variation with more bicep involvement.",
    tips: ["Use an underhand shoulder-width grip", "Pull until chin clears the bar", "Control the descent"],
  },
  "lat pulldown": {
    description: "Cable machine exercise pulling a bar down to chest level, targeting lats.",
    tips: ["Lean back slightly and pull to upper chest", "Squeeze lats at the bottom", "Don't use momentum to swing the weight"],
  },
  "dumbbell row": {
    description: "Single-arm row with a dumbbell, great for back thickness and imbalance correction.",
    tips: ["Keep hips square, don't rotate torso", "Pull to hip, not shoulder", "Use a bench for support"],
  },
  "cable row": {
    description: "Seated rowing movement on a cable machine for mid-back development.",
    tips: ["Sit tall with slight forward lean at the start", "Pull handles to lower ribs", "Don't lean back excessively"],
  },
  "dumbbell curl": {
    description: "Isolation exercise for biceps using dumbbells.",
    tips: ["Keep elbows pinned at your sides", "Supinate wrists at the top", "Control the eccentric"],
  },
  "barbell curl": {
    description: "Bicep isolation using a straight or EZ bar.",
    tips: ["Avoid swinging the weight", "Keep elbows stationary", "Use a full range of motion"],
  },
  "hammer curl": {
    description: "Neutral-grip curl targeting brachialis and forearms alongside biceps.",
    tips: ["Keep palms facing each other throughout", "Don't swing — use strict form", "Great for forearm development"],
  },
  "tricep pushdown": {
    description: "Cable isolation for triceps, pressing a handle downward.",
    tips: ["Keep elbows tight to your sides", "Fully extend at the bottom", "Don't let shoulders take over"],
  },
  "tricep extension": {
    description: "Overhead or lying isolation movement for the triceps.",
    tips: ["Keep upper arms stationary", "Lower weight behind head with control", "Extend fully at the top"],
  },
  "skull crusher": {
    description: "Lying tricep extension lowering weight toward the forehead.",
    tips: ["Lower to forehead or just behind head", "Keep elbows pointing at ceiling", "Use an EZ bar to reduce wrist strain"],
  },
  "lateral raise": {
    description: "Isolation exercise raising dumbbells to the sides for lateral deltoids.",
    tips: ["Lead with elbows, not hands", "Stop at shoulder height", "Use a slight forward lean"],
  },
  "face pull": {
    description: "Cable exercise pulling rope to face height, targeting rear delts and rotator cuff.",
    tips: ["Pull to forehead/eye level", "Externally rotate at the end position", "Keep elbows high"],
  },
  "rear delt fly": {
    description: "Isolation for posterior deltoids, performed bent over or on a machine.",
    tips: ["Keep a slight bend in elbows", "Squeeze shoulder blades at the top", "Use lighter weight with strict form"],
  },
  "leg press": {
    description: "Machine compound exercise pressing weight away with your legs.",
    tips: ["Don't lock knees at the top", "Place feet shoulder-width on the platform", "Lower until knees reach 90 degrees"],
  },
  "leg extension": {
    description: "Machine isolation exercise for the quadriceps.",
    tips: ["Extend fully but don't hyperextend", "Control the negative", "Pause briefly at the top"],
  },
  "leg curl": {
    description: "Machine isolation exercise for the hamstrings.",
    tips: ["Keep hips pressed into the pad", "Curl fully and squeeze at the top", "Don't let the weight slam down"],
  },
  "hamstring curl": {
    description: "Isolation movement for hamstrings, done lying or seated on a machine.",
    tips: ["Focus on the mind-muscle connection", "Don't use momentum", "Full range of motion is key"],
  },
  "calf raise": {
    description: "Isolation exercise for the calves, performed standing or seated.",
    tips: ["Get a full stretch at the bottom", "Pause at the top for peak contraction", "Use slow, controlled reps"],
  },
  "hip thrust": {
    description: "Glute-focused exercise thrusting a barbell upward from a seated position against a bench.",
    tips: ["Drive through heels, not toes", "Squeeze glutes hard at lockout", "Keep chin tucked — don't hyperextend neck"],
  },
  "lunge": {
    description: "Unilateral lower body exercise stepping forward into a split stance.",
    tips: ["Keep front knee over ankle", "Step far enough to hit 90 degrees on both knees", "Keep torso upright"],
  },
  "bulgarian split squat": {
    description: "Single-leg squat with rear foot elevated on a bench.",
    tips: ["Most of the weight on the front leg", "Keep torso upright or slightly forward", "Control the descent"],
  },
  "dip": {
    description: "Upper body pressing exercise on parallel bars, targeting chest and triceps.",
    tips: ["Lean forward slightly for more chest, upright for triceps", "Lower until upper arms are parallel to floor", "Don't go too deep if shoulders feel strained"],
  },
  "plank": {
    description: "Isometric core exercise holding a push-up position.",
    tips: ["Keep body in a straight line", "Engage glutes and core, don't let hips sag", "Breathe steadily throughout"],
  },
  "cable fly": {
    description: "Cable chest isolation bringing handles together in a hugging motion.",
    tips: ["Keep a slight bend in elbows throughout", "Squeeze chest at the peak", "Use a controlled tempo"],
  },
  "chest fly": {
    description: "Dumbbell chest isolation lying on a bench, arms sweeping in an arc.",
    tips: ["Don't go too deep — stop when you feel a stretch", "Keep a slight bend in elbows", "Focus on squeezing at the top"],
  },
  "shrug": {
    description: "Trap isolation exercise lifting shoulders straight up toward ears.",
    tips: ["Lift straight up, don't roll shoulders", "Hold the top position briefly", "Use straps for heavy weight if needed"],
  },
};

const normalizeAliases: [RegExp, string][] = [
  [/\bdumbbell\b/i, ""],
  [/\bbarbell\b/i, ""],
  [/\bdb\b/i, ""],
  [/\bbb\b/i, ""],
  [/\bseated\b/i, ""],
  [/\bstanding\b/i, ""],
  [/\bmachine\b/i, ""],
  [/\bsmith\b/i, ""],
  [/\bclose[- ]?grip\b/i, ""],
  [/\bwide[- ]?grip\b/i, ""],
  [/\bincline\s+dumbbell\b/i, "incline"],
  [/\bflat\b/i, ""],
  [/\s+/g, " "],
];

function normalize(name: string): string {
  let n = name.toLowerCase().trim();
  for (const [pattern, replacement] of normalizeAliases) {
    n = n.replace(pattern, replacement);
  }
  return n.trim();
}

export function lookupExercise(name: string): ExerciseInfo | null {
  const cleaned = name.toLowerCase().trim();

  // Direct match
  if (exerciseDb[cleaned]) return exerciseDb[cleaned];

  // Normalized match
  const norm = normalize(cleaned);
  if (exerciseDb[norm]) return exerciseDb[norm];

  // Partial match — check if any key is contained in the name or vice versa
  for (const [key, info] of Object.entries(exerciseDb)) {
    if (norm.includes(key) || key.includes(norm)) return info;
  }

  return null;
}
