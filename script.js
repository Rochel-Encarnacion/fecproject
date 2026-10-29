/* FEC Circuit Lab — client-side object-oriented linear-system solver */
"use strict";

class LinearSystemSolver {
  constructor(matrix, constants) {
    this.originalMatrix = matrix.map(row => row.map(Number));
    this.originalConstants = constants.map(Number);
    this.matrix = matrix.map(row => row.map(Number));
    this.constants = constants.map(Number);
    this.steps = [];
    this.size = matrix.length;
    this.tolerance = 1e-10;
  }

  solve() {
    const n = this.size;
    if (!n || this.matrix.some(row => row.length !== n) || this.constants.length !== n) {
      throw new Error("The coefficient matrix must be square and match the constants vector.");
    }
    if ([...this.matrix.flat(), ...this.constants].some(value => !Number.isFinite(value))) {
      throw new Error("Please enter a valid number in every field.");
    }
    this.steps.push({title:"Starting augmented matrix", detail:"The system is written as Ax = b. The constants are appended as the last column.", matrix:this.augmented()});
    for (let col = 0; col < n; col++) {
      let pivotRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(this.matrix[row][col]) > Math.abs(this.matrix[pivotRow][col])) pivotRow = row;
      }
      if (Math.abs(this.matrix[pivotRow][col]) < this.tolerance) {
        throw new Error("This system has no unique solution. Check for dependent equations or a singular coefficient matrix, then revise your inputs.");
      }
      if (pivotRow !== col) {
        [this.matrix[col], this.matrix[pivotRow]] = [this.matrix[pivotRow], this.matrix[col]];
        [this.constants[col], this.constants[pivotRow]] = [this.constants[pivotRow], this.constants[col]];
        this.steps.push({title:`Swap row ${col+1} with row ${pivotRow+1}`,detail:"Partial pivoting moves the largest available pivot into position to improve numerical reliability.",matrix:this.augmented()});
      }
      const pivot = this.matrix[col][col];
      if (Math.abs(pivot - 1) > this.tolerance) {
        for (let j = col; j < n; j++) this.matrix[col][j] /= pivot;
        this.constants[col] /= pivot;
        this.steps.push({title:`Normalize row ${col+1}`,detail:`Divide row ${col+1} by its pivot (${fmt(pivot)}).`,matrix:this.augmented()});
      }
      for (let row = col + 1; row < n; row++) {
        const factor = this.matrix[row][col];
        if (Math.abs(factor) < this.tolerance) continue;
        for (let j = col; j < n; j++) this.matrix[row][j] -= factor * this.matrix[col][j];
        this.constants[row] -= factor * this.constants[col];
        this.steps.push({title:`Eliminate column ${col+1} in row ${row+1}`,detail:`R${row+1} ← R${row+1} − (${fmt(factor)})R${col+1}.`,matrix:this.augmented()});
      }
    }
    const solution = Array(n).fill(0);
    for (let row = n - 1; row >= 0; row--) {
      let rhs = this.constants[row];
      for (let col = row + 1; col < n; col++) rhs -= this.matrix[row][col] * solution[col];
      solution[row] = rhs / this.matrix[row][row];
    }
    this.steps.push({title:"Back substitution",detail:"Solve from the last row upward to obtain each unknown.",solution:solution.slice()});
    const residuals = this.originalMatrix.map((row,i)=>row.reduce((sum,val,j)=>sum+val*solution[j],0)-this.originalConstants[i]);
    return {solution,steps:this.steps,residuals,maxResidual:Math.max(...residuals.map(Math.abs)),matrix:this.originalMatrix,constants:this.originalConstants};
  }

  augmented() {
    return this.matrix.map((row,i)=>[...row,this.constants[i]]);
  }
}

class CircuitAnalysisApp {
  constructor() {
    this.method = "node";
    this.format = "equations";
    this.unknownCount = 3;
    this.currentStep = "method";
    this.solution = null;
    this.elements = [];
    this.nextElementId = 1;
    this.lastReport = "";
    this.bindEvents();
    this.updateMethodAside();
  }

