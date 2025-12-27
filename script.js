/* script.js - המוח של המחשבונים (גרסה מתוקנת סופית - כולל בלון בסיכום) */

/**
 * פונקציית עזר לפרמוט מספרים כמטבע
 */
function formatCurrency(num) {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(num);
}

// משתנה גלובלי לגרף
let myChart = null;

/**
 * פונקציית עזר להצגת/הסתרת שדה המדד במחשבון הלוואה
 */
function toggleLinkage() {
    const isLinked = document.getElementById('linkageCheck').checked;
    const container = document.getElementById('cpiContainer');
    if (isLinked) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}


/**
 * ==========================================
 * 1. מחשבון ריבית דריבית (השקעות)
 * ==========================================
 */
function calculateCompoundInterest() {
    const principal = parseFloat(document.getElementById('principal').value) || 0;
    const monthlyDepositRaw = parseFloat(document.getElementById('monthlyDeposit').value) || 0;
    const annualRate = parseFloat(document.getElementById('rate').value) || 0;
    const years = parseFloat(document.getElementById('years').value) || 0;
    
    const feeAccumulation = parseFloat(document.getElementById('mgmtFeeAccumulation').value) || 0;
    const feeDeposit = parseFloat(document.getElementById('mgmtFeeDeposit').value) || 0;
    const includeTax = document.getElementById('taxCheckbox').checked;

    if (years === 0) { alert('אנא הזן מספר שנים'); return; }

    let totalBalance = principal;
    let totalDeposited = principal;
    let totalFeesPaid = 0;
    
    const labels = [];
    const dataBalance = [];
    const dataDeposited = [];
    const currentYear = new Date().getFullYear();

    const monthlyRate = Math.pow(1 + annualRate/100, 1/12) - 1; 
    const monthlyFeeRate = feeAccumulation / 100 / 12; 
    const monthlyDepositNet = monthlyDepositRaw * (1 - feeDeposit/100);
    const monthlyFeeFromDeposit = monthlyDepositRaw * (feeDeposit/100);

    for (let i = 1; i <= years * 12; i++) {
        totalBalance += monthlyDepositNet;
        totalDeposited += monthlyDepositRaw;
        totalFeesPaid += monthlyFeeFromDeposit;

        totalBalance *= (1 + monthlyRate);

        const feeAmount = totalBalance * monthlyFeeRate;
        totalBalance -= feeAmount;
        totalFeesPaid += feeAmount;

        if (i % 12 === 0) {
            labels.push(currentYear + (i / 12));
            dataBalance.push(totalBalance);
            dataDeposited.push(totalDeposited);
        }
    }

    let taxAmount = 0;
    const totalProfit = totalBalance - totalDeposited;
    if (includeTax && totalProfit > 0) {
        taxAmount = totalProfit * 0.25;
        totalBalance -= taxAmount;
    }

    document.getElementById('resTotal').innerHTML = `סכום סופי: <strong>${formatCurrency(totalBalance)}</strong>`;
    document.getElementById('resDeposits').innerHTML = `סך הכל הפקדות: ${formatCurrency(totalDeposited)}`;
    document.getElementById('resInterest').innerHTML = `סך הכל רווח נטו: ${formatCurrency(totalBalance - totalDeposited)}`;
    document.getElementById('resFees').innerHTML = `סה"כ דמי ניהול ששולמו: ${formatCurrency(totalFeesPaid)}`;
    
    const taxElement = document.getElementById('resTax');
    if (includeTax) {
        taxElement.style.display = 'block';
        taxElement.innerHTML = `מס רווחי הון ששולם (25%): ${formatCurrency(taxAmount)}`;
    } else {
        taxElement.style.display = 'none';
    }

    document.getElementById('result').style.display = 'block';

    renderGenericChart(
        'growthChart', 
        'line', 
        labels, 
        [
            { label: 'שווי התיק', data: dataBalance, borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)', fill: true },
            { label: 'סך ההפקדות', data: dataDeposited, borderColor: '#1a252f', borderDash: [5, 5], fill: false }
        ]
    );
}


/**
 * ==========================================
 * 2. מחשבון הלוואה ומשכנתא (שפיצר + מדד + בלון) - FIXED
 * ==========================================
 */
