/**
 * Neil Kappel Financial Planning
 * Ultimate JavaScript v3.0
 * All calculator functions + enhanced UX
 */

/* ============================================
   1. UTILITY FUNCTIONS
   ============================================ */

/**
 * Format number as Israeli currency
 */
function formatCurrency(num) {
    return new Intl.NumberFormat('he-IL', { 
        style: 'currency', 
        currency: 'ILS', 
        maximumFractionDigits: 0 
    }).format(num);
}

/**
 * Format number with commas (for display)
 */
function formatNumber(num) {
    return new Intl.NumberFormat('he-IL', { 
        maximumFractionDigits: 0 
    }).format(num);
}

/**
 * Format as percentage
 */
function formatPercent(num) {
    return new Intl.NumberFormat('he-IL', { 
        style: 'percent', 
        minimumFractionDigits: 1,
        maximumFractionDigits: 2 
    }).format(num / 100);
}

/**
 * Parse number from input (handles commas)
 */
function parseInputNumber(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/,/g, '')) || 0;
}

/**
 * Debounce function for search
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/* ============================================
   2. GLOBAL CHART VARIABLE
   ============================================ */
let myChart = null;

/* ============================================
   3. NAVIGATION & MOBILE MENU
   ============================================ */

/**
 * Toggle mobile dropdown menu
 */
function toggleMobileMenu(event) {
    if (event) {
        event.stopPropagation();
    }
    const dropdown = document.getElementById('myDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdowns = document.querySelectorAll('.dropdown-content');
    dropdowns.forEach(dropdown => {
        if (!dropdown.contains(event.target) && 
            !event.target.classList.contains('dropbtn')) {
            dropdown.classList.remove('show');
        }
    });
});

// Keyboard support for dropdown
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => dropdown.classList.remove('show'));
    }
});

/* ============================================
   4. LOAN CALCULATOR HELPERS
   ============================================ */

/**
 * Toggle linkage/CPI input visibility
 */
function toggleLinkage() {
    const isLinked = document.getElementById('linkageCheck');
    const container = document.getElementById('cpiContainer');
    if (isLinked && container) {
        if (isLinked.checked) {
            container.classList.remove('hidden');
            container.style.display = 'block';
        } else {
            container.classList.add('hidden');
            container.style.display = 'none';
        }
    }
}

/**
 * Toggle balloon payment input visibility
 */
function toggleBalloon() {
    const hasBalloon = document.getElementById('balloonCheck');
    const container = document.getElementById('balloonContainer');
    if (hasBalloon && container) {
        if (hasBalloon.checked) {
            container.classList.remove('hidden');
            container.style.display = 'block';
        } else {
            container.classList.add('hidden');
            container.style.display = 'none';
        }
    }
}

/* ============================================
   5. COMPOUND INTEREST CALCULATOR
   ============================================ */
function calculateCompoundInterest() {
    // Get inputs
    const principal = parseInputNumber(document.getElementById('principal')?.value) || 0;
    const monthlyDepositRaw = parseInputNumber(document.getElementById('monthlyDeposit')?.value) || 0;
    const annualRate = parseFloat(document.getElementById('rate')?.value) || 0;
    const years = parseFloat(document.getElementById('years')?.value) || 0;
    
    const feeAccumulation = parseFloat(document.getElementById('mgmtFeeAccumulation')?.value) || 0;
    const feeDeposit = parseFloat(document.getElementById('mgmtFeeDeposit')?.value) || 0;
    const includeTax = document.getElementById('taxCheckbox')?.checked || false;

    // Validation
    if (years === 0) { 
        showError('אנא הזן מספר שנים');
        return; 
    }

    // Calculations
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

    // Year-by-year data for table
    const yearlyData = [];

    for (let i = 1; i <= years * 12; i++) {
        totalBalance += monthlyDepositNet;
        totalDeposited += monthlyDepositRaw;
        totalFeesPaid += monthlyFeeFromDeposit;

        totalBalance *= (1 + monthlyRate);

        const feeAmount = totalBalance * monthlyFeeRate;
        totalBalance -= feeAmount;
        totalFeesPaid += feeAmount;

        if (i % 12 === 0) {
            const yearNum = i / 12;
            labels.push(currentYear + yearNum);
            dataBalance.push(totalBalance);
            dataDeposited.push(totalDeposited);
            
            yearlyData.push({
                year: yearNum,
                balance: totalBalance,
                deposited: totalDeposited,
                profit: totalBalance - totalDeposited
            });
        }
    }

    // Calculate tax
    let taxAmount = 0;
    const totalProfit = totalBalance - totalDeposited;
    if (includeTax && totalProfit > 0) {
        taxAmount = totalProfit * 0.25;
        totalBalance -= taxAmount;
    }

    // Calculate ROI
    const roi = totalDeposited > 0 ? ((totalBalance - totalDeposited) / totalDeposited) * 100 : 0;

    // Display results
    const resultArea = document.getElementById('result');
    if (resultArea) {
        resultArea.style.display = 'block';
        
        // Main result
        const resTotal = document.getElementById('resTotal');
        if (resTotal) resTotal.innerHTML = `<span class="label">סכום סופי</span><span class="value">${formatCurrency(totalBalance)}</span>`;
        
        // Other results
        const resDeposits = document.getElementById('resDeposits');
        if (resDeposits) resDeposits.innerHTML = `סך הכל הפקדות: <strong>${formatCurrency(totalDeposited)}</strong>`;
        
        const resInterest = document.getElementById('resInterest');
        if (resInterest) resInterest.innerHTML = `רווח נטו: <strong>${formatCurrency(totalBalance - totalDeposited)}</strong>`;
        
        const resROI = document.getElementById('resROI');
        if (resROI) resROI.innerHTML = `תשואה כוללת: <strong>${roi.toFixed(1)}%</strong>`;
        
        const resFees = document.getElementById('resFees');
        if (resFees) resFees.innerHTML = `דמי ניהול ששולמו: <strong>${formatCurrency(totalFeesPaid)}</strong>`;
        
        const resTax = document.getElementById('resTax');
        if (resTax) {
            if (includeTax) {
                resTax.style.display = 'block';
                resTax.innerHTML = `מס רווחי הון (25%): <strong>${formatCurrency(taxAmount)}</strong>`;
            } else {
                resTax.style.display = 'none';
            }
        }
    }

    // Render chart
    renderGenericChart(
        'growthChart', 
        'line', 
        labels, 
        [
            { 
                label: 'שווי התיק', 
                data: dataBalance, 
                borderColor: '#c9a227', 
                backgroundColor: 'rgba(201, 162, 39, 0.1)', 
                fill: true,
                tension: 0.3
            },
            { 
                label: 'סך ההפקדות', 
                data: dataDeposited, 
                borderColor: '#0f1923', 
                borderDash: [5, 5], 
                fill: false,
                tension: 0.3
            }
        ]
    );

    // Scroll to results
    resultArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================
   6. LOAN CALCULATOR (SPITZER)
   ============================================ */
function calculateLoan() {
    // Get inputs
    const P_total = parseInputNumber(document.getElementById('loanAmount')?.value) || 0;
    const years = parseFloat(document.getElementById('loanYears')?.value) || 20;
    const annualRate = parseFloat(document.getElementById('interestRate')?.value) || 0;
    
    const isLinked = document.getElementById('linkageCheck')?.checked || false;
    const annualCPI = isLinked ? (parseFloat(document.getElementById('cpiRate')?.value) || 0) : 0;
    const balloonAmount = parseInputNumber(document.getElementById('balloonAmount')?.value) || 0;

    // Validation
    if (P_total === 0) {
        showError('אנא הזן סכום הלוואה');
        return;
    }
    
    if (balloonAmount > P_total) { 
        showError('סכום הבלון לא יכול להיות גדול מסכום ההלוואה'); 
        return; 
    }

    const months = years * 12;
    const monthlyRate = annualRate / 100 / 12;
    const monthlyCPI = Math.pow(1 + annualCPI / 100, 1/12) - 1;

    // Calculations
    const P_amortized = P_total - balloonAmount;
    
    let basePmtAmortized = 0;
    if (monthlyRate === 0) {
        basePmtAmortized = P_amortized / months;
    } else {
        basePmtAmortized = (P_amortized * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    }

    let labels = [];
    let balanceData = [];
    let amortizationTable = [];
    
    let currentBalance = P_amortized; 
    let balloonBalance = balloonAmount;
    let accumulatedCPIFactor = 1.0; 
    
    let sumOfMonthlyPayments = 0;
    let totalInterestPaid = 0;
    let totalLinkagePaid = 0;
    let firstMonthPayment = 0;

    for (let m = 1; m <= months; m++) {
        accumulatedCPIFactor *= (1 + monthlyCPI);

        let interestForAmortized = currentBalance * monthlyRate;
        let interestForBalloon = balloonBalance * monthlyRate;
        
        let principalPayment = basePmtAmortized - interestForAmortized;
        
        let nominalPrincipal = principalPayment * accumulatedCPIFactor;
        let nominalInterestAmortized = interestForAmortized * accumulatedCPIFactor;
        let nominalInterestBalloon = interestForBalloon * accumulatedCPIFactor;

        let totalMonthlyInterest = nominalInterestAmortized + nominalInterestBalloon;
        let totalMonthlyPayment = totalMonthlyInterest + nominalPrincipal;

        if (m === 1) firstMonthPayment = totalMonthlyPayment;
        
        sumOfMonthlyPayments += totalMonthlyPayment;
        totalInterestPaid += totalMonthlyInterest;
        
        // Calculate linkage portion
        if (isLinked) {
            const basePrincipal = principalPayment;
            const baseInterest = interestForAmortized + interestForBalloon;
            const linkageOnPayment = (nominalPrincipal - basePrincipal) + (totalMonthlyInterest - baseInterest);
            totalLinkagePaid += linkageOnPayment;
        }
        
        currentBalance -= principalPayment;

        // Store for chart (yearly data)
        if (m % 12 === 0 || m === 1 || m === months) {
            const yearLabel = m === months ? `${years} שנים` : `${(m/12).toFixed(1)} שנים`;
            labels.push(yearLabel);
            balanceData.push(Math.max(0, currentBalance * accumulatedCPIFactor + balloonBalance * accumulatedCPIFactor));
        }
        
        // Store for table (first 12 months + yearly)
        if (m <= 12 || m % 12 === 0) {
            amortizationTable.push({
                month: m,
                payment: totalMonthlyPayment,
                principal: nominalPrincipal,
                interest: totalMonthlyInterest,
                balance: Math.max(0, currentBalance * accumulatedCPIFactor)
            });
        }
    }

    // Final balloon payment
    let finalBalloonToPay = balloonBalance * accumulatedCPIFactor;
    let grandTotal = sumOfMonthlyPayments + finalBalloonToPay;
    
    // Calculate cost percentage
    const costPercentage = ((grandTotal - P_total) / P_total) * 100;

    // Display results
    const resultArea = document.getElementById('result');
    if (resultArea) {
        resultArea.style.display = 'block';
        
        const resMonthlyPayment = document.getElementById('resMonthlyPayment');
        if (resMonthlyPayment) resMonthlyPayment.innerHTML = `<span class="label">החזר חודשי ראשון</span><span class="value">${formatCurrency(firstMonthPayment)}</span>`;
        
        const resTotalPayment = document.getElementById('resTotalPayment');
        if (resTotalPayment) resTotalPayment.innerHTML = `<span class="label">סה"כ לתשלום</span><span class="value">${formatCurrency(grandTotal)}</span>`;
        
        const resInterest = document.getElementById('resInterest');
        if (resInterest) resInterest.innerHTML = `ריבית כוללת: <strong>${formatCurrency(totalInterestPaid)}</strong>`;
        
        const resLinkage = document.getElementById('resLinkage');
        if (resLinkage) {
            if (isLinked && totalLinkagePaid > 0) {
                resLinkage.style.display = 'block';
                resLinkage.innerHTML = `הפרשי הצמדה: <strong>${formatCurrency(totalLinkagePaid)}</strong>`;
            } else {
                resLinkage.style.display = 'none';
            }
        }
        
        const resCostPercent = document.getElementById('resCostPercent');
        if (resCostPercent) resCostPercent.innerHTML = `עלות ביחס לקרן: <strong>${costPercentage.toFixed(1)}%</strong>`;
        
        const resBalloonFinal = document.getElementById('resBalloonFinal');
        if (resBalloonFinal) {
            if (finalBalloonToPay > 0) {
                resBalloonFinal.style.display = 'block';
                resBalloonFinal.innerHTML = `<div class="verdict-badge verdict-warning"><i class="fas fa-exclamation-triangle"></i> תשלום בלון בסוף התקופה: ${formatCurrency(finalBalloonToPay)}</div>`;
            } else {
                resBalloonFinal.style.display = 'none';
            }
        }
    }

    // Render chart
    renderGenericChart(
        'loanChart', 
        'line', 
        labels, 
        [
            { 
                label: 'יתרת קרן', 
                data: balanceData, 
                borderColor: '#0f1923', 
                backgroundColor: 'rgba(15, 25, 35, 0.1)', 
                fill: true,
                tension: 0.3
            }
        ]
    );

    resultArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================
   7. CHART RENDERING
   ============================================ */
function renderGenericChart(canvasId, type, labels, datasets) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destroy existing chart
    if (myChart) {
        myChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    
    myChart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: datasets.map(ds => ({
                ...ds,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    rtl: true,
                    labels: {
                        font: {
                            family: 'Heebo',
                            size: 12
                        },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    rtl: true,
                    titleFont: {
                        family: 'Heebo'
                    },
                    bodyFont: {
                        family: 'Heebo'
                    },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Heebo'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            family: 'Heebo'
                        },
                        callback: function(value) {
                            return formatNumber(value) + ' ₪';
                        }
                    }
                }
            }
        }
    });
}

