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
 * 4. מחשבון כדאיות מחזור (ללא שינוי)
 * ==========================================
 */
function calculateRefinance() {
    const balance = parseFloat(document.getElementById('currentBalance').value) || 0;
    const currentRate = parseFloat(document.getElementById('currentRate').value) || 0;
    const newRate = parseFloat(document.getElementById('newRate').value) || 0;
    const cost = parseFloat(document.getElementById('refinanceCost').value) || 0;
    
    const interestDiff = currentRate - newRate;
    
    if (interestDiff <= 0) {
        document.querySelector('.result-area p:nth-child(2)').innerHTML = `אין חיסכון בריבית (הריבית החדשה גבוהה או שווה).`;
        document.querySelector('.result-area p:nth-child(3)').innerHTML = `המלצה: <strong>לא למחזר</strong>`;
        document.querySelector('.result-area').style.display = 'block';
        return;
    }

    const annualSaving = balance * (interestDiff / 100);
    const breakEvenMonths = cost / (annualSaving / 12);

    let recommendation = "";
    if (breakEvenMonths > 60) { 
        recommendation = "גבולי (זמן החזר ההשקעה ארוך)";
    } else {
        recommendation = `כדאי! (תחזירו את עלות המחזור תוך כ-${Math.ceil(breakEvenMonths)} חודשים)`;
    }

    document.querySelector('.result-area p:nth-child(2)').innerHTML = `חיסכון שנתי משוער: <strong>${formatCurrency(annualSaving)}</strong>`;
    document.querySelector('.result-area p:nth-child(3)').innerHTML = `המלצה: ${recommendation}`;
    
    document.querySelector('.result-area').style.display = 'block';
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

<script>
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
    }
</script>