  bindEvents() {
    document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>this.showView(btn.dataset.view)));
    document.getElementById("start-analysis").addEventListener("click",()=>this.startAnalysis());
    document.getElementById("open-guide").addEventListener("click",()=>this.showView("guide"));
    document.getElementById("banner-guide").addEventListener("click",()=>this.showView("guide"));
    document.getElementById("guide-start").addEventListener("click",()=>this.startAnalysis());
    document.querySelectorAll(".choice-card").forEach(btn=>btn.addEventListener("click",()=>{
      document.querySelectorAll(".choice-card").forEach(card=>card.classList.toggle("selected",card===btn));
      this.method=btn.dataset.method; this.updateMethodAside();
    }));
    document.querySelectorAll(".format-card").forEach(btn=>btn.addEventListener("click",()=>{
      document.querySelectorAll(".format-card").forEach(card=>card.classList.toggle("selected",card===btn));
      this.format=btn.dataset.format;
    }));
    document.getElementById("to-format").addEventListener("click",()=>this.goStep("format"));
    document.getElementById("to-input").addEventListener("click",()=>{
      this.unknownCount=Number(document.getElementById("unknown-count").value);
      this.buildInput(); this.goStep("input");
    });
    document.querySelectorAll("[data-back]").forEach(btn=>btn.addEventListener("click",()=>this.goStep(btn.dataset.back)));
    document.getElementById("load-example").addEventListener("click",()=>this.loadExample());
    document.getElementById("solve-system").addEventListener("click",()=>this.solveCurrentSystem());
    document.getElementById("new-analysis").addEventListener("click",()=>this.startAnalysis());
    document.getElementById("add-element").addEventListener("click",()=>this.addElement());
    document.getElementById("toggle-steps").addEventListener("click",()=>this.toggleSteps());
    document.getElementById("copy-results").addEventListener("click",()=>this.copyResults());
    document.getElementById("export-report").addEventListener("click",()=>this.exportReport());
  }

  showView(view) {
    document.querySelectorAll(".view").forEach(el=>el.classList.toggle("active",el.id===`view-${view}`));
    document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
    const labels={home:"Overview",analyze:"New analysis",guide:"Method guide"};
    document.getElementById("crumb-current").textContent=labels[view]||"Overview";
    window.scrollTo({top:0,behavior:"smooth"});
  }

  startAnalysis() {
    this.showView("analyze");
    this.solution=null; this.elements=[]; this.nextElementId=1;
    this.goStep("method");
    document.querySelectorAll(".choice-card").forEach(card=>card.classList.toggle("selected",card.dataset.method===this.method));
    document.querySelectorAll(".format-card").forEach(card=>card.classList.toggle("selected",card.dataset.format===this.format));
    document.getElementById("unknown-count").value=String(this.unknownCount);
    this.updateMethodAside();
  }

  goStep(step) {
    this.currentStep=step;
    const order=["method","format","input","results"];
    document.querySelectorAll(".wizard-step").forEach(el=>el.classList.toggle("active",el.id===`step-${step}`));
    document.querySelectorAll(".progress-item").forEach(el=>{
      const index=order.indexOf(el.dataset.progress), current=order.indexOf(step);
      el.classList.toggle("current",index===current);
      el.classList.toggle("done",index<current);
    });
    const number=order.indexOf(step)+1;
    document.getElementById("step-number").textContent=`STEP ${number} OF 4`;
    document.getElementById("step-progress").style.width=`${number*25}%`;
    const titles={home:"Overview",analyze:"New analysis",guide:"Method guide"};
    document.getElementById("crumb-current").textContent=titles[step==="method"||step==="format"||step==="input"||step==="results"?"analyze":step]||"New analysis";
    this.updateMethodAside();
    document.getElementById("input-error").classList.remove("show");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  updateMethodAside() {
    const node=this.method==="node";
    document.getElementById("aside-method-title").textContent=node?"Node voltage method":"Mesh current method";
    document.getElementById("aside-method-text").textContent=node
      ?"Use KCL at non-reference nodes. Unknowns are typically node voltages measured relative to ground."
      :"Use KVL around independent loops. Unknowns are typically clockwise or consistently assigned mesh currents.";
    document.getElementById("aside-equation").textContent=node?"Σ I entering = Σ I leaving":"Σ V around a loop = 0";
    document.getElementById("aside-tip").textContent=node
      ?"Use a consistent current direction and reference node when forming your equations."
      :"Assign a consistent direction to every mesh current. Shared resistors use the difference of mesh currents.";
    document.getElementById("input-method-label").textContent=node?"Node voltage":"Mesh current";
  }

  variableName(index) {
    return this.method==="node"?`V${index+1}`:`I${index+1}`;
  }

  buildInput() {
    const n=this.unknownCount, container=document.getElementById("equation-input");
    document.getElementById("input-title").textContent=this.format==="equations"?"Enter your equations":"Enter the coefficient matrix";
    document.getElementById("input-subtitle").textContent=this.format==="equations"
      ?"Fill in each coefficient and constant. The variables follow your selected analysis method."
      :"Enter the values of matrix A and vector b. Each row corresponds to one equation.";
    document.getElementById("input-mode-badge").textContent=this.format==="equations"?"SYSTEM OF EQUATIONS":"MATRIX NOTATION";
    document.getElementById("matrix-intro").style.display=this.format==="matrix"?"flex":"none";
    container.innerHTML="";
    for(let r=0;r<n;r++){
      const row=document.createElement("div"); row.className="equation-row";
      const label=document.createElement("span");label.className="equation-label";label.textContent=`Eq. ${r+1}`;
      const coeffs=document.createElement("div");coeffs.className="coefficient-list";coeffs.style.setProperty("--n",n);
      for(let c=0;c<n;c++){
        const input=document.createElement("input");input.type="number";input.step="any";input.inputMode="decimal";input.className="coefficient";input.dataset.row=r;input.dataset.col=c;input.setAttribute("aria-label",`Equation ${r+1}, coefficient for ${this.variableName(c)}`);input.placeholder="0";
        coeffs.appendChild(input);
      }
      const equals=document.createElement("span");equals.className="row-equals";equals.textContent="=";
      const rhs=document.createElement("input");rhs.type="number";rhs.step="any";rhs.inputMode="decimal";rhs.className="rhs-input";rhs.dataset.row=r;rhs.setAttribute("aria-label",`Equation ${r+1}, constant`);rhs.placeholder="0";
      row.append(label,coeffs,equals,rhs);container.appendChild(row);
      if(this.format==="equations"){
        const preview=document.createElement("div");preview.className="equation-preview";preview.id=`preview-${r}`;
        preview.textContent=this.equationText(r,Array(n).fill(0),0);container.appendChild(preview);
      }
    }
    if(this.format==="equations"){
      container.querySelectorAll("input").forEach(input=>input.addEventListener("input",()=>this.updateEquationPreview(Number(input.dataset.row))));
    }
    this.loadExample(false);
  }

  equationText(row, coefficients, rhs) {
    const pieces=coefficients.map((value,i)=>`${value<0?"− ":""}${Math.abs(value)}${this.variableName(i)}`);
    return `${pieces.join("  +  ").replaceAll("+  − ","− ")}  =  ${rhs}`;
  }

  updateEquationPreview(row) {
    const n=this.unknownCount, coeffs=[];
    for(let c=0;c<n;c++){
      const input=document.querySelector(`.coefficient[data-row="${row}"][data-col="${c}"]`);
      coeffs.push(input.value===""?0:Number(input.value));
    }
    const rhsInput=document.querySelector(`.rhs-input[data-row="${row}"]`);
    const preview=document.getElementById(`preview-${row}`);
    if(preview) preview.textContent=this.equationText(row,coeffs,rhsInput.value===""?0:Number(rhsInput.value));
  }

  loadExample(showToast=true) {
    const n=this.unknownCount;
    const matrix=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>r===c?n+2:((r+c)%2===0?1:-1)));
    const expected=Array.from({length:n},(_,i)=>i+1);
    const constants=matrix.map(row=>row.reduce((sum,v,i)=>sum+v*expected[i],0));
    document.querySelectorAll(".coefficient").forEach(input=>{input.value=matrix[Number(input.dataset.row)][Number(input.dataset.col)];});
    document.querySelectorAll(".rhs-input").forEach(input=>{input.value=constants[Number(input.dataset.row)];});
    if(this.format==="equations") for(let r=0;r<n;r++) this.updateEquationPreview(r);
    if(showToast) this.toast("Sample system loaded. You can edit any value.");
  }

  readSystem() {
    const n=this.unknownCount, matrix=[], constants=[];
    for(let r=0;r<n;r++){
      const row=[];
      for(let c=0;c<n;c++){
        const el=document.querySelector(`.coefficient[data-row="${r}"][data-col="${c}"]`);
        if(!el||el.value.trim()==="") throw new Error(`Please fill in coefficient ${this.variableName(c)} in equation ${r+1}. Use 0 if the term is absent.`);
        row.push(Number(el.value));
      }
      const rhs=document.querySelector(`.rhs-input[data-row="${r}"]`);
      if(!rhs||rhs.value.trim()==="") throw new Error(`Please enter the constant for equation ${r+1}. Use 0 if needed.`);
      constants.push(Number(rhs.value));matrix.push(row);
    }
    return {matrix,constants};
  }

  solveCurrentSystem() {
    const error=document.getElementById("input-error");
    try{
      const {matrix,constants}=this.readSystem();
      const solver=new LinearSystemSolver(matrix,constants);
      this.solution=solver.solve();
      this.renderResults();
      this.goStep("results");
    }catch(err){error.textContent=err.message;error.classList.add("show");}
  }

  renderResults() {
    const result=this.solution;
    const variableUnits=this.method==="node"?"V":"A";
    document.getElementById("results-description").textContent=`${this.method==="node"?"Node voltage":"Mesh current"} · ${this.unknownCount} unknowns · ${this.format==="equations"?"System of equations":"Matrix notation"}`;
    document.getElementById("solution-grid").innerHTML=result.solution.map((value,i)=>`<div class="solution-card"><span>${this.variableName(i)}</span><strong>${fmt(value)}</strong><small>${variableUnits==="V"?"Volts":"Amperes"}</small></div>`).join("");
    const status=document.getElementById("result-status");
    status.innerHTML=`<span class="status-icon">✓</span><span><strong>Unique solution found</strong><small>Maximum equation residual: ${fmt(result.maxResidual)} · ${result.maxResidual<1e-7?"Numerically consistent":"Review the residual and input values"}</small></span><span class="status-pill">SOLVED</span>`;
    this.renderSteps();
    this.elements=[];
    this.nextElementId=1;
    this.addElement("Element 1",0,0,false);
    this.addElement("Element 2",0,0,false);
    this.addElement("Element 3",0,0,false);
    this.renderElementRows();
    this.updatePowerSummary();
    this.lastReport=this.createReportText();
  }

  renderSteps() {
    const panel=document.getElementById("steps-panel");
    panel.classList.add("collapsed");
    document.getElementById("toggle-steps").textContent="Show steps ↓";
    panel.innerHTML=this.solution.steps.map((step,i)=>{
      let body=`<strong>${escapeHTML(step.title)}</strong><br>${escapeHTML(step.detail)}`;
      if(step.matrix){
        body+=`<div class="step-matrix">${step.matrix.map(row=>`[ ${row.map(fmt).join(" · ")} ]`).join("<br>")}</div>`;
      }
      if(step.solution) body+=`<br><strong>Solution vector:</strong> ${step.solution.map((v,i)=>`${this.variableName(i)} = ${fmt(v)}`).join(", ")}`;
      return `<div class="step-row"><span class="step-index">${i+1}</span><div>${body}</div></div>`;
    }).join("");
  }

  toggleSteps() {
    const panel=document.getElementById("steps-panel");
    const collapsed=panel.classList.toggle("collapsed");
    document.getElementById("toggle-steps").textContent=collapsed?"Show steps ↓":"Hide steps ↑";
  }

  addElement(name="",voltage="",current="",rerender=true) {
    const id=this.nextElementId++;
    this.elements.push({id,name:name||`Element ${id}`,voltage:String(voltage),current:String(current)});
    if(rerender){this.renderElementRows();this.updatePowerSummary();}
  }

  renderElementRows() {
    const tbody=document.getElementById("element-rows");
    tbody.innerHTML=this.elements.map(el=>{
      const p=(Number(el.voltage)||0)*(Number(el.current)||0);
      const absorbed=Math.max(p,0), delivered=Math.max(-p,0);
      return `<tr data-id="${el.id}">
        <td><input class="element-name" data-field="name" value="${escapeAttr(el.name)}" aria-label="Element name"></td>
        <td><input type="number" step="any" data-field="voltage" value="${escapeAttr(el.voltage)}" placeholder="0" aria-label="Voltage in volts"></td>
        <td><input type="number" step="any" data-field="current" value="${escapeAttr(el.current)}" placeholder="0" aria-label="Current in amperes"></td>
        <td class="power-cell" data-power="absorbed">${fmt(absorbed)} W</td>
        <td class="power-cell" data-power="delivered">${fmt(delivered)} W</td>
        <td><button class="delete-element" data-delete="${el.id}" aria-label="Remove element">×</button></td>
      </tr>`;
    }).join("");
    tbody.querySelectorAll("input").forEach(input=>input.addEventListener("input",()=>{
      const row=input.closest("tr"),el=this.elements.find(item=>item.id===Number(row.dataset.id));
      el[input.dataset.field]=input.value;
      const p=Number(el.voltage)*Number(el.current);
      row.querySelector('[data-power="absorbed"]').textContent=`${fmt(Number.isFinite(p)?Math.max(p,0):0)} W`;
      row.querySelector('[data-power="delivered"]').textContent=`${fmt(Number.isFinite(p)?Math.max(-p,0):0)} W`;
      this.updatePowerSummary();
    }));
    tbody.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>{
      this.elements=this.elements.filter(el=>el.id!==Number(btn.dataset.delete));
      this.renderElementRows();this.updatePowerSummary();
    }));
  }

  updatePowerSummary() {
    const powers=this.elements.map(el=>Number(el.voltage)*Number(el.current)).filter(Number.isFinite);
    const absorbed=powers.reduce((s,p)=>s+Math.max(p,0),0);
    const delivered=powers.reduce((s,p)=>s+Math.max(-p,0),0);
    const difference=Math.abs(absorbed-delivered);
    document.getElementById("total-absorbed").textContent=`${fmt(absorbed)} W`;
    document.getElementById("total-delivered").textContent=`${fmt(delivered)} W`;
    document.getElementById("power-difference").textContent=`${fmt(difference)} W`;
    const status=document.getElementById("balance-status");
    const hasData=this.elements.length>0&&this.elements.some(el=>el.voltage!==""&&el.current!==""&&(Number(el.voltage)!==0||Number(el.current)!==0));
    if(!hasData){
      status.className="balance-status";
      status.innerHTML="<span class='balance-dot'></span><span><strong>Power check pending</strong><small>Enter the voltage and current for every circuit element. Zero values are valid if they reflect your circuit.</small></span>";
    }else if(difference<=Math.max(0.01,0.01*Math.max(absorbed,delivered))){
      status.className="balance-status good";
      status.innerHTML="<span class='balance-dot'></span><span><strong>Power balance: within tolerance</strong><small>Absorbed and delivered power are close for the entries provided. Confirm that every circuit element is included.</small></span>";
    }else{
      status.className="balance-status warn";
      status.innerHTML="<span class='balance-dot'></span><span><strong>Power balance: review required</strong><small>The totals differ by more than the 1% / 0.01 W tolerance. Check signs, units, and missing elements.</small></span>";
    }
    this.lastReport=this.createReportText();
  }

  createReportText() {
    if(!this.solution) return "";
    const lines=["FEC CIRCUIT LAB — CIRCUIT ANALYSIS REPORT","==========================================",`Method: ${this.method==="node"?"Node Voltage Method":"Mesh Current Method"}`,`Input format: ${this.format==="equations"?"System of Equations":"Matrix Notation"}`,`Unknowns: ${this.unknownCount}`,"","SOLVED VALUES"];
    this.solution.solution.forEach((v,i)=>lines.push(`${this.variableName(i)} = ${fmt(v)} ${this.method==="node"?"V":"A"}`));
    lines.push("",`Maximum equation residual: ${fmt(this.solution.maxResidual)}`,"","ELEMENT POWER TABLE","Element | Voltage (V) | Current (A) | Power absorbed (W) | Power delivered (W)");
    this.elements.forEach(el=>{
      const p=Number(el.voltage)*Number(el.current);
      lines.push(`${el.name} | ${el.voltage||"—"} | ${el.current||"—"} | ${fmt(Math.max(p,0))} | ${fmt(Math.max(-p,0))}`);
    });
    const absorbed=this.elements.reduce((s,e)=>s+Math.max(Number(e.voltage)*Number(e.current)||0,0),0);
    const delivered=this.elements.reduce((s,e)=>s+Math.max(-(Number(e.voltage)*Number(e.current)||0),0),0);
    lines.push("",`Total absorbed power: ${fmt(absorbed)} W`,`Total delivered power: ${fmt(delivered)} W`,`Absolute power difference: ${fmt(Math.abs(absorbed-delivered))} W`,"","Note: Power balance is a consistency check for a complete element list; it does not by itself prove dynamic circuit stability.");
    return lines.join("\n");
  }

  copyResults() {
    const text=this.createReportText();
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(()=>this.toast("Report copied to clipboard.")).catch(()=>this.fallbackCopy(text));
    else this.fallbackCopy(text);
  }

  fallbackCopy(text) {
    const area=document.createElement("textarea");area.value=text;document.body.appendChild(area);area.select();
    try{document.execCommand("copy");this.toast("Report copied to clipboard.");}catch(e){this.toast("Copy unavailable in this browser.");}
    area.remove();
  }

  exportReport() {
    const blob=new Blob([this.createReportText()],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="fec-circuit-analysis-report.txt";link.click();URL.revokeObjectURL(url);
    this.toast("Report exported.");
  }

  toast(message) {
    const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");
    clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove("show"),2800);
  }
}

function fmt(value) {
  if(!Number.isFinite(Number(value))) return "—";
  const v=Number(value);
  if(Math.abs(v)<0.0000005) return "0.000";
  return Number(v.toFixed(6)).toString();
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function escapeAttr(value) { return escapeHTML(value); }

document.addEventListener("DOMContentLoaded",()=>{window.circuitLab=new CircuitAnalysisApp();});
