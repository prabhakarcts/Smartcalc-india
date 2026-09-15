const $ = id => document.getElementById(id);

const n = id => Math.max(0, Number($(id)?.value) || 0);

const money = x => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
}).format(Math.max(0, x || 0));

/* =========================================================
   TAB SWITCHING
   ========================================================= */

document.querySelectorAll(".tool-strip button").forEach(button => {
  button.addEventListener("click", () => {

    document.querySelectorAll(".tool-strip button")
      .forEach(x => x.classList.remove("active"));

    document.querySelectorAll(".app")
      .forEach(x => x.classList.remove("active"));

    button.classList.add("active");

    const target = $(button.dataset.tab);

    if (target) {
      target.classList.add("active");
    }
  });
});


/* =========================================================
   OLD TAX REGIME — AY 2026-27
   ========================================================= */

function oldTax(income, age) {

  let tax = 0;

  if (age >= 80) {

    tax += Math.max(0, Math.min(income, 1000000) - 500000) * 0.20;
    tax += Math.max(0, income - 1000000) * 0.30;

  } else if (age >= 60) {

    tax += Math.max(0, Math.min(income, 500000) - 300000) * 0.05;
    tax += Math.max(0, Math.min(income, 1000000) - 500000) * 0.20;
    tax += Math.max(0, income - 1000000) * 0.30;

  } else {

    tax += Math.max(0, Math.min(income, 500000) - 250000) * 0.05;
    tax += Math.max(0, Math.min(income, 1000000) - 500000) * 0.20;
    tax += Math.max(0, income - 1000000) * 0.30;
  }

  return Math.max(0, tax);
}


/* =========================================================
   NEW TAX REGIME — AY 2026-27
   ========================================================= */

function newTax(income) {

  let tax = 0;
  let previous = 0;

  const slabs = [
    [400000, 0],
    [800000, 0.05],
    [1200000, 0.10],
    [1600000, 0.15],
    [2000000, 0.20],
    [2400000, 0.25],
    [Infinity, 0.30]
  ];

  for (const [limit, rate] of slabs) {

    const taxableInSlab =
      Math.max(0, Math.min(income, limit) - previous);

    tax += taxableInSlab * rate;

    previous = limit;

    if (income <= limit) break;
  }

  return Math.max(0, tax);
}


/* =========================================================
   SECTION 87A REBATE + MARGINAL RELIEF
   ========================================================= */

function oldRegimeRebate(income, tax) {

  // Section 87A: maximum ₹12,500 where taxable income
  // does not exceed ₹5 lakh.
  if (income <= 500000) {
    return Math.min(12500, tax);
  }

  return 0;
}


function newRegimeRebate(income, tax) {

  // Full rebate up to ₹12 lakh taxable income.
  if (income <= 1200000) {
    return Math.min(60000, tax);
  }

  // Marginal relief above ₹12 lakh.
  const excessIncome = income - 1200000;
  const excessTax = tax - excessIncome;

  if (excessTax > 0) {
    return Math.min(60000, excessTax);
  }

  return 0;
}


/* =========================================================
   HEALTH & EDUCATION CESS
   ========================================================= */

function addCess(tax) {
  return tax * 1.04;
}


/* =========================================================
   TAX CALCULATOR
   ========================================================= */

