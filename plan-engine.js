/* ============================================================
   AI Gym Trainer — Plan Engine
   Turns InBody analysis -> calorie target, macros, and an
   8-week workout emphasis. Transparent, editable rules.
   Shared by review / diet / workout pages via localStorage.
   ============================================================ */
(function (global) {
  "use strict";

  // ---- Default sample InBody (used until the user enters their own) ----
  const SAMPLE = {
    sex: "male",        // "male" | "female"
    age: 28,
    heightCm: 175,
    weightKg: 78,
    pbf: 24,            // percent body fat (InBody)
    smm: 33,            // skeletal muscle mass (kg, InBody)
    bmrInbody: null,    // if InBody printed a BMR, put it here; else null -> estimate
    activity: 1.5,      // TDEE multiplier (1.2 sedentary .. 1.725 very active)
    trainingDays: 5
  };

  // Mifflin–St Jeor when InBody BMR isn't provided.
  function estimateBMR(d) {
    const base = 10 * d.weightKg + 6.25 * d.heightCm - 5 * d.age;
    return Math.round(base + (d.sex === "female" ? -161 : 5));
  }

  // PBF healthy ceilings -> decide cut / recomp / lean-bulk.
  function classify(d) {
    const fatHigh = d.sex === "female" ? 30 : 20;
    const fatLow  = d.sex === "female" ? 21 : 12;
    // muscle adequacy: SMM as a share of bodyweight
    const smmRatio = d.smm / d.weightKg;            // ~0.40+ is muscular for men
    const lowMuscle = smmRatio < (d.sex === "female" ? 0.36 : 0.42);

    if (d.pbf > fatHigh)      return { goal: "CUT",     reason: "Body fat above healthy range — prioritise fat loss while protecting muscle." };
    if (d.pbf < fatLow && lowMuscle)
                              return { goal: "LEAN BULK", reason: "Lean already but low muscle mass — build size in a controlled surplus." };
    if (lowMuscle)            return { goal: "RECOMP",   reason: "Body fat is fine but muscle is under target — recomposition focus." };
    return                          { goal: "MAINTAIN", reason: "Composition is balanced — maintain and progress strength." };
  }

  function caloriesFor(goal, tdee) {
    if (goal === "CUT")        return Math.round(tdee - 450);
    if (goal === "RECOMP")     return Math.round(tdee - 200);
    if (goal === "LEAN BULK")  return Math.round(tdee + 300);
    return Math.round(tdee);
  }

  // Macros: protein anchored to lean mass + goal, fat as % of kcal, carbs fill.
  function macros(d, goal, kcal) {
    const leanKg = d.weightKg * (1 - d.pbf / 100);
    const proteinPerKgLean = goal === "CUT" ? 2.6 : 2.3;
    const protein = Math.round(leanKg * proteinPerKgLean);
    const fatKcal = kcal * (goal === "CUT" ? 0.25 : 0.28);
    const fat = Math.round(fatKcal / 9);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const pct = g => Math.round((g * (g === fat ? 9 : 4) / kcal) * 100);
    return {
      protein, carbs, fat,
      proteinPct: Math.round((protein * 4 / kcal) * 100),
      carbsPct:   Math.round((carbs   * 4 / kcal) * 100),
      fatPct:     Math.round((fat     * 9 / kcal) * 100)
    };
  }

  // Workout emphasis derived from the same classification.
  function training(d, cls) {
    const days = d.trainingDays;
    const map = {
      "CUT":       { focus: "Hypertrophy + Conditioning", repRange: "8–15", cardio: "3× LISS / 1× HIIT", phases: ["Foundation","Metabolic","Strength-Hold","Peak Burn"] },
      "RECOMP":    { focus: "Hypertrophy",                repRange: "8–12", cardio: "2× LISS",            phases: ["Foundation","Hypertrophy","Intensify","Deload"] },
      "LEAN BULK": { focus: "Hypertrophy + Strength",     repRange: "5–10", cardio: "1× LISS",            phases: ["Foundation","Volume","Strength","Peak"] },
      "MAINTAIN":  { focus: "Strength",                   repRange: "3–8",  cardio: "2× Zone-2",          phases: ["Foundation","Strength","Power","Test"] }
    };
    const t = map[cls.goal];
    t.split = days >= 5 ? "5-day Upper/Lower/PPL"
            : days === 4 ? "4-day Upper/Lower"
            : "3-day Full Body";
    return t;
  }

  function compute(input) {
    const d = Object.assign({}, SAMPLE, input || {});
    const bmr = d.bmrInbody || estimateBMR(d);
    const tdee = Math.round(bmr * d.activity);
    const cls = classify(d);
    const kcal = caloriesFor(cls.goal, tdee);
    const m = macros(d, cls.goal, kcal);
    const t = training(d, cls);
    return {
      input: d, bmr, tdee, goal: cls.goal, reason: cls.reason,
      kcal, macros: m, training: t,
      mathLine: `BMR ${bmr} × ${d.activity} → ${tdee} TDEE → ${kcal - tdee >= 0 ? "+" : "−"}${Math.abs(kcal - tdee)} → ${kcal} kcal/day`
    };
  }

  const KEY = "inbodyPlan";
  function save(input) { localStorage.setItem(KEY, JSON.stringify(input)); }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function current() { return compute(load()); }

  global.PlanEngine = { compute, save, load, current, SAMPLE };
})(window);
