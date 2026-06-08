/* Floating InBody control — lets you enter analysis values and see
   the diet + workout recompute live. Shared by both pages. */
(function (global) {
  "use strict";
  const FIELDS = [
    ["sex", "Sex", "select", ["male", "female"]],
    ["age", "Age", "number"],
    ["heightCm", "Height (cm)", "number"],
    ["weightKg", "Weight (kg)", "number"],
    ["pbf", "PBF %", "number"],
    ["smm", "SMM (kg)", "number"],
    ["activity", "Activity ×", "number"],
    ["trainingDays", "Training days", "number"]
  ];

  function mount(onApply) {
    const data = Object.assign({}, PlanEngine.SAMPLE, PlanEngine.load());

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <button id="ib-toggle">⚙ INBODY</button>
      <form id="ib-panel" hidden>
        <div id="ib-head">INBODY ANALYSIS</div>
        <div id="ib-grid"></div>
        <button type="submit" id="ib-apply">APPLY → REBUILD PLAN</button>
        <p id="ib-note"></p>
      </form>`;
    const css = document.createElement("style");
    css.textContent = `
      #ib-toggle{position:fixed;right:20px;bottom:96px;z-index:300;background:#C6F432;color:#0A0A0B;
        font:700 12px/1 Inter,sans-serif;letter-spacing:.1em;border:0;border-radius:10px;
        padding:12px 14px;cursor:pointer;box-shadow:0 0 28px rgba(198,244,50,.35)}
      #ib-panel{position:fixed;right:20px;bottom:150px;z-index:300;width:280px;background:#141417;
        border:1px solid rgba(198,244,50,.25);border-radius:16px;padding:16px;
        box-shadow:0 24px 60px rgba(0,0,0,.6);backdrop-filter:blur(20px)}
      #ib-head{font:700 11px/1 Inter,sans-serif;letter-spacing:.18em;color:#8A8F98;margin-bottom:12px}
      #ib-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      #ib-grid label{font:600 10px/1.4 Inter,sans-serif;letter-spacing:.06em;color:#8A8F98;text-transform:uppercase}
      #ib-grid input,#ib-grid select{width:100%;margin-top:4px;background:#080808;color:#F5F5F5;
        border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 8px;
        font:600 13px Inter,sans-serif;outline:none}
      #ib-grid input:focus,#ib-grid select:focus{border-color:#C6F432}
      #ib-apply{margin-top:14px;width:100%;background:#C6F432;color:#0A0A0B;border:0;border-radius:10px;
        padding:11px;font:700 12px/1 Inter,sans-serif;letter-spacing:.08em;cursor:pointer}
      #ib-note{margin:10px 0 0;font:500 11px/1.4 Inter,sans-serif;color:#A3E635;min-height:14px}`;
    document.head.appendChild(css);
    document.body.appendChild(wrap);

    const grid = wrap.querySelector("#ib-grid");
    FIELDS.forEach(([k, label, type, opts]) => {
      const cell = document.createElement("label");
      cell.textContent = label;
      let field;
      if (type === "select") {
        field = document.createElement("select");
        opts.forEach(o => { const op = document.createElement("option"); op.value = o; op.textContent = o; field.appendChild(op); });
      } else {
        field = document.createElement("input");
        field.type = "number"; field.step = "any";
      }
      field.name = k; field.value = data[k];
      cell.appendChild(field);
      grid.appendChild(cell);
    });

    const panel = wrap.querySelector("#ib-panel");
    wrap.querySelector("#ib-toggle").onclick = () => { panel.hidden = !panel.hidden; };
    panel.addEventListener("submit", e => {
      e.preventDefault();
      const out = {};
      FIELDS.forEach(([k, , type]) => {
        const v = panel.elements[k].value;
        out[k] = type === "number" ? parseFloat(v) : v;
      });
      PlanEngine.save(out);
      const plan = PlanEngine.compute(out);
      wrap.querySelector("#ib-note").textContent =
        `Goal: ${plan.goal} • ${plan.kcal} kcal • ${plan.macros.protein}P/${plan.macros.carbs}C/${plan.macros.fat}F`;
      if (onApply) onApply(plan);
    });
  }
  global.InBodyPanel = { mount };
})(window);