/* ============================================
   8. KNOWLEDGE CENTER - SEARCH & FILTER
   ============================================ */
const filterArticlesDebounced = debounce(function() {
    filterArticles();
}, 300);

function filterArticles() {
    const input = document.getElementById('searchInput');
    if (!input) return; 

    const filter = input.value.toUpperCase().trim();
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;
    
    const articles = grid.getElementsByClassName('article-card');
    let hasResults = false;
    let visibleCount = 0;

    for (let i = 0; i < articles.length; i++) {
        const title = articles[i].getElementsByTagName("h3")[0];
        const excerpt = articles[i].getElementsByClassName("article-excerpt")[0];
        const tag = articles[i].getElementsByClassName("article-tag")[0];
        
        const txtValue = [
            title?.textContent || '',
            excerpt?.textContent || '',
            tag?.textContent || ''
        ].join(' ');
        
        if (filter === '' || txtValue.toUpperCase().indexOf(filter) > -1) {
            articles[i].style.display = "";
            hasResults = true;
            visibleCount++;
        } else {
            articles[i].style.display = "none";
        }
    }
    
    // Update no results message
    const noResultsMsg = document.getElementById('noResults');
    if (noResultsMsg) {
        noResultsMsg.style.display = hasResults ? "none" : "block";
    }
    
    // Announce to screen readers
    announceFilterResults(visibleCount);
}

function filterCategory(category) {
    const articles = document.getElementsByClassName('article-card');
    const buttons = document.getElementsByClassName('filter-btn');
    const searchInput = document.getElementById('searchInput');
    
    // Reset search
    if (searchInput) searchInput.value = '';

    // Update button states
    for (let btn of buttons) {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    }
    
    // Set active button
    if (event && event.target) {
        event.target.classList.add('active');
        event.target.setAttribute('aria-pressed', 'true');
    }

    // Filter articles
    let hasResults = false;
    let visibleCount = 0;
    
    for (let article of articles) {
        if (category === 'all' || article.getAttribute('data-category') === category) {
            article.style.display = "";
            hasResults = true;
            visibleCount++;
        } else {
            article.style.display = "none";
        }
    }
    
    const noResultsMsg = document.getElementById('noResults');
    if (noResultsMsg) {
        noResultsMsg.style.display = hasResults ? "none" : "block";
    }
    
    announceFilterResults(visibleCount);
}

function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    filterCategory('all');
    
    // Reset buttons
    const buttons = document.getElementsByClassName('filter-btn');
    for (let btn of buttons) {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    }
    if (buttons[0]) {
        buttons[0].classList.add('active');
        buttons[0].setAttribute('aria-pressed', 'true');
    }
}

function announceFilterResults(count) {
    const announcement = document.getElementById('filterAnnouncement');
    if (announcement) {
        announcement.textContent = count > 0 
            ? `נמצאו ${count} מאמרים` 
            : 'לא נמצאו מאמרים תואמים';
    }
}

/* ============================================
   9. ERROR HANDLING & NOTIFICATIONS
   ============================================ */