function calculateLoan() {
    // 1. קליטת נתונים
    const P_total = parseFloat(document.getElementById('loanAmount').value) || 0;
    const years = parseFloat(document.getElementById('loanYears').value) || 20;
    const annualRate = parseFloat(document.getElementById('interestRate').value) || 0;
    
    const isLinked = document.getElementById('linkageCheck').checked;
    const annualCPI = isLinked ? (parseFloat(document.getElementById('cpiRate').value) || 0) : 0;
    const balloonAmount = parseFloat(document.getElementById('balloonAmount').value) || 0;

    if (balloonAmount > P_total) { alert('סכום הבלון לא יכול להיות גדול מסכום ההלוואה'); return; }

    const months = years * 12;
    const monthlyRate = annualRate / 100 / 12;
    const monthlyCPI = Math.pow(1 + annualCPI / 100, 1/12) - 1;

    // 2. חישובים מקדימים
    const P_amortized = P_total - balloonAmount; // החלק שנפרע בשוטף (שפיצר)
    
    // חישוב בסיסי (ללא הצמדה) לחלק הנסלק
    let basePmtAmortized = 0;
    if (monthlyRate === 0) {
        basePmtAmortized = P_amortized / months;
    } else {
        basePmtAmortized = (P_amortized * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    }

    let labels = [];
    let principalData = [];
    let interestData = [];
    
    let currentBalance = P_amortized; 
    let balloonBalance = balloonAmount;
    let accumulatedCPIFactor = 1.0; 
    
    let sumOfMonthlyPayments = 0; // משתנה צובר לתשלומים החודשיים בלבד

    // לולאה חודשית
    for (let m = 1; m <= months; m++) {
        // א. עדכון מדד מצטבר
        accumulatedCPIFactor *= (1 + monthlyCPI);

        // ב. חישוב ריבית לחודש זה
        let interestForAmortized = currentBalance * monthlyRate;
        let interestForBalloon = balloonBalance * monthlyRate;
        
        // ג. חישוב קרן לחודש זה (לחלק הנסלק)
        let principalPayment = basePmtAmortized - interestForAmortized;
        
        // ד. המרה לנומינלי (כולל הצמדה למדד שנצבר עד כה)
        let nominalPrincipal = principalPayment * accumulatedCPIFactor;
        let nominalInterestAmortized = interestForAmortized * accumulatedCPIFactor;
        let nominalInterestBalloon = interestForBalloon * accumulatedCPIFactor;

        // ה. סה"כ תשלום לחודש זה
        let totalMonthlyInterest = nominalInterestAmortized + nominalInterestBalloon;
        let totalMonthlyPrincipal = nominalPrincipal;
        let totalMonthlyPayment = totalMonthlyInterest + totalMonthlyPrincipal;

        // ו. צבירה לסיכום החודשי
        sumOfMonthlyPayments += totalMonthlyPayment;
        
        // ז. עדכון יתרה (ריאלית)
        currentBalance -= principalPayment;

        // ח. שמירת נתונים לגרף
        let label = "";
        if (months <= 36 || m % 12 === 0) {
            label = (m/12).toFixed(1); 
            if (months <= 36) label = m + " חודשים";
            else label = label + " שנים";
            
            labels.push(label);
            principalData.push(totalMonthlyPrincipal);
            interestData.push(totalMonthlyInterest);
        }
    }

    // 3. חישוב הבלון הסופי
    // סילוק קרן הבלון בסוף התקופה (מוצמד למדד שנצבר עד הסוף)
    let finalBalloonToPay = balloonBalance * accumulatedCPIFactor;

    // הוספת הבלון לגרף
    if (finalBalloonToPay > 0) {
        labels.push("סילוק בלון");
        principalData.push(finalBalloonToPay);
        interestData.push(0);
    }

    // 4. חישוב הסכום הכולל הסופי (Grand Total)
    // הסכום הכולל = כל התשלומים החודשיים + תשלום הבלון הסופי
    let grandTotalPaid = sumOfMonthlyPayments + finalBalloonToPay;

    // 5. עדכון תוצאות בכרטיסיות
    // חישוב החזר ראשון (להצגה)
    let firstAccumulatedCPI = (1 + monthlyCPI);
    let firstInterest = (P_amortized * monthlyRate + balloonAmount * monthlyRate) * firstAccumulatedCPI;
    let firstPrincipal = (basePmtAmortized - (P_amortized * monthlyRate)) * firstAccumulatedCPI;

    document.getElementById('resFirstPmt').innerText = formatCurrency(firstInterest + firstPrincipal);
    
    // עדכון הסכום הכולל
    document.getElementById('resTotalPay').innerText = formatCurrency(grandTotalPaid);
    
    // עדכון סה"כ ריבית והצמדה (סך הכל ששולם פחות סכום ההלוואה המקורי)
    document.getElementById('resTotalInterest').innerText = formatCurrency(grandTotalPaid - P_total);

    document.getElementById('result').style.display = 'block';

    // 6. ציור גרף הלוואה
    renderGenericChart(
        'loanChart',
        'bar',
        labels,
        [
            { label: 'תשלום ע"ח קרן', data: principalData, backgroundColor: '#27ae60' },
            { label: 'תשלום ע"ח ריבית', data: interestData, backgroundColor: '#e74c3c' }
        ],
        true // stacked
    );
}


/**
 * ==========================================
 * 3. מחשבון מינוף (ללא שינוי)
 * ==========================================
 */
function calculateLeverage() {
    const assetValue = parseFloat(document.getElementById('assetValue').value) || 0;
    const loans = parseFloat(document.getElementById('loans').value) || 0;

    if (assetValue === 0) { alert('שווי הנכס חייב להיות גדול מאפס'); return; }

    const ltv = (loans / assetValue) * 100;
    
    let status = "";
    let color = "";

    if (ltv < 45) { status = "מצוין (סיכון נמוך)"; color = "green"; }
    else if (ltv < 60) { status = "סביר (סטנדרט בנקאי)"; color = "orange"; }
    else if (ltv < 75) { status = "גבוה (גבול המימון הבנקאי)"; color = "#d4af37"; }
    else { status = "מסוכן מאוד (חריגה)"; color = "red"; }

    document.querySelector('.result-area p:nth-child(2)').innerHTML = `אחוז המינוף שלך: <strong>${ltv.toFixed(2)}%</strong>`;
    document.querySelector('.result-area p:nth-child(3)').innerHTML = `סטטוס סיכון: <span style="color:${color}; font-weight:bold;">${status}</span>`;
    
    document.querySelector('.result-area').style.display = 'block';
}

/**
 * ==========================================
 * 4. מחשבון כדאיות מחזור (מתקדם - ניהול מספר הלוואות)
 * ==========================================
 */

// משתנה עזר לספירת הלוואות
let loanCounter = 0;

// בדיקה האם אנחנו בעמוד המיחזור כדי לאתחל את השורה הראשונה
document.addEventListener("DOMContentLoaded", function() {
    if(document.getElementById('loans-container')) {
        addLoanInput();
    }
});

function addLoanInput() {
    loanCounter++;
    const container = document.getElementById('loans-container');
    
    const loanHTML = `
        <div id="loan-${loanCounter}" class="loan-card">
            <button onclick="removeLoan(${loanCounter})" class="remove-btn" title="מחק הלוואה"><i class="fas fa-trash-alt"></i></button>
            <div class="loan-grid">
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.85em;">יתרה לסילוק (₪)</label>
                    <input type="number" class="loan-balance" oninput="updateTotalBalance()" placeholder="0">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.85em;">ריבית (%)</label>
                    <input type="number" step="0.1" class="loan-rate" placeholder="0">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.85em;">שנים שנותרו</label>
                    <input type="number" step="0.5" class="loan-years" placeholder="0">
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', loanHTML);
}

function removeLoan(id) {
    const allLoans = document.querySelectorAll('.loan-card');
    if (allLoans.length === 1) {
        // אם נשארה רק אחת, רק ננקה אותה במקום למחוק
        const card = document.getElementById(`loan-${id}`);
        card.querySelectorAll('input').forEach(i => i.value = '');
        updateTotalBalance();
        return;
    }
    
    const element = document.getElementById(`loan-${id}`);
    if(element) element.remove();
    updateTotalBalance();
}

function updateTotalBalance() {
    const balances = document.querySelectorAll('.loan-balance');
    let total = 0;
    balances.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    
    // עדכון טקסט
    const totalEl = document.getElementById('total-current-balance');
    if(totalEl) totalEl.innerText = formatCurrency(total);
    
    // מילוי אוטומטי של ההלוואה החדשה
    const newAmountInput = document.getElementById('new-amount');
    if (newAmountInput) newAmountInput.value = total;
}

// פונקציית עזר לחישוב החזר חודשי (שפיצר)
function calculatePMT(principal, annualRate, years) {
    if (principal <= 0 || years <= 0) return 0;
    if (annualRate === 0) return principal / (years * 12);
    
    const months = years * 12;
    const monthlyRate = (annualRate / 100) / 12;
    
    const pmt = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return pmt;
}

// הפונקציה הראשית לחישוב
function calculateRefinance() {
    // 1. חישוב מצב קיים
    let currentTotalMonthly = 0;
    let currentTotalCost = 0;
    let hasData = false;
    
    const loanCards = document.querySelectorAll('.loan-card');
    
    loanCards.forEach(card => {
        const balance = parseFloat(card.querySelector('.loan-balance').value) || 0;
        const rate = parseFloat(card.querySelector('.loan-rate').value) || 0;
        const years = parseFloat(card.querySelector('.loan-years').value) || 0;

        if (balance > 0 && years > 0) {
            hasData = true;
            const monthly = calculatePMT(balance, rate, years);
            currentTotalMonthly += monthly;
            currentTotalCost += (monthly * (years * 12));
        }
    });

    if (!hasData) {
        alert("אנא הזן נתונים תקינים בהלוואות הקיימות");
        return;
    }

    // 2. חישוב מצב חדש
    const newAmount = parseFloat(document.getElementById('new-amount').value) || 0;
    const newRate = parseFloat(document.getElementById('new-rate').value) || 0;
    const newYears = parseFloat(document.getElementById('new-years').value) || 0;
    const setupCost = parseFloat(document.getElementById('setup-cost').value) || 0;

    if (newAmount <= 0 || newYears <= 0) {
        alert("אנא מלא את פרטי הלוואת המיחזור");
        return;
    }

    const newMonthlyPayment = calculatePMT(newAmount, newRate, newYears);
    // עלות ההקמה מתווספת לעלות הכוללת של המהלך
    let newTotalCost = (newMonthlyPayment * (newYears * 12)) + setupCost;

    // 3. הצגת תוצאות
    renderRefinanceResults(currentTotalMonthly, newMonthlyPayment, currentTotalCost, newTotalCost);
}

function renderRefinanceResults(currMonthly, newMonthly, currTotal, newTotal) {
    const resultsArea = document.getElementById('results-area');
    resultsArea.style.display = 'block';

    // מילוי הטבלה
    document.getElementById('res-curr-monthly').innerText = formatCurrency(currMonthly);
    document.getElementById('res-new-monthly').innerText = formatCurrency(newMonthly);
    document.getElementById('res-curr-total').innerText = formatCurrency(currTotal);
    document.getElementById('res-new-total').innerText = formatCurrency(newTotal);

    // חישוב הפרשים
    const monthlySave = currMonthly - newMonthly;
    const totalSave = currTotal - newTotal;

    const diffMonthlyEl = document.getElementById('diff-monthly');
    const diffTotalEl = document.getElementById('diff-total');
    const verdictEl = document.getElementById('verdict-badge');

    // עיצוב ההפרש החודשי
    if (monthlySave > 0) {
        diffMonthlyEl.innerText = `+${formatCurrency(monthlySave)}`;
        diffMonthlyEl.style.color = "#27ae60"; // ירוק
    } else {
        diffMonthlyEl.innerText = `${formatCurrency(monthlySave)}`;
        diffMonthlyEl.style.color = "#c0392b"; // אדום
    }

    // עיצוב ההפרש הכולל
    if (totalSave > 0) {
        diffTotalEl.innerText = `+${formatCurrency(totalSave)}`;
        diffTotalEl.style.color = "#27ae60";
    } else {
        diffTotalEl.innerText = `${formatCurrency(totalSave)}`;
        diffTotalEl.style.color = "#c0392b";
    }

    // לוגיקת המלצה (Verdict)
    verdictEl.className = 'verdict-badge'; // איפוס מחלקות
    
    if (totalSave > 0 && monthlySave > 0) {
        verdictEl.classList.add('verdict-success');
        verdictEl.innerHTML = '<i class="fas fa-check-circle"></i> מיחזור משתלם מאוד! גם מקטין החזר וגם חוסך ריבית.';
    } else if (monthlySave > 0 && totalSave < 0) {
        verdictEl.classList.add('verdict-warning');
        verdictEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> מקטין את הלחץ החודשי, אך מייקר את ההלוואה בסה"כ.';
    } else if (totalSave > 0 && monthlySave < 0) {
         verdictEl.classList.add('verdict-info');
        verdictEl.innerHTML = '<i class="fas fa-piggy-bank"></i> חוסך כסף בטווח הארוך, אך יגדיל את ההחזר החודשי.';
    } else {
        verdictEl.classList.add('verdict-danger');
        verdictEl.innerHTML = '<i class="fas fa-times-circle"></i> לא משתלם כלל.';
    }
    
    // גלילה לתוצאות
    resultsArea.scrollIntoView({ behavior: 'smooth' });
}


/**
 * ==========================================
 * פונקציה גנרית לציור גרפים
 * ==========================================
 */
function renderGenericChart(canvasId, type, labels, datasets, stacked = false) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (myChart) {
        myChart.destroy();
    }

    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: stacked ? 'index' : 'nearest',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            label += new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(context.raw);
                            return label;
                        }
                    }
                },
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    stacked: stacked,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return '₪' + value.toLocaleString(); }
                    }
                },
                x: {
                    stacked: stacked
                }
            }
        }
    };

    myChart = new Chart(ctx, config);
}

/**
 * ==========================================
 * 5. ניהול תפריט מובייל (UI)
 * ==========================================
 */

// פונקציה לפתיחת התפריט בנייד
function toggleMobileMenu(event) {
    event.preventDefault(); // מונע קפיצה של הדף
    document.getElementById("myDropdown").classList.toggle("show");
}

// סגירת התפריט אם לוחצים במקום אחר במסך
window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}; // זהו הסוף, אין כאן סוגריים נוספים

/**
 * ==========================================
 * 6. מחשבון כדאיות מינוף (הלוואה מול הפקדה חודשית)
 * ==========================================
 */

function toggleLevLinkage() {
    const isLinked = document.getElementById('levLinkageCheck').checked;
    const container = document.getElementById('levCpiContainer');
    if (isLinked) container.classList.remove('hidden');
    else container.classList.add('hidden');
}

function calculateInvestmentLeverage() {
    // 1. קלט נתונים
    const principal = parseFloat(document.getElementById('levLoanAmount').value) || 0;
    const years = parseFloat(document.getElementById('levYears').value) || 0;
    const loanRate = parseFloat(document.getElementById('levLoanRate').value) || 0;
    
    const isLinked = document.getElementById('levLinkageCheck').checked;
    const cpiRate = isLinked ? (parseFloat(document.getElementById('levCpiRate').value) || 0) : 0;
    
    const balloonAmount = parseFloat(document.getElementById('levBalloonAmount').value) || 0;
    const investReturn = parseFloat(document.getElementById('levInvReturn').value) || 0;
    const isTaxed = document.getElementById('levTaxCheck').checked; // האם לחשב מס

    if (principal === 0 || years === 0) { alert('אנא הזן סכום ושנים'); return; }

    // --- חישוב הלוואה (כדי לדעת עלויות ותזרים חודשי) ---
    const months = years * 12;
    const monthlyLoanRate = loanRate / 100 / 12;
    const monthlyCpiRate = Math.pow(1 + cpiRate/100, 1/12) - 1;
    
    const P_amortized = principal - balloonAmount; // החלק לשפיצר
    
    // החזר בסיס לשפיצר (לפני מדד וריבית)
    let basePmt = 0;
    if (monthlyLoanRate === 0) basePmt = P_amortized / months;
    else basePmt = (P_amortized * monthlyLoanRate) / (1 - Math.pow(1 + monthlyLoanRate, -months));

    let loanBalance = P_amortized;
    let balloonBalance = balloonAmount;
    let accumCpi = 1.0;
    
    let totalPaidToBank = 0;
    let flowMonthlyPayment = []; // נשמור את התזרים כדי להשקיע אותו בתרחיש ב'
    
    // נתונים לגרף
    let labels = [];
    let dataScenarioA = []; // מינוף
    let dataScenarioB = []; // הפקדה חודשית

    // --- תרחיש ב': הפקדה חודשית ---
    // אנחנו נשקיע בתרחיש ב' בדיוק את מה שהיינו משלמים לבנק בתרחיש א'
    let scenarioB_Value = 0;
    let scenarioB_TotalDeposited = 0;
    const monthlyInvRate = Math.pow(1 + investReturn/100, 1/12) - 1; // ריבית דריבית חודשית להפקדות

    // לולאה חודשית לחישוב ההלוואה + השקעה חודשית מקבילה
    for (let m = 1; m <= months; m++) {
        // 1. טיפול בהלוואה
        accumCpi *= (1 + monthlyCpiRate);
        
        let interestPart = (loanBalance * monthlyLoanRate) + (balloonBalance * monthlyLoanRate);
        let principalPart = basePmt - (loanBalance * monthlyLoanRate);
        
        // המרה לנומינלי (צמוד)
        let totalMonthlyPay = (interestPart + principalPart) * accumCpi;
        
        // עדכון יתרות הלוואה
        loanBalance -= principalPart;
        totalPaidToBank += totalMonthlyPay;

        // 2. טיפול בתרחיש ב' (השקעת הסכום הזה)
        scenarioB_Value += totalMonthlyPay; // הפקדה
        scenarioB_Value *= (1 + monthlyInvRate); // צמיחה החודש
        scenarioB_TotalDeposited += totalMonthlyPay;

        // שמירה לגרף (פעם בשנה)
        if (m % 12 === 0) {
            // תרחיש א' (מינוף) לגרף: ערך נוכחי לפי ריבית שנתית
            // הערה: בתרחיש א' הכסף מושקע כולו בהתחלה
            let yearsPassed = m / 12;
            let valA = principal * Math.pow(1 + investReturn/100, yearsPassed);
            
            // הורדת המס מהגרף כדי להראות שווי נטו משוער (אופציונלי, כאן נראה ברוטו בגרף ולמטה נטו)
            // לצורך פשטות הגרף יראה ברוטו
            dataScenarioA.push(valA);
            dataScenarioB.push(scenarioB_Value);
            labels.push(yearsPassed);
        }
    }

    // תשלום בלון בסוף (אם יש)
    let finalBalloonPay = balloonBalance * accumCpi;
    totalPaidToBank += finalBalloonPay;
    
    // בתרחיש ב', אם היינו צריכים לשלם בלון בסוף, זה אומר שגם את הסכום הזה 
    // אנחנו מכניסים להשקעה ברגע האחרון (כי זה כסף שיצא מהכיס)
    if (finalBalloonPay > 0) {
        scenarioB_Value += finalBalloonPay; 
        scenarioB_TotalDeposited += finalBalloonPay;
    }

    // --- סיכום תרחיש א': מינוף (השקעה חד פעמית שנתית) ---
    // חישוב ריבית דריבית שנתית (כפי שביקשת)
    let scenarioA_GrossValue = principal * Math.pow(1 + investReturn/100, years);
    
    // חישוב מס
    let taxA = 0;
    let profitA = scenarioA_GrossValue - principal;
    if (isTaxed && profitA > 0) taxA = profitA * 0.25;
    
    let scenarioA_NetValue = scenarioA_GrossValue - taxA;
    // הרווח בכיס = מה שנשאר ביד פחות מה ששילמתי לבנק סה"כ (כולל הקרן שהחזרתי)
    // הערה: טכנית, הכסף שיצא מהכיס הוא TotalPaidToBank. הכסף שנכנס הוא ScenarioA_NetValue.
    // אבל! ההלוואה כיסתה את ההשקעה. אז "מהכיס" יצא רק הריבית והחזרי הקרן.
    let scenarioA_NetProfit = scenarioA_NetValue - totalPaidToBank;


    // --- סיכום תרחיש ב': הפקדה חודשית ---
    // חישוב מס
    let taxB = 0;
    let profitB = scenarioB_Value - scenarioB_TotalDeposited;
    if (isTaxed && profitB > 0) taxB = profitB * 0.25;
    
    let scenarioB_NetValue = scenarioB_Value - taxB;
    let scenarioB_NetProfit = scenarioB_NetValue - scenarioB_TotalDeposited;

    // --- הצגה ב-DOM ---
    document.getElementById('result').style.display = 'block';

    // תרחיש א
    document.getElementById('resLevFinalValue').innerText = formatCurrency(scenarioA_NetValue);
    document.getElementById('resLevTotalCost').innerText = formatCurrency(totalPaidToBank);
    document.getElementById('resLevNetProfit').innerText = formatCurrency(scenarioA_NetProfit);
    
    // צבע לרווח א'
    document.getElementById('resLevNetProfit').style.color = scenarioA_NetProfit > 0 ? '#27ae60' : '#c0392b';

    // תרחיש ב
    document.getElementById('resMonthlyFinalValue').innerText = formatCurrency(scenarioB_NetValue);
    document.getElementById('resMonthlyTotalDeposited').innerText = formatCurrency(scenarioB_TotalDeposited);
    document.getElementById('resMonthlyNetProfit').innerText = formatCurrency(scenarioB_NetProfit);

    // באדג' המלצה
    const badge = document.getElementById('levVerdictBadge');
    const diff = scenarioA_NetProfit - scenarioB_NetProfit;
    
    if (diff > 0) {
        badge.className = 'verdict-badge verdict-success';
        badge.innerHTML = `<i class="fas fa-check-circle"></i> המינוף משתלם! רווח עודף של ${formatCurrency(diff)}`;
    } else {
        badge.className = 'verdict-badge verdict-danger';
        badge.innerHTML = `<i class="fas fa-times-circle"></i> לא משתלם למנף. עדיף להשקיע חודשית. (הפסד אלטרנטיבי: ${formatCurrency(Math.abs(diff))})`;
    }

    // ציור גרף
    renderGenericChart(
        'leverageChart',
        'line',
        labels,
        [
            { label: 'מינוף (שווי ברוטו)', data: dataScenarioA, borderColor: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)', fill: true },
            { label: 'הפקדה חודשית (שווי ברוטו)', data: dataScenarioB, borderColor: '#1a252f', borderDash: [5, 5], fill: false }
        ]
    );
}

/**
 * ==========================================
 * 7. לוגיקה למרכז הידע (חיפוש וסינון)
 * ==========================================
 */

function filterArticles() {
    const input = document.getElementById('searchInput');
    // בדיקת תקינות למקרה שאנחנו בעמוד אחר שאין בו חיפוש
    if (!input) return; 

    const filter = input.value.toUpperCase();
    const grid = document.getElementById('articlesGrid');
    const articles = grid.getElementsByClassName('article-card');
    let hasResults = false;

    for (let i = 0; i < articles.length; i++) {
        const title = articles[i].getElementsByTagName("h3")[0];
        const excerpt = articles[i].getElementsByClassName("article-excerpt")[0];
        
        const txtValue = (title.textContent || title.innerText) + " " + (excerpt.textContent || excerpt.innerText);
        
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
            // כאן אנחנו מניחים שהחיפוש גובר על קטגוריות לצורך פשטות
            // אם הכרטיס הוסתר ע"י קטגוריה, החיפוש יחשוף אותו אם הוא מתאים לטקסט
             if (articles[i].style.display !== "none") { 
                articles[i].style.display = "";
                hasResults = true;
            }
            // תיקון קטן: אם חיפשנו משהו ספציפי, נציג אותו גם אם הוא בקטגוריה אחרת כרגע
            // (אופציונלי: אפשר להחמיר ולבדוק גם קטגוריה, אך לרוב בחיפוש רוצים לראות הכל)
            articles[i].style.display = ""; 
            hasResults = true;
        } else {
            articles[i].style.display = "none";
        }
    }
    
    // הצגת הודעת "לא נמצאו תוצאות"
    const noResultsMsg = document.getElementById('noResults');
    if (noResultsMsg) {
        noResultsMsg.style.display = hasResults ? "none" : "block";
    }
}

function filterCategory(category) {
    const articles = document.getElementsByClassName('article-card');
    const buttons = document.getElementsByClassName('filter-btn');
    const searchInput = document.getElementById('searchInput');
    
    // איפוס שדה החיפוש במעבר קטגוריה
    if (searchInput) searchInput.value = '';

    // עדכון כפתורים (הסרת active מכולם והוספה לנוכחי)
    // הערה: event הוא אובייקט גלובלי בדפדפן, אך עדיף להעביר אותו כפרמטר. 
    // לצורך פשטות בקוד הקיים, נשתמש בלולאה לניקוי:
    for (let btn of buttons) {
        btn.classList.remove('active');
    }
    // הוספת המחלקה לכפתור שנלחץ (דרך ה-event הגלובלי)
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // סינון הכרטיסיות
    let hasResults = false;
    for (let article of articles) {
        if (category === 'all' || article.getAttribute('data-category') === category) {
            article.style.display = "";
            hasResults = true;
        } else {
            article.style.display = "none";
        }
    }
    
    const noResultsMsg = document.getElementById('noResults');
    if (noResultsMsg) {
        noResultsMsg.style.display = hasResults ? "none" : "block";
    }
}
