const $=id=>document.getElementById(id);
const n=id=>Math.max(0,Number($(id).value)||0);
const money=x=>new Intl.NumberFormat("en-IN",{
  style:"currency",
  currency:"INR",
  maximumFractionDigits:0
}).format(Math.max(0,x||0));

document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tabs button")
    .forEach(x=>x.classList.remove("active"));

  document.querySelectorAll(".app")
    .forEach(x=>x.classList.remove("active"));

  b.classList.add("active");
  $(b.dataset.tab).classList.add("active");
});

function oldTax(x,age){
  const ex=age>=80?500000:age>=60?300000:250000;

  return Math.max(
    0,
    Math.min(Math.max(0,x-ex),250000)*.05+
    Math.max(0,Math.min(x,1000000)-500000)*.20+
    Math.max(0,x-1000000)*.30
  );
}

function newTax(x){
  let t=0,prev=0;

  for(const [lim,r] of [
    [400000,0],
    [800000,.05],
    [1200000,.10],
    [1600000,.15],
    [2000000,.20],
    [2400000,.25]
  ]){
    t+=Math.max(0,Math.min(x,lim)-prev)*r;
    prev=lim;

    if(x<=lim)return t;
  }

  return t+Math.max(0,x-2400000)*.30;
}

function calcTax(){
  const gross=n("t_salary")+n("t_other");
  const age=Number($("t_age").value);

  const hra=Math.min(
    n("t_hra"),
    Math.max(0,n("t_rent")-.1*n("t_basic")),
    .5*n("t_basic")
  );

  const od=
    Math.min(150000,n("t_80c"))+
    n("t_80d")+
    n("t_nps")+
    Math.min(200000,n("t_home"))+
    n("t_otherded")+
    hra+
    Math.min(50000,n("t_salary"));

  const ot=Math.max(0,gross-od);
  const nt=Math.max(
    0,
    gross-Math.min(75000,n("t_salary"))
  );

  let a=oldTax(ot,age);
  let b=newTax(nt);

  if(ot<=500000)
    a=Math.max(0,a-12500);

  if(nt<=1200000)
    b=Math.max(0,b-60000);

  a*=1.04;
  b*=1.04;

  const best=a<b?"Old Regime":"New Regime";

  $("taxResult").innerHTML=
    `<div><b>Old Regime:</b> taxable ${money(ot)}, tax+cess ${money(a)}</div>
     <div><b>New Regime:</b> taxable ${money(nt)}, tax+cess ${money(b)}</div>
     <hr>
     <b>${best}</b> is lower by ${money(Math.abs(a-b))}
     per year in this scenario.`;
}

function calcSalary(){
  const v=Math.max(
    0,
    n("s_ctc")-
    n("s_emp")-
    n("s_ded")-
    n("s_tax")
  );

  $("salaryResult").textContent=money(v);
  $("salaryMonthly").textContent=money(v/12);
}

function calcEMI(){
  const P=n("e_p");
  const r=n("e_r")/1200;
  const m=Math.round(n("e_n")*12);

  const e=m?
    (
      r?
      P*r*(1+r)**m/((1+r)**m-1):
      P/m
    ):
    0;

  $("emiResult").textContent=money(e);
  $("emiInterest").textContent=money(e*m-P);
}

function calcSIP(){
  const p=n("p_p");
  const r=n("p_r")/1200;
  const m=Math.round(n("p_n")*12);

  const v=m?
    (
      r?
      p*((1+r)**m-1)/r*(1+r):
      p*m
    ):
    0;

  $("sipResult").textContent=money(v);
  $("sipInvested").textContent=money(p*m);
}

function calcCar(){
  const v=Math.max(
    0,
    (n("c_lease")+n("c_run"))*12-n("c_save")
  );

  $("carResult").textContent=money(v);
}

function calcGold(){
  const cost=
    n("g_w")*n("g_buy")+
    n("g_make");

  const value=
    n("g_w")*n("g_now");

  $("goldResult").textContent=
    money(value-cost);
}

$("taxBtn").onclick=calcTax;

$("aiBtn").onclick=()=>{
  const q=$("aiInput").value.trim();

  $("aiResult").textContent=
    q?
    "SmartCalc AI: I would identify the right calculator from your question, collect the required inputs, run the deterministic calculation, and explain the result. This demo does not call an external AI service yet."
    :
    "Please describe what you want to calculate.";
};

document.querySelectorAll("input,select").forEach(x=>
  x.addEventListener("input",()=>{
    calcTax();
    calcSalary();
    calcEMI();
    calcSIP();
    calcCar();
    calcGold();
  })
);

calcTax();
calcSalary();
calcEMI();
calcSIP();
calcCar();
calcGold();