function showError(message) {
    // Check if there's already an error message
    let errorDiv = document.querySelector('.error-notification');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #fee2e2;
            color: #dc2626;
            padding: 16px 24px;
            border-radius: 12px;
            border: 2px solid #dc2626;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 9999;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideDown 0.3s ease-out;
        `;
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Remove after 4 seconds
    setTimeout(() => {
        errorDiv.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => errorDiv.remove(), 300);
    }, 4000);
}

/* ============================================
   10. FORM ENHANCEMENTS
   ============================================ */

// Add input formatting on blur
document.addEventListener('DOMContentLoaded', function() {
    // Format number inputs on blur
    const numberInputs = document.querySelectorAll('input[type="number"], input[inputmode="numeric"]');
    numberInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !this.classList.contains('no-format')) {
                // Keep the raw value for calculations
            }
        });
    });
    
    // Handle Enter key in forms
    const forms = document.querySelectorAll('.tool-container');
    forms.forEach(form => {
        form.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
                const calcBtn = form.querySelector('.calc-btn');
                if (calcBtn) calcBtn.click();
            }
        });
    });
    
    // Initialize toggle states
    if (document.getElementById('linkageCheck')) {
        toggleLinkage();
    }
    if (document.getElementById('balloonCheck')) {
        toggleBalloon();
    }
});

/* ============================================
   11. SMOOTH SCROLL BEHAVIOR
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

/* ============================================
   12. ADD CSS ANIMATIONS
   ============================================ */
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

/* ============================================
   13. EXPORT FOR GLOBAL ACCESS
   ============================================ */
window.calculateCompoundInterest = calculateCompoundInterest;
window.calculateLoan = calculateLoan;
window.toggleLinkage = toggleLinkage;
window.toggleBalloon = toggleBalloon;
window.filterArticles = filterArticles;
window.filterCategory = filterCategory;
window.resetFilters = resetFilters;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;

/* ============================================
   14. LEVERAGE CALCULATOR (LTV)
   ============================================ */
function calculateLeverage() {
    const assetValue = parseInputNumber(document.getElementById('assetValue')?.value) || 0;
    const loans = parseInputNumber(document.getElementById('loans')?.value) || 0;

    if (assetValue === 0) { 
        showError('שווי הנכס חייב להיות גדול מאפס'); 
        return; 
    }

    const ltv = (loans / assetValue) * 100;
    
    let status = "";
    let badgeClass = "";

    if (ltv < 45) { 
        status = "מצוין (סיכון נמוך)"; 
        badgeClass = "verdict-success"; 
    } else if (ltv < 60) { 
        status = "סביר (סטנדרט בנקאי)"; 
        badgeClass = "verdict-info"; 
    } else if (ltv < 75) { 
        status = "גבוה (גבול המימון הבנקאי)"; 
        badgeClass = "verdict-warning"; 
    } else { 
        status = "מסוכן מאוד (חריגה)"; 
        badgeClass = "verdict-danger"; 
    }

    // Update results
    const resultArea = document.getElementById('result');
    if (resultArea) {
        resultArea.style.display = 'block';
        
        const ltvEl = document.getElementById('resLTV');
        if (ltvEl) ltvEl.innerHTML = `<span class="label">אחוז מינוף</span><span class="value">${ltv.toFixed(1)}%</span>`;
        
        const statusEl = document.getElementById('resStatus');
        if (statusEl) statusEl.innerHTML = `<div class="verdict-badge ${badgeClass}">${status}</div>`;
    }
    
    resultArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================
   15. REFINANCE CALCULATOR
   ============================================ */
let loanCounter = 0;

document.addEventListener("DOMContentLoaded", function() {
    if(document.getElementById('loans-container')) {
        addLoanInput();
    }
});

function addLoanInput() {
    loanCounter++;
    const container = document.getElementById('loans-container');
    if (!container) return;
    
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
        const card = document.getElementById(`loan-${id}`);
        if (card) card.querySelectorAll('input').forEach(i => i.value = '');
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
        total += parseInputNumber(input.value);
    });
    
    const totalEl = document.getElementById('total-current-balance');
    if(totalEl) totalEl.innerText = formatCurrency(total);
    
    const newAmountInput = document.getElementById('new-amount');
    if (newAmountInput) newAmountInput.value = total;
}

function calculatePMT(principal, annualRate, years) {
    if (principal <= 0 || years <= 0) return 0;
    if (annualRate === 0) return principal / (years * 12);
    
    const months = years * 12;
    const monthlyRate = (annualRate / 100) / 12;
    
    const pmt = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return pmt;
}

function calculateRefinance() {
    let currentTotalMonthly = 0;
    let currentTotalCost = 0;
    let hasData = false;
    
    const loanCards = document.querySelectorAll('.loan-card');
    
    loanCards.forEach(card => {
        const balance = parseInputNumber(card.querySelector('.loan-balance')?.value);
        const rate = parseFloat(card.querySelector('.loan-rate')?.value) || 0;
        const years = parseFloat(card.querySelector('.loan-years')?.value) || 0;

        if (balance > 0 && years > 0) {
            hasData = true;
            const monthly = calculatePMT(balance, rate, years);
            currentTotalMonthly += monthly;
            currentTotalCost += (monthly * (years * 12));
        }
    });

    if (!hasData) {
        showError("אנא הזן נתונים תקינים בהלוואות הקיימות");
        return;
    }

    const newAmount = parseInputNumber(document.getElementById('new-amount')?.value);
    const newRate = parseFloat(document.getElementById('new-rate')?.value) || 0;
    const newYears = parseFloat(document.getElementById('new-years')?.value) || 0;
    const setupCost = parseInputNumber(document.getElementById('setup-cost')?.value);

    if (newAmount <= 0 || newYears <= 0) {
        showError("אנא מלא את פרטי הלוואת המיחזור");
        return;
    }

    const newMonthlyPayment = calculatePMT(newAmount, newRate, newYears);
    let newTotalCost = (newMonthlyPayment * (newYears * 12)) + setupCost;

    renderRefinanceResults(currentTotalMonthly, newMonthlyPayment, currentTotalCost, newTotalCost);
}

function renderRefinanceResults(currMonthly, newMonthly, currTotal, newTotal) {
    const resultsArea = document.getElementById('results-area');
    if (!resultsArea) return;
    
    resultsArea.style.display = 'block';

    const resCurrMonthly = document.getElementById('res-curr-monthly');
    const resNewMonthly = document.getElementById('res-new-monthly');
    const resCurrTotal = document.getElementById('res-curr-total');
    const resNewTotal = document.getElementById('res-new-total');
    
    if (resCurrMonthly) resCurrMonthly.innerText = formatCurrency(currMonthly);
    if (resNewMonthly) resNewMonthly.innerText = formatCurrency(newMonthly);
    if (resCurrTotal) resCurrTotal.innerText = formatCurrency(currTotal);
    if (resNewTotal) resNewTotal.innerText = formatCurrency(newTotal);

    const monthlySave = currMonthly - newMonthly;
    const totalSave = currTotal - newTotal;

    const diffMonthlyEl = document.getElementById('diff-monthly');
    const diffTotalEl = document.getElementById('diff-total');
    const verdictEl = document.getElementById('verdict-badge');

    if (diffMonthlyEl) {
        diffMonthlyEl.innerText = monthlySave > 0 ? `+${formatCurrency(monthlySave)}` : formatCurrency(monthlySave);
        diffMonthlyEl.style.color = monthlySave > 0 ? "#27ae60" : "#c0392b";
    }

    if (diffTotalEl) {
        diffTotalEl.innerText = totalSave > 0 ? `+${formatCurrency(totalSave)}` : formatCurrency(totalSave);
        diffTotalEl.style.color = totalSave > 0 ? "#27ae60" : "#c0392b";
    }

    if (verdictEl) {
        verdictEl.className = 'verdict-badge';
        
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
    }
    
    resultsArea.scrollIntoView({ behavior: 'smooth' });
}

/* ============================================
   16. INVESTMENT LEVERAGE CALCULATOR
   ============================================ */
function toggleLevLinkage() {
    const checkbox = document.getElementById('levLinkageCheck');
    const isLinked = checkbox?.checked;
    const container = document.getElementById('levCpiContainer');
    const optionCard = checkbox?.closest('.option-card');
    
    if (container) {
        if (isLinked) {
            container.classList.remove('hidden');
            container.style.display = 'block';
            container.classList.add('show');
        } else {
            container.classList.add('hidden');
            container.style.display = 'none';
            container.classList.remove('show');
        }
    }
    
    // Toggle active state on card
    if (optionCard) {
        optionCard.classList.toggle('active', isLinked);
    }
}

function calculateInvestmentLeverage() {
    const principal = parseInputNumber(document.getElementById('levLoanAmount')?.value);
    const years = parseFloat(document.getElementById('levYears')?.value) || 0;
    const loanRate = parseFloat(document.getElementById('levLoanRate')?.value) || 0;
    
    const isLinked = document.getElementById('levLinkageCheck')?.checked || false;
    const cpiRate = isLinked ? (parseFloat(document.getElementById('levCpiRate')?.value) || 0) : 0;
    
    const balloonAmount = parseInputNumber(document.getElementById('levBalloonAmount')?.value);
    const investReturn = parseFloat(document.getElementById('levInvReturn')?.value) || 0;
    const isTaxed = document.getElementById('levTaxCheck')?.checked || false;

    if (principal === 0 || years === 0) { 
        showError('אנא הזן סכום ושנים'); 
        return; 
    }

    const months = years * 12;
    const monthlyLoanRate = loanRate / 100 / 12;
    const monthlyCpiRate = Math.pow(1 + cpiRate/100, 1/12) - 1;
    
    const P_amortized = principal - balloonAmount;
    
    let basePmt = 0;
    if (monthlyLoanRate === 0) basePmt = P_amortized / months;
    else basePmt = (P_amortized * monthlyLoanRate) / (1 - Math.pow(1 + monthlyLoanRate, -months));

    let loanBalance = P_amortized;
    let balloonBalance = balloonAmount;
    let accumCpi = 1.0;
    
    let totalPaidToBank = 0;
    
    let labels = [];
    let dataScenarioA = [];
    let dataScenarioB = [];

    let scenarioB_Value = 0;
    let scenarioB_TotalDeposited = 0;
    const monthlyInvRate = Math.pow(1 + investReturn/100, 1/12) - 1;

    for (let m = 1; m <= months; m++) {
        accumCpi *= (1 + monthlyCpiRate);
        
        let interestPart = (loanBalance * monthlyLoanRate) + (balloonBalance * monthlyLoanRate);
        let principalPart = basePmt - (loanBalance * monthlyLoanRate);
        
        let totalMonthlyPay = (interestPart + principalPart) * accumCpi;
        
        loanBalance -= principalPart;
        totalPaidToBank += totalMonthlyPay;

        scenarioB_Value += totalMonthlyPay;
        scenarioB_Value *= (1 + monthlyInvRate);
        scenarioB_TotalDeposited += totalMonthlyPay;

        if (m % 12 === 0) {
            let yearsPassed = m / 12;
            let valA = principal * Math.pow(1 + investReturn/100, yearsPassed);
            
            dataScenarioA.push(valA);
            dataScenarioB.push(scenarioB_Value);
            labels.push(yearsPassed);
        }
    }

    let finalBalloonPay = balloonBalance * accumCpi;
    totalPaidToBank += finalBalloonPay;
    
    if (finalBalloonPay > 0) {
        scenarioB_Value += finalBalloonPay; 
        scenarioB_TotalDeposited += finalBalloonPay;
    }

    let scenarioA_GrossValue = principal * Math.pow(1 + investReturn/100, years);
    
    let taxA = 0;
    let profitA = scenarioA_GrossValue - principal;
    if (isTaxed && profitA > 0) taxA = profitA * 0.25;
    
    let scenarioA_NetValue = scenarioA_GrossValue - taxA;
    let scenarioA_NetProfit = scenarioA_NetValue - totalPaidToBank;

    let taxB = 0;
    let profitB = scenarioB_Value - scenarioB_TotalDeposited;
    if (isTaxed && profitB > 0) taxB = profitB * 0.25;
    
    let scenarioB_NetValue = scenarioB_Value - taxB;
    let scenarioB_NetProfit = scenarioB_NetValue - scenarioB_TotalDeposited;

    // Display results
    const resultArea = document.getElementById('result');
    if (resultArea) {
        resultArea.style.display = 'block';

        const resLevFinalValue = document.getElementById('resLevFinalValue');
        const resLevTotalCost = document.getElementById('resLevTotalCost');
        const resLevNetProfit = document.getElementById('resLevNetProfit');
        const resMonthlyFinalValue = document.getElementById('resMonthlyFinalValue');
        const resMonthlyTotalDeposited = document.getElementById('resMonthlyTotalDeposited');
        const resMonthlyNetProfit = document.getElementById('resMonthlyNetProfit');
        
        if (resLevFinalValue) resLevFinalValue.innerText = formatCurrency(scenarioA_NetValue);
        if (resLevTotalCost) resLevTotalCost.innerText = formatCurrency(totalPaidToBank);
        if (resLevNetProfit) {
            resLevNetProfit.innerText = formatCurrency(scenarioA_NetProfit);
            resLevNetProfit.style.color = scenarioA_NetProfit > 0 ? '#27ae60' : '#c0392b';
        }

        if (resMonthlyFinalValue) resMonthlyFinalValue.innerText = formatCurrency(scenarioB_NetValue);
        if (resMonthlyTotalDeposited) resMonthlyTotalDeposited.innerText = formatCurrency(scenarioB_TotalDeposited);
        if (resMonthlyNetProfit) resMonthlyNetProfit.innerText = formatCurrency(scenarioB_NetProfit);

        const badge = document.getElementById('levVerdictBadge');
        const diff = scenarioA_NetProfit - scenarioB_NetProfit;
        
        if (badge) {
            if (diff > 0) {
                badge.className = 'verdict-badge verdict-success';
                badge.innerHTML = `<i class="fas fa-check-circle"></i> המינוף משתלם! רווח עודף של ${formatCurrency(diff)}`;
            } else {
                badge.className = 'verdict-badge verdict-danger';
                badge.innerHTML = `<i class="fas fa-times-circle"></i> לא משתלם למנף. עדיף להשקיע חודשית. (הפסד אלטרנטיבי: ${formatCurrency(Math.abs(diff))})`;
            }
        }
    }

    renderGenericChart(
        'leverageChart',
        'line',
        labels,
        [
            { label: 'מינוף (שווי ברוטו)', data: dataScenarioA, borderColor: '#c9a227', backgroundColor: 'rgba(201, 162, 39, 0.1)', fill: true, tension: 0.3 },
            { label: 'הפקדה חודשית (שווי ברוטו)', data: dataScenarioB, borderColor: '#0f1923', borderDash: [5, 5], fill: false, tension: 0.3 }
        ]
    );
    
    resultArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================
   17. EXPORT ADDITIONAL FUNCTIONS
   ============================================ */
window.calculateLeverage = calculateLeverage;
window.addLoanInput = addLoanInput;
window.removeLoan = removeLoan;
window.updateTotalBalance = updateTotalBalance;
window.calculateRefinance = calculateRefinance;
window.toggleLevLinkage = toggleLevLinkage;
window.calculateInvestmentLeverage = calculateInvestmentLeverage;

/* ============================================
   18. PREMIUM UX ANIMATIONS
   ============================================ */

/**
 * Intersection Observer for scroll-triggered animations
 */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: unobserve after animation
                // animationObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements with animation classes
    document.querySelectorAll('.fade-in-up, .stagger-children').forEach(el => {
        animationObserver.observe(el);
    });
}

/**
 * Counter Animation for Statistics
 */
function animateCounter(element, target, duration = 2000) {
    // Handle string targets with suffixes like "100%" or "10+"
    const targetStr = String(target);
    
    // Extract number and suffix
    const match = targetStr.match(/^(\d+)(.*)$/);
    if (!match) {
        // Non-numeric value like "M.E" - keep as is
        element.textContent = target;
        return;
    }
    
    const targetNum = parseInt(match[1]);
    const suffix = match[2] || '';
    
    if (targetNum <= 0) {
        element.textContent = target;
        return;
    }
    
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out-expo)
        const easeOutExpo = 1 - Math.pow(2, -10 * progress);
        const current = Math.floor(targetNum * easeOutExpo);
        
        element.textContent = current + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = targetNum + suffix;
        }
    }
    
    requestAnimationFrame(updateCounter);
}

/**
 * Initialize stat counters when visible
 * NOTE: Disabled - StatCounter.init() handles this at the end of the file
 */
function initStatCounters() {
    // Disabled to prevent double animation
    // StatCounter.init() in the UX fixes section handles counter animation
    return;
}

/**
 * Smooth Parallax Effect
 */
function initParallax() {
    // Support both data-parallax elements and hero section
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    const hero = document.querySelector('.hero');
    
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        
        // Handle data-parallax elements
        parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.5;
            const offset = scrolled * speed;
            el.style.transform = `translateY(${offset}px)`;
        });
        
        // Handle hero parallax
        if (hero && scrolled < window.innerHeight) {
            const rate = scrolled * 0.3;
            hero.style.backgroundPositionY = `${rate}px`;
        }
        
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });
}

/**
 * Magnetic Button Effect
 */
function initMagneticButtons() {
    // Target both .magnetic-btn class and actual buttons
    const buttons = document.querySelectorAll('.magnetic-btn, .cta-button, .calc-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

/**
 * Smooth reveal on scroll
 */
function initSmoothReveal() {
    const sections = document.querySelectorAll('section');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
        revealObserver.observe(section);
    });
}

/**
 * Enhanced Header Scroll Effect
 */
function initHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            header.classList.add('scrolled');
            header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.15)';
        } else {
            header.classList.remove('scrolled');
            header.style.boxShadow = '';
        }
        
        // Hide on scroll down, show on scroll up
        if (currentScroll > lastScroll && currentScroll > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    }, { passive: true });
}

/**
 * Ripple Effect for Buttons
 */
function initRippleEffect() {
    document.querySelectorAll('.btn-ripple, .cta-button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.cssText = `
                position: absolute;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: rippleAnim 0.6s ease-out;
                pointer-events: none;
                left: ${x}px;
                top: ${y}px;
                width: 100px;
                height: 100px;
                margin-left: -50px;
                margin-top: -50px;
            `;
            
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
    
    // Add ripple animation if not exists
    if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes rippleAnim {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Initialize all premium animations
 */
function initPremiumUX() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runInit);
    } else {
        runInit();
    }
    
    function runInit() {
        initScrollAnimations();
        initStatCounters();
        initParallax();
        initMagneticButtons();
        initHeaderScroll();
        initRippleEffect();
        
        // Delayed reveal for smoother page load
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 100);
    }
}

// Auto-initialize
initPremiumUX();

// Export for external use
window.animateCounter = animateCounter;
window.initPremiumUX = initPremiumUX;

/* ============================================
   18. PREMIUM UX ENHANCEMENTS
   ============================================ */

// Intersection Observer for scroll animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const animateOnScroll = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-visible');
            // Don't unobserve to allow re-animation if needed
        }
    });
}, observerOptions);

// Initialize scroll animations
document.addEventListener('DOMContentLoaded', () => {
    // Animate sections on scroll
    const animateSections = document.querySelectorAll('.pain-item, .step-card, .article-card, .resource-card, .testimonial-card, .section-header');
    animateSections.forEach((el, index) => {
        el.style.transitionDelay = `${index * 0.1}s`;
        el.classList.add('scroll-animate');
        animateOnScroll.observe(el);
    });
    
    // Note: Stat counters are handled by StatCounter.init() at the end of the file
    // Do not duplicate counter animation here
    
    // Parallax effect for hero
    initParallax();
    
    // Magnetic button effect
    initMagneticButtons();
    
    // Tilt effect on cards
    initCardTilt();
    
    // Typed text effect for hero (if desired)
    // initTypedText();
});

// Note: animateCounter, initParallax, and initMagneticButtons are defined earlier in the file (around lines 1203-1310)

// Card tilt effect
function initCardTilt() {
    const cards = document.querySelectorAll('.pain-item, .step-card, .testimonial-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });
}

// Smooth scroll with easing
function smoothScrollTo(target, duration = 800) {
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition - 100;
    let startTime = null;
    
    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutCubic(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }
    
    function easeInOutCubic(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t + b;
        t -= 2;
        return c / 2 * (t * t * t + 2) + b;
    }
    
    requestAnimationFrame(animation);
}

// Enhanced form validation with visual feedback
function validateInput(input) {
    const value = input.value.trim();
    const isValid = value !== '' && !isNaN(parseFloat(value));
    
    input.classList.remove('input-valid', 'input-invalid');
    input.classList.add(isValid ? 'input-valid' : 'input-invalid');
    
    return isValid;
}

// Add ripple effect to buttons
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        pointer-events: none;
    `;
    
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// Add ripple to all buttons
document.querySelectorAll('.cta-button, .calc-btn').forEach(button => {
    button.addEventListener('click', createRipple);
});

// CSS for ripple animation (add to stylesheet)
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .scroll-animate {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .scroll-animate.animate-visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    .input-valid {
        border-color: var(--success) !important;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
    }
    
    .input-invalid {
        border-color: var(--danger) !important;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        animation: inputShake 0.5s ease;
    }
    
    @keyframes inputShake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); }
        40%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(rippleStyle);