function calcTax() {

  const salary = n("t_salary");
  const otherIncome = n("t_other");
  const age = Number($("t_age").value);

  const grossIncome = salary + otherIncome;


  /* -------------------------
     OLD REGIME
     ------------------------- */

  // HRA exemption:
  // Minimum of:
  // 1. Actual HRA received
  // 2. Rent paid minus 10% of basic
  // 3. 50% of basic for specified cities
  const hraExemption = Math.min(
    n("t_hra"),
    Math.max(0, n("t_rent") - (0.10 * n("t_basic"))),
    0.50 * n("t_basic")
  );


  // Standard deduction — old regime
  const standardDeductionOld =
    Math.min(50000, salary);


  // 80C maximum ₹1.5 lakh
  const deduction80C =
    Math.min(150000, n("t_80c"));


  // NPS 80CCD(1B) maximum ₹50,000
  const npsDeduction =
    Math.min(50000, n("t_nps"));


  // Home loan interest — capped at ₹2 lakh
  const homeLoanDeduction =
    Math.min(200000, n("t_home"));


  const oldDeductions =
    standardDeductionOld +
    hraExemption +
    deduction80C +
    n("t_80d") +
    npsDeduction +
    homeLoanDeduction +
    n("t_otherded");


  const oldTaxableIncome =
    Math.max(0, grossIncome - oldDeductions);


  let oldIncomeTax =
    oldTax(oldTaxableIncome, age);


  const oldRebate =
    oldRegimeRebate(
      oldTaxableIncome,
      oldIncomeTax
    );


  oldIncomeTax =
    Math.max(0, oldIncomeTax - oldRebate);


  const oldTaxWithCess =
    addCess(oldIncomeTax);


  /* -------------------------
     NEW REGIME
     ------------------------- */

  // AY 2026-27 standard deduction = ₹75,000
  const standardDeductionNew =
    Math.min(75000, salary);


  const newTaxableIncome =
    Math.max(
      0,
      grossIncome - standardDeductionNew
    );


  let newIncomeTax =
    newTax(newTaxableIncome);


  const newRebate =
    newRegimeRebate(
      newTaxableIncome,
      newIncomeTax
    );


  newIncomeTax =
    Math.max(0, newIncomeTax - newRebate);


  const newTaxWithCess =
    addCess(newIncomeTax);


  /* -------------------------
     COMPARISON
     ------------------------- */

  const difference =
    Math.abs(oldTaxWithCess - newTaxWithCess);

  const best =
    oldTaxWithCess < newTaxWithCess
      ? "Old Regime"
      : newTaxWithCess < oldTaxWithCess
        ? "New Regime"
        : "Both Regimes";


  $("taxResult").innerHTML = `
    <div>
      <b>Old Regime</b><br>
      Taxable income: ${money(oldTaxableIncome)}<br>
      Tax + cess: <strong>${money(oldTaxWithCess)}</strong>
    </div>

    <br>

    <div>
      <b>New Regime</b><br>
      Taxable income: ${money(newTaxableIncome)}<br>
      Tax + cess: <strong>${money(newTaxWithCess)}</strong>
    </div>

    <hr>

    <div>
      <b>${best}</b>
      ${
        best === "Both Regimes"
          ? " give approximately the same result."
          : ` is lower by ${money(difference)} per year.`
      }
    </div>
  `;
}


/* =========================================================
   SALARY CALCULATOR
   ========================================================= */

function calcSalary() {

  const ctc = n("s_ctc");
  const employerContribution = n("s_emp");
  const employeeDeductions = n("s_ded");
  const incomeTax = n("s_tax");

  const annualTakeHome =
    Math.max(
      0,
      ctc -
      employerContribution -
      employeeDeductions -
      incomeTax
    );

  $("salaryResult").textContent =
    money(annualTakeHome);

  $("salaryMonthly").textContent =
    money(annualTakeHome / 12);
}


/* =========================================================
   EMI CALCULATOR
   ========================================================= */

function calcEMI() {

  const principal = n("e_p");
  const annualRate = n("e_r");
  const years = n("e_n");

  const months = Math.round(years * 12);

  if (!months || !principal) {

    $("emiResult").textContent = money(0);
    $("emiInterest").textContent = money(0);

    return;
  }

  const monthlyRate =
    annualRate / 1200;

  let emi;

  if (monthlyRate === 0) {

    emi = principal / months;

  } else {

    emi =
      principal *
      monthlyRate *
      Math.pow(1 + monthlyRate, months) /
      (Math.pow(1 + monthlyRate, months) - 1);
  }

  const totalPayment =
    emi * months;

  const totalInterest =
    Math.max(0, totalPayment - principal);

  $("emiResult").textContent =
    money(emi);

  $("emiInterest").textContent =
    money(totalInterest);
}


/* =========================================================
   SIP CALCULATOR
   ========================================================= */

function calcSIP() {

  const monthlyInvestment = n("p_p");
  const annualReturn = n("p_r");
  const years = n("p_n");

  const months =
    Math.round(years * 12);

  if (!months) {

    $("sipResult").textContent =
      money(0);

    $("sipInvested").textContent =
      money(0);

    return;
  }

  const monthlyRate =
    annualReturn / 1200;

  let futureValue;

  if (monthlyRate === 0) {

    futureValue =
      monthlyInvestment * months;

  } else {

    futureValue =
      monthlyInvestment *
      (
        (Math.pow(1 + monthlyRate, months) - 1)
        / monthlyRate
      ) *
      (1 + monthlyRate);
  }

  const invested =
    monthlyInvestment * months;

  $("sipResult").textContent =
    money(futureValue);

  $("sipInvested").textContent =
    money(invested);
}