// Loading state for calculate buttons
function setButtonLoading(button, loading) {
    if (loading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span> מחשב...';
        button.disabled = true;
        button.classList.add('btn-loading');
    } else {
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.disabled = false;
        button.classList.remove('btn-loading');
    }
}

// Add loading spinner styles
const loadingStyle = document.createElement('style');
loadingStyle.textContent = `
    .loading-spinner {
        display: inline-block;
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-left: 8px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .btn-loading {
        pointer-events: none;
        opacity: 0.8;
    }
`;
document.head.appendChild(loadingStyle);

// Export new functions
window.smoothScrollTo = smoothScrollTo;
window.validateInput = validateInput;
window.setButtonLoading = setButtonLoading;

console.log('Premium UX Enhancements loaded successfully');
/* ============================================
   ULTIMATE UX/UI JAVASCRIPT v5.0
   All Features Implementation
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // 1. DARK MODE SYSTEM
    // ============================================
    const DarkMode = {
        init() {
            this.createToggle();
            this.loadPreference();
            this.bindEvents();
        },

        createToggle() {
            const toggle = document.createElement('button');
            toggle.className = 'dark-mode-toggle';
            toggle.setAttribute('aria-label', 'החלף מצב תצוגה');
            toggle.innerHTML = `
                <span class="icon-sun">☀️</span>
                <span class="icon-moon">🌙</span>
            `;
            document.body.appendChild(toggle);
            this.toggle = toggle;
        },

        loadPreference() {
            const saved = localStorage.getItem('darkMode');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (saved === 'true' || (saved === null && prefersDark)) {
                document.body.classList.add('dark-mode');
            }
        },

        bindEvents() {
            this.toggle.addEventListener('click', () => this.toggleMode());
            
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (localStorage.getItem('darkMode') === null) {
                    document.body.classList.toggle('dark-mode', e.matches);
                }
            });
        },

        toggleMode() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            
            Toast.show({
                type: 'info',
                title: isDark ? 'מצב כהה פעיל' : 'מצב בהיר פעיל',
                message: 'ההגדרה נשמרה'
            });
        }
    };

    // ============================================
    // 2. CUSTOM CURSOR
    // ============================================
    const CustomCursor = {
        init() {
            if (window.innerWidth < 1024 || 'ontouchstart' in window) return;
            
            this.createCursor();
            this.bindEvents();
            document.body.classList.add('custom-cursor');
        },

        createCursor() {
            this.dot = document.createElement('div');
            this.dot.className = 'cursor-dot';
            
            this.ring = document.createElement('div');
            this.ring.className = 'cursor-ring';
            
            document.body.appendChild(this.dot);
            document.body.appendChild(this.ring);
        },

        bindEvents() {
            let mouseX = 0, mouseY = 0;
            let ringX = 0, ringY = 0;

            document.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                mouseY = e.clientY;
                
                this.dot.style.left = mouseX + 'px';
                this.dot.style.top = mouseY + 'px';
            });

            // Smooth ring follow
            const animate = () => {
                ringX += (mouseX - ringX) * 0.15;
                ringY += (mouseY - ringY) * 0.15;
                
                this.ring.style.left = ringX + 'px';
                this.ring.style.top = ringY + 'px';
                
                requestAnimationFrame(animate);
            };
            animate();

            // Hover states
            const interactiveElements = 'a, button, input, select, textarea, .cta-button, .calc-btn, .pain-item, .step-card, .article-card';
            
            document.querySelectorAll(interactiveElements).forEach(el => {
                el.addEventListener('mouseenter', () => {
                    this.ring.classList.add('cursor-hover');
                });
                el.addEventListener('mouseleave', () => {
                    this.ring.classList.remove('cursor-hover');
                });
            });

            // Click state
            document.addEventListener('mousedown', () => {
                this.ring.classList.add('cursor-click');
            });
            document.addEventListener('mouseup', () => {
                this.ring.classList.remove('cursor-click');
            });
        }
    };

    // ============================================
    // 3. PAGE TRANSITIONS
    // ============================================
    const PageTransition = {
        init() {
            this.createOverlay();
            this.bindLinks();
        },

        createOverlay() {
            const overlay = document.createElement('div');
            overlay.className = 'page-transition-overlay';
            overlay.innerHTML = `
                <div class="transition-logo">NK</div>
            `;
            document.body.appendChild(overlay);
            this.overlay = overlay;
        },

        bindLinks() {
            document.querySelectorAll('a[href]:not([href^="#"]):not([href^="http"]):not([href^="mailto"]):not([href^="tel"])').forEach(link => {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (href && !href.startsWith('#')) {
                        e.preventDefault();
                        this.transition(href);
                    }
                });
            });
        },

        transition(url) {
            this.overlay.classList.add('active-enter');
            
            setTimeout(() => {
                window.location.href = url;
            }, 500);
        },

        onLoad() {
            if (this.overlay) {
                this.overlay.classList.remove('active-enter');
                this.overlay.classList.add('active-exit');
                
                setTimeout(() => {
                    this.overlay.classList.remove('active-exit');
                }, 500);
            }
        }
    };

    // ============================================
    // 4. SCROLL PROGRESS
    // ============================================
    const ScrollProgress = {
        init() {
            this.createBar();
            this.bindScroll();
        },

        createBar() {
            const container = document.createElement('div');
            container.className = 'scroll-progress';
            container.innerHTML = '<div class="scroll-progress-bar"></div>';
            document.body.appendChild(container);
            this.bar = container.querySelector('.scroll-progress-bar');
        },

        bindScroll() {
            let ticking = false;
            
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        this.update();
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        },

        update() {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = window.scrollY;
            const progress = scrollHeight > 0 ? scrolled / scrollHeight : 0;
            this.bar.style.transform = `scaleX(${progress})`;
        }
    };

    // ============================================
    // 5. TOAST NOTIFICATIONS
    // ============================================
    const Toast = {
        container: null,

        init() {
            this.createContainer();
        },

        createContainer() {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
            this.container = container;
        },

        show({ type = 'info', title, message, duration = 5000 }) {
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-icon">${icons[type]}</div>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    ${message ? `<div class="toast-message">${message}</div>` : ''}
                </div>
                <button class="toast-close" aria-label="סגור">✕</button>
                <div class="toast-progress"></div>
            `;

            this.container.appendChild(toast);

            // Close button
            toast.querySelector('.toast-close').addEventListener('click', () => {
                this.dismiss(toast);
            });

            // Auto dismiss
            setTimeout(() => {
                if (toast.parentNode) {
                    this.dismiss(toast);
                }
            }, duration);

            return toast;
        },

        dismiss(toast) {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    };

    // ============================================
    // 6. CONFETTI EFFECT
    // ============================================
    const Confetti = {
        canvas: null,
        ctx: null,
        particles: [],
        animating: false,

        init() {
            this.createCanvas();
        },

        createCanvas() {
            const canvas = document.createElement('canvas');
            canvas.className = 'confetti-canvas';
            document.body.appendChild(canvas);
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
        },

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        },

        launch(options = {}) {
            const defaults = {
                particleCount: 100,
                spread: 70,
                startX: window.innerWidth / 2,
                startY: window.innerHeight / 2,
                colors: ['#c9a227', '#e6c65c', '#a68518', '#0f1923', '#ffffff']
            };
            
            const config = { ...defaults, ...options };
            
            for (let i = 0; i < config.particleCount; i++) {
                this.particles.push({
                    x: config.startX,
                    y: config.startY,
                    vx: (Math.random() - 0.5) * config.spread * 0.5,
                    vy: (Math.random() - 1) * config.spread * 0.5 - 10,
                    color: config.colors[Math.floor(Math.random() * config.colors.length)],
                    size: Math.random() * 8 + 4,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 10,
                    gravity: 0.3,
                    drag: 0.99,
                    opacity: 1
                });
            }

            if (!this.animating) {
                this.animating = true;
                this.animate();
            }
        },

        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.particles = this.particles.filter(p => {
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;
                p.opacity -= 0.01;

                if (p.opacity > 0 && p.y < this.canvas.height + 50) {
                    this.ctx.save();
                    this.ctx.translate(p.x, p.y);
                    this.ctx.rotate(p.rotation * Math.PI / 180);
                    this.ctx.globalAlpha = p.opacity;
                    this.ctx.fillStyle = p.color;
                    this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    this.ctx.restore();
                    return true;
                }
                return false;
            });

            if (this.particles.length > 0) {
                requestAnimationFrame(() => this.animate());
            } else {
                this.animating = false;
            }
        }
    };

    // ============================================
    // 7. LOADING SCREEN
    // ============================================
    const LoadingScreen = {
        init() {
            this.createScreen();
            this.hide();
        },

        createScreen() {
            const screen = document.createElement('div');
            screen.className = 'loading-screen';
            screen.innerHTML = `
                <div class="loading-logo">NK</div>
                <div class="loading-text">
                    טוען
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            document.body.appendChild(screen);
            this.screen = screen;
        },

        hide() {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.screen.classList.add('hidden');
                    PageTransition.onLoad();
                }, 500);
            });
        }
    };

    // ============================================
    // 8. REVEAL ON SCROLL
    // ============================================
    const RevealOnScroll = {
        init() {
            this.elements = document.querySelectorAll('.pain-item, .step-card, .article-card, .resource-card, .testimonial-card, .buffett-quote, .why-list li');
            this.elements.forEach(el => el.classList.add('reveal'));
            this.observe();
        },

        observe() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            this.elements.forEach(el => observer.observe(el));
        }
    };

    // ============================================
    // 9. ENHANCED FORM VALIDATION
    // ============================================
    const FormValidation = {
        init() {
            this.forms = document.querySelectorAll('.tool-container form, .form-group');
            this.bindEvents();
        },

        bindEvents() {
            document.querySelectorAll('.form-group input, .form-group select').forEach(input => {
                input.addEventListener('blur', (e) => this.validate(e.target));
                input.addEventListener('input', (e) => {
                    if (e.target.classList.contains('input-invalid')) {
                        this.validate(e.target);
                    }
                });
            });
        },

        validate(input) {
            const value = input.value.trim();
            const type = input.type;
            let isValid = true;

            if (input.required && !value) {
                isValid = false;
            } else if (type === 'number') {
                isValid = !isNaN(parseFloat(value)) && isFinite(value);
            } else if (type === 'email') {
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            }

            input.classList.remove('input-valid', 'input-invalid');
            if (value) {
                input.classList.add(isValid ? 'input-valid' : 'input-invalid');
            }

            return isValid;
        }
    };

    // ============================================
    // 10. CALCULATOR ENHANCEMENTS
    // ============================================
    const CalculatorEnhancements = {
        init() {
            this.bindCalculateButtons();
        },

        bindCalculateButtons() {
            document.querySelectorAll('.calc-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Add loading state
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<span class="loading-spinner"></span> מחשב...';
                    btn.disabled = true;

                    // Simulate calculation time for effect
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;

                        // Check if result exists
                        const resultArea = document.querySelector('.result-area:not(.hidden)');
                        if (resultArea) {
                            // Confetti removed per user request

                            Toast.show({
                                type: 'success',
                                title: 'החישוב הושלם!',
                                message: 'התוצאות מוצגות למטה'
                            });
                        }
                    }, 800);
                });
            });
        }
    };

    // ============================================
    // 11. SMOOTH SCROLL ENHANCEMENT
    // ============================================
    const SmoothScroll = {
        init() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const href = anchor.getAttribute('href');
                    if (href !== '#') {
                        e.preventDefault();
                        const target = document.querySelector(href);
                        if (target) {
                            this.scrollTo(target);
                        }
                    }
                });
            });
        },

        scrollTo(element, offset = 100) {
            const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    };

    // ============================================
    // 12. KEYBOARD NAVIGATION
    // ============================================
    const KeyboardNav = {
        init() {
            document.addEventListener('keydown', (e) => {
                // ESC to close things
                if (e.key === 'Escape') {
                    // Close any open dropdowns
                    document.querySelectorAll('.dropdown-content').forEach(dd => {
                        dd.style.display = 'none';
                    });
                }

                // Tab trap in modals
                if (e.key === 'Tab') {
                    const modal = document.querySelector('.modal.open');
                    if (modal) {
                        this.trapFocus(e, modal);
                    }
                }
            });
        },

        trapFocus(e, container) {
            const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    // ============================================
    // INITIALIZE EVERYTHING
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        // Core features
        // DarkMode.init(); // Disabled per user request
        Toast.init();
        ScrollProgress.init();
        // Confetti.init(); // Disabled per user request
        LoadingScreen.init();
        PageTransition.init();
        
        // Enhancements
        CustomCursor.init();
        RevealOnScroll.init();
        FormValidation.init();
        CalculatorEnhancements.init();
        SmoothScroll.init();
        KeyboardNav.init();

        console.log('🚀 All UX/UI enhancements loaded successfully!');
    });

    // Export for global access
    window.Toast = Toast;
    // window.Confetti = Confetti; // Disabled per user request
    // window.DarkMode = DarkMode; // Disabled per user request

})();

// Add loading spinner CSS
const spinnerCSS = document.createElement('style');
spinnerCSS.textContent = `
    .loading-spinner {
        display: inline-block;
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-left: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(spinnerCSS);
/* ============================================
   UX/UI FIXES - JavaScript v5.1
   Money Trail Effect & Counter Fix
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // 1. FIX COUNTER ANIMATION FOR M.E
    // ============================================
    
    // Override the problematic counter to skip non-numeric values
    function safeAnimateCounter(element, target, suffix = '') {
        // Skip if target is not a valid number
        if (!target || isNaN(target) || target <= 0) {
            return;
        }
        
        let current = 0;
        const duration = 2000;
        const step = target / (duration / 16);
        
        const update = () => {
            current += step;
            if (current < target) {
                element.textContent = Math.floor(current) + suffix;
                requestAnimationFrame(update);
            } else {
                element.textContent = target + suffix;
            }
        };
        
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                update();
                observer.disconnect();
            }
        }, { threshold: 0.5 });
        
        observer.observe(element);
    }

    // Note: Stat counter animation is handled by StatCounter.init() 
    // This duplicate implementation has been disabled to prevent conflicts

    // ============================================
    // 2. MONEY TRAIL & CLICK BURST EFFECT
    // ============================================
    
    const MoneyEffect = {
        canvas: null,
        ctx: null,
        particles: [],
        mouseX: 0,
        mouseY: 0,
        lastX: 0,
        lastY: 0,
        isMoving: false,
        moveTimer: null,
        
        emojis: ['💰', '🪙', '💵', '💎', '⭐', '✨', '🌟', '💫'],
        
        init() {
            this.createCanvas();
            this.bindEvents();
            this.animate();
        },
        
        createCanvas() {
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'money-trail-canvas';
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 99999;
            `;
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
        },
        
        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        },
        
        bindEvents() {
            // Track mouse movement
            document.addEventListener('mousemove', (e) => {
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
                
                // Check if mouse is moving fast enough
                const dx = this.mouseX - this.lastX;
                const dy = this.mouseY - this.lastY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 30) {
                    this.spawnTrailParticle();
                    this.lastX = this.mouseX;
                    this.lastY = this.mouseY;
                }
            });
            
            // Click burst effect
            document.addEventListener('click', (e) => {
                this.createClickBurst(e.clientX, e.clientY);
            });
            
            // Extra burst on buttons
            document.querySelectorAll('.cta-button, .calc-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.createBigBurst(e.clientX, e.clientY);
                });
            });
        },
        
        spawnTrailParticle() {
            const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
            
            this.particles.push({
                x: this.mouseX,
                y: this.mouseY,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 2 - 1,
                emoji: emoji,
                size: 14 + Math.random() * 10,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        },
        
        createClickBurst(x, y) {
            const count = 8;
            
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const speed = 3 + Math.random() * 3;
                const emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
                
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    emoji: emoji,
                    size: 18 + Math.random() * 12,
                    life: 1,
                    decay: 0.015,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 15,
                    gravity: 0.1
                });
            }
        },
        
        createBigBurst(x, y) {
            const count = 20;
            const moneyEmojis = ['💰', '🪙', '💵', '💎', '💲'];
            
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
                const speed = 4 + Math.random() * 6;
                const emoji = moneyEmojis[Math.floor(Math.random() * moneyEmojis.length)];
                
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 3,
                    emoji: emoji,
                    size: 20 + Math.random() * 16,
                    life: 1,
                    decay: 0.01,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 20,
                    gravity: 0.15
                });
            }
        },
        
        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.particles = this.particles.filter(p => {
                // Apply physics
                p.x += p.vx;
                p.y += p.vy;
                if (p.gravity) {
                    p.vy += p.gravity;
                }
                p.rotation += p.rotationSpeed;
                p.life -= p.decay;
                
                // Draw if alive
                if (p.life > 0) {
                    this.ctx.save();
                    this.ctx.translate(p.x, p.y);
                    this.ctx.rotate(p.rotation * Math.PI / 180);
                    this.ctx.globalAlpha = p.life;
                    this.ctx.font = `${p.size}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(p.emoji, 0, 0);
                    this.ctx.restore();
                    return true;
                }
                return false;
            });
            
            requestAnimationFrame(() => this.animate());
        }
    };

    // ============================================
    // 3. DROPDOWN HOVER FIX
    // ============================================
    
    const DropdownFix = {
        init() {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                let closeTimer = null;
                const content = dropdown.querySelector('.dropdown-content');
                
                if (!content) return;
                
                // Show on hover
                dropdown.addEventListener('mouseenter', () => {
                    if (closeTimer) {
                        clearTimeout(closeTimer);
                        closeTimer = null;
                    }
                    content.style.visibility = 'visible';
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                    content.style.pointerEvents = 'auto';
                });
                
                // Delay hide
                dropdown.addEventListener('mouseleave', () => {
                    closeTimer = setTimeout(() => {
                        content.style.visibility = 'hidden';
                        content.style.opacity = '0';
                        content.style.transform = 'translateY(-10px)';
                        content.style.pointerEvents = 'none';
                    }, 300); // 300ms delay before closing
                });
                
                // Keep open when hovering content
                content.addEventListener('mouseenter', () => {
                    if (closeTimer) {
                        clearTimeout(closeTimer);
                        closeTimer = null;
                    }
                });
            });
        }
    };

    // ============================================
    // 4. INITIALIZE EVERYTHING
    // ============================================
    
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize money effect
        MoneyEffect.init();
        
        // Fix dropdowns
        DropdownFix.init();
        
        // Remove old cursor if it exists
        const oldDot = document.querySelector('.cursor-dot');
        const oldRing = document.querySelector('.cursor-ring');
        if (oldDot) oldDot.remove();
        if (oldRing) oldRing.remove();
        
        // Remove custom-cursor class
        document.body.classList.remove('custom-cursor');
        
        console.log('💰 Money Trail Effect & UX Fixes loaded!');
    });

})();
/* ============================================
   V5.2 FIXES - JavaScript
   - Subtle cursor glow (not money trail)
   - Light mode default
   - No toast notifications
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // 1. SUBTLE CURSOR GLOW (Replace Money Trail)
    // ============================================
    const CursorGlow = {
        glow: null,
        
        init() {
            // Only on desktop with mouse
            if (window.innerWidth < 768 || 'ontouchstart' in window) return;
            
            // Remove any existing money trail canvas
            const moneyCanvas = document.querySelector('.money-trail-canvas');
            if (moneyCanvas) moneyCanvas.remove();
            
            // Create subtle glow element
            this.glow = document.createElement('div');
            this.glow.className = 'cursor-glow';
            document.body.appendChild(this.glow);
            
            // Follow mouse
            document.addEventListener('mousemove', (e) => {
                this.glow.style.left = e.clientX + 'px';
                this.glow.style.top = e.clientY + 'px';
            });
        }
    };

    // ============================================
    // 2. DISABLE MONEY EFFECT
    // ============================================
    // Override MoneyEffect if it exists
    window.MoneyEffect = {
        init: function() {},
        spawnTrailParticle: function() {},
        createClickBurst: function() {},
        createBigBurst: function() {}
    };

    // ============================================
    // 3. DISABLE TOAST NOTIFICATIONS
    // ============================================
    window.Toast = {
        init: function() {},
        show: function() {},
        success: function() {},
        error: function() {},
        warning: function() {},
        info: function() {},
        dismiss: function() {}
    };
    
    // Remove existing toast container
    document.addEventListener('DOMContentLoaded', () => {
        const toastContainer = document.querySelector('.toast-container');
        if (toastContainer) toastContainer.remove();
    });

    // ============================================
    // 4. LIGHT MODE DEFAULT
    // ============================================
    const LightModeDefault = {
        init() {
            // Remove dark mode class (light is default)
            document.body.classList.remove('dark-mode');
            
            // Only apply dark mode if explicitly saved
            const savedDarkMode = localStorage.getItem('darkMode');
            if (savedDarkMode === 'true') {
                document.body.classList.add('dark-mode');
            }
            
            // Update toggle button
            this.updateToggle();
        },
        
        updateToggle() {
            const toggle = document.querySelector('.dark-mode-toggle');
            if (toggle) {
                const isDark = document.body.classList.contains('dark-mode');
                toggle.innerHTML = isDark ? '☀️' : '🌙';
            }
        }
    };

    // ============================================
    // 5. FIX DARK MODE TOGGLE (No Toast)
    // ============================================
    const FixDarkModeToggle = {
        init() {
            const toggle = document.querySelector('.dark-mode-toggle');
            if (!toggle) return;
            
            // Clone to remove old listeners
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            // Add clean click handler
            newToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDark);
                newToggle.innerHTML = isDark ? '☀️' : '🌙';
                // NO toast notification
            });
        }
    };

    // ============================================
    // 6. FIX COUNTER FOR M.E
    // ============================================
    const FixCounter = {
        init() {
            // Wait a bit for other scripts to load
            setTimeout(() => {
                document.querySelectorAll('.hero-stat-value').forEach(stat => {
                    const text = stat.textContent.trim();
                    
                    // If it's M.E, make sure it stays M.E
                    if (text === 'M.E' || text.includes('M.E')) {
                        stat.textContent = 'M.E';
                        stat.setAttribute('data-no-animate', 'true');
                    }
                });
            }, 100);
        }
    };

    // ============================================
    // 7. CLEAN BUTTON EFFECTS (No Money)
    // ============================================
    const CleanButtons = {
        init() {
            document.querySelectorAll('.cta-button, .calc-btn').forEach(btn => {
                // Remove any ::before/::after content via class
                btn.classList.add('clean-button');
                
                // Simple hover lift effect
                btn.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-3px)';
                });
                
                btn.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                });
            });
        }
    };

    // ============================================
    // INITIALIZE ON DOM READY
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        // LightModeDefault.init(); // Disabled per user request - no dark mode
        // CursorGlow.init(); // Disabled per user request - no cursor shadow
        // FixDarkModeToggle.init(); // Disabled per user request - no dark mode
        FixCounter.init();
        CleanButtons.init();

        console.log('✓ V5.2 Fixes loaded - Professional mode');
    });

})();
/* ============================================
   UX/UI AUDIT FIXES - JavaScript
   Mobile menu, loading states, improvements
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // 1. HAMBURGER MENU FOR MOBILE
    // ============================================
    const MobileMenu = {
        init() {
            const header = document.querySelector('header');
            const nav = document.querySelector('nav');
            if (!header || !nav) return;
            
            // Create hamburger button if doesn't exist
            if (!document.querySelector('.hamburger')) {
                const hamburger = document.createElement('button');
                hamburger.className = 'hamburger';
                hamburger.setAttribute('aria-label', 'תפריט ניווט');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.innerHTML = '<span></span><span></span><span></span>';
                
                // Insert before nav
                nav.parentNode.insertBefore(hamburger, nav);
                
                // Create overlay
                const overlay = document.createElement('div');
                overlay.className = 'nav-overlay';
                document.body.appendChild(overlay);
                
                // Toggle menu
                hamburger.addEventListener('click', () => this.toggle(hamburger, nav, overlay));
                overlay.addEventListener('click', () => this.close(hamburger, nav, overlay));
                
                // Handle dropdown in mobile
                this.initMobileDropdowns();
            }
        },
        
        toggle(hamburger, nav, overlay) {
            const isOpen = nav.classList.contains('open');
            
            if (isOpen) {
                this.close(hamburger, nav, overlay);
            } else {
                hamburger.classList.add('active');
                hamburger.setAttribute('aria-expanded', 'true');
                nav.classList.add('open');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        },
        
        close(hamburger, nav, overlay) {
            hamburger.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            nav.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        },
        
        initMobileDropdowns() {
            document.querySelectorAll('.dropdown > .dropbtn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Only on mobile
                    if (window.innerWidth > 768) return;
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const dropdown = btn.parentElement;
                    dropdown.classList.toggle('open');
                });
            });
        }
    };

    // ============================================
    // 2. BUTTON LOADING STATES
    // ============================================
    const ButtonLoading = {
        init() {
            // Wrap existing calculate functions
            const originalCalculateCompoundInterest = window.calculateCompoundInterest;
            if (originalCalculateCompoundInterest) {
                window.calculateCompoundInterest = function() {
                    const btn = document.querySelector('.calc-btn');
                    ButtonLoading.setLoading(btn, true);
                    
                    // Simulate async (calculations are actually sync)
                    setTimeout(() => {
                        originalCalculateCompoundInterest();
                        ButtonLoading.setLoading(btn, false);
                    }, 300);
                };
            }
        },
        
        setLoading(btn, isLoading) {
            if (!btn) return;
            
            if (isLoading) {
                btn.classList.add('loading');
                btn.dataset.originalText = btn.innerHTML;
                btn.innerHTML = '<span>מחשב...</span>';
            } else {
                btn.classList.remove('loading');
                if (btn.dataset.originalText) {
                    btn.innerHTML = btn.dataset.originalText;
                }
            }
        }
    };

    // ============================================
    // 3. FORM VALIDATION VISUAL FEEDBACK
    // ============================================
    const FormValidation = {
        init() {
            document.querySelectorAll('.form-group input, .form-group select').forEach(input => {
                // Add validation on blur
                input.addEventListener('blur', () => this.validate(input));
                
                // Clear validation on focus
                input.addEventListener('focus', () => {
                    input.classList.remove('valid', 'invalid');
                });
                
                // Real-time validation for numbers
                input.addEventListener('input', () => {
                    if (input.type === 'number') {
                        this.validateNumber(input);
                    }
                });
            });
        },
        
        validate(input) {
            if (!input.value) {
                input.classList.remove('valid', 'invalid');
                return;
            }
            
            if (input.checkValidity()) {
                input.classList.remove('invalid');
                input.classList.add('valid');
            } else {
                input.classList.remove('valid');
                input.classList.add('invalid');
            }
        },
        
        validateNumber(input) {
            const value = parseFloat(input.value);
            const min = parseFloat(input.min) || -Infinity;
            const max = parseFloat(input.max) || Infinity;
            
            if (value < min || value > max) {
                input.classList.add('invalid');
            } else {
                input.classList.remove('invalid');
            }
        }
    };

    // ============================================
    // 4. SMOOTH SCROLL WITH OFFSET
    // ============================================
    const SmoothScroll = {
        init() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const href = anchor.getAttribute('href');
                    if (href === '#' || href === '#main-content') return;
                    
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        
                        const headerHeight = document.querySelector('header')?.offsetHeight || 80;
                        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                        
                        // Close mobile menu if open
                        const nav = document.querySelector('nav');
                        if (nav && nav.classList.contains('open')) {
                            document.querySelector('.hamburger')?.click();
                        }
                    }
                });
            });
        }
    };

    // ============================================
    // 5. DROPDOWN HOVER DELAY (Desktop)
    // ============================================
    const DropdownEnhance = {
        init() {
            document.querySelectorAll('.dropdown').forEach(dropdown => {
                let closeTimeout;
                
                dropdown.addEventListener('mouseenter', () => {
                    clearTimeout(closeTimeout);
                });
                
                dropdown.addEventListener('mouseleave', () => {
                    closeTimeout = setTimeout(() => {
                        // CSS handles the actual hide
                    }, 300);
                });
                
                // Keep dropdown open when moving to content
                const content = dropdown.querySelector('.dropdown-content');
                if (content) {
                    content.addEventListener('mouseenter', () => {
                        clearTimeout(closeTimeout);
                    });
                }
            });
        }
    };

    // ============================================
    // 6. RESULT AREA ANIMATIONS
    // ============================================
    const ResultAnimations = {
        init() {
            // Watch for result area becoming visible
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const target = mutation.target;
                        if (target.classList.contains('result-area') && target.style.display !== 'none') {
                            this.animateResults(target);
                        }
                    }
                });
            });
            
            document.querySelectorAll('.result-area').forEach(area => {
                observer.observe(area, { attributes: true });
            });
        },
        
        animateResults(container) {
            const items = container.querySelectorAll('.result-item, .result-highlight');
            items.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    item.style.transition = 'all 0.4s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }
    };

    // ============================================
    // 7. ACCESSIBILITY IMPROVEMENTS
    // ============================================
    const Accessibility = {
        init() {
            // Add aria-live for dynamic results
            document.querySelectorAll('.result-area').forEach(area => {
                area.setAttribute('aria-live', 'polite');
                area.setAttribute('aria-atomic', 'true');
            });
            
            // Escape key closes dropdowns
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    // Close mobile menu
                    const nav = document.querySelector('nav.open');
                    if (nav) {
                        document.querySelector('.hamburger')?.click();
                    }
                    
                    // Close dropdowns
                    document.querySelectorAll('.dropdown.open').forEach(d => {
                        d.classList.remove('open');
                    });
                }
            });
            
            // Focus trap for mobile menu
            this.initFocusTrap();
        },
        
        initFocusTrap() {
            const nav = document.querySelector('nav');
            if (!nav) return;
            
            const focusableElements = nav.querySelectorAll('a, button');
            
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab' || !nav.classList.contains('open')) return;
                
                const first = focusableElements[0];
                const last = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            });
        }
    };

    // ============================================
    // 8. SCROLL PROGRESS INDICATOR
    // ============================================
    const ScrollProgress = {
        bar: null,
        
        init() {
            // Create if doesn't exist
            if (!document.querySelector('.scroll-progress')) {
                this.bar = document.createElement('div');
                this.bar.className = 'scroll-progress';
                this.bar.setAttribute('role', 'progressbar');
                this.bar.setAttribute('aria-label', 'התקדמות בדף');
                document.body.appendChild(this.bar);
            } else {
                this.bar = document.querySelector('.scroll-progress');
            }
            
            window.addEventListener('scroll', () => this.update(), { passive: true });
            this.update();
        },
        
        update() {
            if (!this.bar) return;
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / docHeight) * 100;
            this.bar.style.width = `${Math.min(progress, 100)}%`;
            this.bar.setAttribute('aria-valuenow', Math.round(progress));
        }
    };

    // ============================================
    // INITIALIZE ALL
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        MobileMenu.init();
        ButtonLoading.init();
        FormValidation.init();
        SmoothScroll.init();
        DropdownEnhance.init();
        ResultAnimations.init();
        Accessibility.init();
        ScrollProgress.init();
        
        console.log('✓ UX/UI Audit Fixes loaded');
    });

})();
/* ============================================
   COMPLETE UX/UI IMPROVEMENTS - JavaScript
   All functionality from audit
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // 1. HAMBURGER MENU
    // ============================================
    const MobileMenu = {
        hamburger: null,
        nav: null,
        overlay: null,
        
        init() {
            this.hamburger = document.querySelector('.hamburger');
            this.nav = document.querySelector('nav');
            this.overlay = document.querySelector('.nav-overlay');
            
            if (!this.hamburger || !this.nav) return;
            
            // Toggle menu on click
            this.hamburger.addEventListener('click', () => this.toggle());
            
            // Close on overlay click
            if (this.overlay) {
                this.overlay.addEventListener('click', () => this.close());
            }
            
            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.nav.classList.contains('open')) {
                    this.close();
                }
            });
            
            // Close on link click
            this.nav.querySelectorAll('a:not(.dropbtn)').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        this.close();
                    }
                });
            });
            
            // Handle dropdown in mobile
            this.initMobileDropdowns();
        },
        
        toggle() {
            const isOpen = this.nav.classList.contains('open');
            
            if (isOpen) {
                this.close();
            } else {
                this.open();
            }
        },
        
        open() {
            this.hamburger.classList.add('active');
            this.hamburger.setAttribute('aria-expanded', 'true');
            this.nav.classList.add('open');
            if (this.overlay) this.overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        },
        
        close() {
            this.hamburger.classList.remove('active');
            this.hamburger.setAttribute('aria-expanded', 'false');
            this.nav.classList.remove('open');
            if (this.overlay) this.overlay.classList.remove('active');
            document.body.style.overflow = '';
            
            // Close all dropdowns
            document.querySelectorAll('.dropdown.open').forEach(d => {
                d.classList.remove('open');
            });
        },
        
        initMobileDropdowns() {
            document.querySelectorAll('.dropdown > .dropbtn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Only on mobile
                    if (window.innerWidth > 768) return;
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const dropdown = btn.closest('.dropdown');
                    const isOpen = dropdown.classList.contains('open');
                    
                    // Close other dropdowns
                    document.querySelectorAll('.dropdown.open').forEach(d => {
                        if (d !== dropdown) d.classList.remove('open');
                    });
                    
                    dropdown.classList.toggle('open');
                });
            });
        }
    };

    // ============================================
    // 2. SCROLL PROGRESS BAR
    // ============================================
    const ScrollProgress = {
        bar: null,
        
        init() {
            // Create progress bar
            this.bar = document.createElement('div');
            this.bar.className = 'scroll-progress';
            this.bar.setAttribute('role', 'progressbar');
            this.bar.setAttribute('aria-label', 'התקדמות בדף');
            this.bar.setAttribute('aria-valuemin', '0');
            this.bar.setAttribute('aria-valuemax', '100');
            document.body.prepend(this.bar);
            
            // Update on scroll
            window.addEventListener('scroll', () => this.update(), { passive: true });
            this.update();
        },
        
        update() {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / docHeight) * 100;
            
            this.bar.style.width = `${Math.min(progress, 100)}%`;
            this.bar.setAttribute('aria-valuenow', Math.round(progress));
        }
    };

    // ============================================
    // 3. BUTTON LOADING STATES
    // ============================================
    const ButtonLoading = {
        init() {
            // Intercept calculator button clicks
            document.querySelectorAll('.calc-btn').forEach(btn => {
                const originalOnclick = btn.getAttribute('onclick');
                
                if (originalOnclick) {
                    btn.removeAttribute('onclick');
                    btn.addEventListener('click', (e) => {
                        this.setLoading(btn, true);
                        
                        // Execute original function after short delay
                        setTimeout(() => {
                            try {
                                eval(originalOnclick);
                            } catch (err) {
                                console.error('Calculator error:', err);
                            }
                            
                            setTimeout(() => {
                                this.setLoading(btn, false);
                            }, 300);
                        }, 100);
                    });
                }
            });
        },
        
        setLoading(btn, isLoading) {
            if (!btn) return;
            
            if (isLoading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }
    };

    // ============================================
    // 4. FORM VALIDATION VISUAL
    // ============================================
    const FormValidation = {
        init() {
            document.querySelectorAll('.form-group input[type="number"]').forEach(input => {
                // Validate on blur
                input.addEventListener('blur', () => this.validate(input));
                
                // Clear on focus
                input.addEventListener('focus', () => {
                    input.classList.remove('valid', 'invalid');
                });
                
                // Real-time validation
                input.addEventListener('input', () => {
                    // Remove classes while typing
                    input.classList.remove('valid', 'invalid');
                });
            });
        },
        
        validate(input) {
            const value = input.value.trim();
            
            if (!value) {
                input.classList.remove('valid', 'invalid');
                return;
            }
            
            const numValue = parseFloat(value);
            const min = parseFloat(input.min);
            const max = parseFloat(input.max);
            
            let isValid = !isNaN(numValue);
            
            if (!isNaN(min) && numValue < min) isValid = false;
            if (!isNaN(max) && numValue > max) isValid = false;
            
            if (isValid) {
                input.classList.remove('invalid');
                input.classList.add('valid');
            } else {
                input.classList.remove('valid');
                input.classList.add('invalid');
            }
        }
    };

    // ============================================
    // 5. RESULT ANIMATIONS
    // ============================================
    const ResultAnimations = {
        init() {
            // Create MutationObserver to watch result areas
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const target = mutation.target;
                        if (target.classList.contains('result-area')) {
                            const display = window.getComputedStyle(target).display;
                            if (display !== 'none') {
                                this.animateResults(target);
                            }
                        }
                    }
                });
            });
            
            document.querySelectorAll('.result-area').forEach(area => {
                observer.observe(area, { attributes: true });
            });
        },
        
        animateResults(container) {
            // Add animation class to highlight
            const highlight = container.querySelector('.result-highlight');
            if (highlight) {
                highlight.classList.remove('animate');
                void highlight.offsetWidth; // Force reflow
                highlight.classList.add('animate');
            }
            
            // Stagger animate result items
            const items = container.querySelectorAll('.result-item');
            items.forEach((item, index) => {
                item.style.animation = 'none';
                item.offsetHeight; // Force reflow
                item.style.animation = `fadeInItem 0.4s ease-out ${index * 0.1}s forwards`;
            });
        }
    };

    // ============================================
    // 6. TESTIMONIALS CAROUSEL (Mobile)
    // ============================================
    const TestimonialsCarousel = {
        init() {
            const grid = document.querySelector('.testimonials-grid');
            if (!grid || window.innerWidth > 768) return;
            
            // Create dots container
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'carousel-dots';
            
            const cards = grid.querySelectorAll('.testimonial-card');
            cards.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
                dot.addEventListener('click', () => this.scrollToCard(grid, index));
                dotsContainer.appendChild(dot);
            });
            
            grid.parentNode.insertBefore(dotsContainer, grid.nextSibling);
            
            // Update dots on scroll
            grid.addEventListener('scroll', () => {
                const scrollLeft = grid.scrollLeft;
                const cardWidth = cards[0].offsetWidth + 16; // card + gap
                const activeIndex = Math.round(scrollLeft / cardWidth);
                
                dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === activeIndex);
                });
            }, { passive: true });
        },
        
        scrollToCard(grid, index) {
            const cards = grid.querySelectorAll('.testimonial-card');
            if (cards[index]) {
                const cardWidth = cards[0].offsetWidth + 16;
                grid.scrollTo({
                    left: index * cardWidth,
                    behavior: 'smooth'
                });
            }
        }
    };

    // ============================================
    // 7. SMOOTH SCROLL WITH OFFSET
    // ============================================
    const SmoothScroll = {
        init() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const href = anchor.getAttribute('href');
                    if (href === '#' || href === '#main-content') return;
                    
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        
                        const headerHeight = document.querySelector('header')?.offsetHeight || 80;
                        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
                        
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                });
            });
        }
    };

    // ============================================
    // 8. DARK MODE TOGGLE
    // ============================================
    const DarkModeToggle = {
        toggle: null,
        
        init() {
            // Create toggle if doesn't exist
            if (!document.querySelector('.dark-mode-toggle')) {
                this.toggle = document.createElement('button');
                this.toggle.className = 'dark-mode-toggle';
                this.toggle.setAttribute('aria-label', 'החלף מצב תצוגה');
                document.body.appendChild(this.toggle);
            } else {
                this.toggle = document.querySelector('.dark-mode-toggle');
            }
            
            // Set initial state
            const isDark = localStorage.getItem('darkMode') === 'true';
            if (isDark) {
                document.body.classList.add('dark-mode');
            }
            this.updateIcon();
            
            // Click handler
            this.toggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDarkNow = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDarkNow);
                this.updateIcon();
            });
        },
        
        updateIcon() {
            const isDark = document.body.classList.contains('dark-mode');
            this.toggle.innerHTML = isDark ? '☀️' : '🌙';
        }
    };

    // ============================================
    // 9. CURSOR GLOW EFFECT
    // ============================================
    const CursorGlow = {
        glow: null,
        
        init() {
            // Only on desktop with mouse
            if (window.innerWidth < 768 || 'ontouchstart' in window) return;
            
            this.glow = document.createElement('div');
            this.glow.className = 'cursor-glow';
            this.glow.style.cssText = `
                position: fixed;
                width: 300px;
                height: 300px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(201, 162, 39, 0.06) 0%, transparent 70%);
                pointer-events: none;
                z-index: 1;
                transform: translate(-50%, -50%);
                transition: opacity 0.3s ease;
                opacity: 0;
            `;
            document.body.appendChild(this.glow);
            
            document.addEventListener('mousemove', (e) => {
                this.glow.style.left = e.clientX + 'px';
                this.glow.style.top = e.clientY + 'px';
                this.glow.style.opacity = '1';
            });
            
            document.addEventListener('mouseleave', () => {
                this.glow.style.opacity = '0';
            });
        }
    };

    // ============================================
    // 10. STAT COUNTER ANIMATION
    // ============================================
    const StatCounter = {
        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.animateStat(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            
            document.querySelectorAll('.hero-stat-value').forEach(stat => {
                observer.observe(stat);
            });
        },
        
        animateStat(element) {
            const text = element.textContent.trim();
            
            // Skip non-numeric values like "M.E"
            if (!/^\d+/.test(text)) return;
            
            const match = text.match(/^(\d+)(.*)$/);
            if (!match) return;
            
            const targetNum = parseInt(match[1]);
            const suffix = match[2] || '';
            
            let current = 0;
            const duration = 2000;
            const increment = targetNum / (duration / 16);
            
            const animate = () => {
                current += increment;
                if (current < targetNum) {
                    element.textContent = Math.floor(current) + suffix;
                    requestAnimationFrame(animate);
                } else {
                    element.textContent = targetNum + suffix;
                }
            };
            
            animate();
        }
    };

    // ============================================
    // 11. HEADER SCROLL BEHAVIOR
    // ============================================
    const HeaderScroll = {
        header: null,
        lastScroll: 0,
        
        init() {
            this.header = document.querySelector('header');
            if (!this.header) return;
            
            window.addEventListener('scroll', () => this.onScroll(), { passive: true });
        },
        
        onScroll() {
            const currentScroll = window.scrollY;
            
            // Add shadow after scroll
            if (currentScroll > 50) {
                this.header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            } else {
                this.header.style.boxShadow = '';
            }
            
            this.lastScroll = currentScroll;
        }
    };

    // ============================================
    // 12. SCROLL REVEAL ANIMATIONS
    // ============================================
    const ScrollReveal = {
        init() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });
            
            document.querySelectorAll('.fade-in-up, .pain-item, .step-card, .testimonial-card, .article-card').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(el);
            });
        }
    };

    // Add revealed class styles
    const style = document.createElement('style');
    style.textContent = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
        .stagger-children > *:nth-child(1) { transition-delay: 0.1s !important; }
        .stagger-children > *:nth-child(2) { transition-delay: 0.2s !important; }
        .stagger-children > *:nth-child(3) { transition-delay: 0.3s !important; }
        .stagger-children > *:nth-child(4) { transition-delay: 0.4s !important; }
    `;
    document.head.appendChild(style);

    // ============================================
    // INITIALIZE ALL ON DOM READY
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        MobileMenu.init();
        ScrollProgress.init();
        ButtonLoading.init();
        FormValidation.init();
        ResultAnimations.init();
        TestimonialsCarousel.init();
        SmoothScroll.init();
        // DarkModeToggle.init(); // Disabled per user request - no dark mode
        // CursorGlow.init(); // Disabled per user request - no cursor shadow
        StatCounter.init();
        HeaderScroll.init();
        ScrollReveal.init();
        
        console.log('✓ All UX/UI improvements loaded');
    });

    // Re-init testimonials carousel on resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth <= 768) {
                TestimonialsCarousel.init();
            }
        }, 250);
    });

})();
/* ============================================
   FINAL FIXES - JavaScript
   Clean Dark Mode Implementation
   ============================================ */

(function() {
    'use strict';
    
    // Remove any existing dark mode toggles to prevent duplicates
    document.querySelectorAll('.dark-mode-toggle').forEach(el => el.remove());
    
    // ============================================
    // SINGLE CLEAN DARK MODE IMPLEMENTATION
    // ============================================
    const DarkModeManager = {
        toggle: null,
        
        init() {
            // Create toggle button
            this.toggle = document.createElement('button');
            this.toggle.className = 'dark-mode-toggle';
            this.toggle.setAttribute('aria-label', 'החלף מצב תצוגה');
            this.toggle.setAttribute('type', 'button');
            document.body.appendChild(this.toggle);
            
            // Check saved preference
            const savedMode = localStorage.getItem('darkMode');
            
            if (savedMode === 'true') {
                document.body.classList.add('dark-mode');
            } else if (savedMode === null) {
                // Check system preference only if no saved preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    document.body.classList.add('dark-mode');
                }
            }
            
            // Update icon
            this.updateIcon();
            
            // Click handler
            this.toggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', isDark.toString());
                this.updateIcon();
            });
            
            // Listen for system preference changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't set a preference
                if (localStorage.getItem('darkMode') === null) {
                    if (e.matches) {
                        document.body.classList.add('dark-mode');
                    } else {
                        document.body.classList.remove('dark-mode');
                    }
                    this.updateIcon();
                }
            });
        },
        
        updateIcon() {
            const isDark = document.body.classList.contains('dark-mode');
            this.toggle.textContent = isDark ? '☀️' : '🌙';
            this.toggle.setAttribute('aria-pressed', isDark.toString());
        }
    };
    
    // ============================================
    // DISABLE CONFLICTING IMPLEMENTATIONS
    // ============================================
    
    // Override any existing DarkMode objects
    window.DarkMode = { init: function() {} };
    window.DarkModeToggle = { init: function() {} };
    window.FixDarkModeToggle = { init: function() {} };
    window.LightModeDefault = { init: function() {} };
    
    // ============================================
    // INITIALIZE ON DOM READY
    // ============================================
    // Disabled per user request - no dark mode
    // if (document.readyState === 'loading') {
    //     document.addEventListener('DOMContentLoaded', () => {
    //         DarkModeManager.init();
    //     });
    // } else {
    //     DarkModeManager.init();
    // }

    console.log('✓ Dark Mode Manager disabled per user request');
    
})();