/* =========================================================
   CAR LEASE CALCULATOR
   ========================================================= */

function calcCar() {

  const monthlyLease =
    n("c_lease");

  const monthlyRunningCost =
    n("c_run");

  const annualTaxSaving =
    n("c_save");

  const annualCost =
    (monthlyLease + monthlyRunningCost) * 12;

  const effectiveAnnualCost =
    Math.max(
      0,
      annualCost - annualTaxSaving
    );

  $("carResult").textContent =
    money(effectiveAnnualCost);
}


/* =========================================================
   GOLD CALCULATOR
   ========================================================= */

function calcGold() {

  const weight =
    n("g_w");

  const purchasePrice =
    n("g_buy");

  const currentPrice =
    n("g_now");

  const makingCharges =
    n("g_make");

  const purchaseCost =
    weight * purchasePrice +
    makingCharges;

  const currentValue =
    weight * currentPrice;

  const gain =
    currentValue - purchaseCost;

  $("goldResult").textContent =
    money(gain);
}


/* =========================================================
   SMARTCALC AI DEMO
   ========================================================= */

$("aiBtn").onclick = () => {

  const question =
    $("aiInput").value.trim();

  if (!question) {

    $("aiResult").textContent =
      "Please describe what you want to calculate.";

    return;
  }

  const q =
    question.toLowerCase();

  let response;

  if (
    q.includes("tax") ||
    q.includes("regime") ||
    q.includes("80c") ||
    q.includes("hra")
  ) {

    response =
      "This looks like a tax question. Use the Tax Calculator above to compare the Old and New Tax Regimes.";

  } else if (
    q.includes("emi") ||
    q.includes("loan")
  ) {

    response =
      "This looks like a loan question. Use the EMI Calculator to calculate your monthly payment and total interest.";

  } else if (
    q.includes("sip") ||
    q.includes("mutual fund") ||
    q.includes("investment")
  ) {

    response =
      "This looks like an investment question. Use the SIP Calculator to estimate your future value.";

  } else if (
    q.includes("car") ||
    q.includes("lease")
  ) {

    response =
      "This looks like a car lease question. Use the Car Lease Calculator to estimate your effective annual cost.";

  } else if (
    q.includes("gold") ||
    q.includes("jewellery")
  ) {

    response =
      "This looks like a gold-value question. Use the Gold Calculator to estimate your gain or loss.";

  } else if (
    q.includes("salary") ||
    q.includes("ctc") ||
    q.includes("take home")
  ) {

    response =
      "This looks like a salary question. Use the Salary Calculator to estimate your annual and monthly take-home.";

  } else {

    response =
      "SmartCalc AI demo: I can help identify whether your question relates to Tax, Salary, EMI, SIP, Car Lease or Gold. Try mentioning the calculation you need.";
  }

  $("aiResult").textContent =
    response;
};

/* =========================================================
   GRATUITY CALCULATOR
   ========================================================= */

function calcGratuity() {

  const monthlySalary = n("gr_salary");
  const years = n("gr_years");
  const months = n("gr_months");

  if (!monthlySalary || !years && !months) {

    $("gratuityResult").textContent = money(0);
    $("gratuityService").textContent = "0 years";

    return;
  }

  /*
     Standard gratuity calculation:

     Gratuity =
     Last drawn Basic + DA
     × 15 / 26
     × completed years of service

     Service of 6 months or more is rounded
     to the next completed year.
  */

  let completedYears = Math.floor(years);

  if (months >= 6) {
    completedYears += 1;
  }

  const gratuity =
    monthlySalary *
    15 /
    26 *
    completedYears;

  const finalGratuity =
    Math.min(2000000, gratuity);

  $("gratuityResult").textContent =
    money(finalGratuity);

  $("gratuityService").textContent =
    `${completedYears} year${completedYears === 1 ? "" : "s"}`;
}

/* =========================================================
   LIVE CALCULATION
   ========================================================= */

document
  .querySelectorAll("input, select")
  .forEach(element => {

    element.addEventListener("input", () => {

      calcTax();
      calcSalary();
      calcEMI();
      calcSIP();
      calcCar();
      calcGold();
      calcGratuity();

    });

  });


/* =========================================================
   INITIAL CALCULATION
   ========================================================= */

calcTax();
calcSalary();
calcEMI();
calcSIP();
calcCar();
calcGold();
