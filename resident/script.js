// Set default date for transferDate input to today's date (or a reasonable default)
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    document.getElementById('transferDate').value = `${year}-${month}-${day}`;
    document.getElementById('startCalcYear').value = year;
});

document.getElementById('calculateBtn').addEventListener('click', calculateVacation);

function calculateVacation() {
    const pgyYears = parseInt(document.getElementById('pgyYears').value);
    const militaryMonths = parseInt(document.getElementById('militaryMonths').value);
    const transferDateStr = document.getElementById('transferDate').value;
    const startCalcYear = parseInt(document.getElementById('startCalcYear').value);

    const resultsDiv = document.getElementById('results');
    const resultDetailsDiv = document.getElementById('resultDetails');
    const errorMessageDiv = document.getElementById('errorMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Reset previous results and errors
    resultDetailsDiv.innerHTML = '';
    errorMessageDiv.textContent = '';
    errorMessageDiv.classList.add('hidden');
    resultsDiv.classList.add('hidden');
    loadingSpinner.style.display = 'inline-block'; // Show spinner
    document.getElementById('calculateBtn').disabled = true; // Disable button

    // Basic input validation
    if (isNaN(pgyYears) || pgyYears < 0 || isNaN(militaryMonths) || militaryMonths < 0 || !transferDateStr || isNaN(startCalcYear)) {
        errorMessageDiv.textContent = '請檢查所有輸入欄位，確保為有效數字或日期。';
        errorMessageDiv.classList.remove('hidden');
        loadingSpinner.style.display = 'none'; // Hide spinner
        document.getElementById('calculateBtn').disabled = false; // Enable button
        return;
    }

    const transferDate = new Date(transferDateStr);
    const transferYear = transferDate.getFullYear();
    const transferMonth = transferDate.getMonth() + 1; // getMonth() is 0-indexed

    let outputHtml = `
                <p class="mb-4"><strong>試算基準：</strong></p>
                <ul class="list-disc ml-6 mb-4">
                    <li><strong>PGY年資：</strong> ${pgyYears} 年</li>
                    <li><strong>兵役年資：</strong> ${militaryMonths} 月</li>
                    <li><strong>轉任日期：</strong> ${transferYear}年${transferMonth}月${transferDate.getDate()}日</li>
                </ul>
                <h3 class="text-xl font-semibold mb-3 text-blue-700">各年度休假天數詳情：</h3>
            `;

    // Function to get vacation days based on total seniority
    function getVacationDaysBySeniority(totalYears, totalMonths) {
        // Combine years and months for comparison
        const totalSeniorityInMonths = totalYears * 12 + totalMonths;

        if (totalSeniorityInMonths >= 14 * 12) { // 14年 (15th year onwards)
            return 30;
        } else if (totalSeniorityInMonths >= 9 * 12) { // 9年 (10th year onwards)
            return 28;
        } else if (totalSeniorityInMonths >= 6 * 12) { // 6年 (7th year onwards)
            return 21;
        } else if (totalSeniorityInMonths >= 3 * 12) { // 3年 (4th year onwards)
            return 14;
        } else if (totalSeniorityInMonths >= 1 * 12) { // 1年 (2nd year onwards)
            return 7;
        } else {
            return 0; // Less than 1 year
        }
    }

    // Calculate vacation for the *next year* after transfer
    const monthsInTransferYear = 12 - transferMonth + 1; // Example: Aug (8) -> 12 - 8 + 1 = 5 months
    const nextYear = transferYear + 1;
    let nextYearVacationDays = Math.ceil(7 * monthsInTransferYear / 12);
    if (nextYearVacationDays < 1 && monthsInTransferYear > 0) { // Ensure at least 1 day if any months were served
        nextYearVacationDays = 1;
    }
    if (monthsInTransferYear === 0) { // If transferred in Jan, no partial calculation needed for next year.
        // This case means the person started in Jan of transfer year, so they'd get 7 days for the *following* year if it's their 2nd year.
        // The rules "初聘僱人員於二月以後到職者..." implies this calculation is only for partial years.
        // If transfer is Jan 1, it's a full year, so next year is automatically seniority-based.
        // Let's re-evaluate: if Jan 1, transferYear is a full year of service for next year calculation.
        // The example implies the "7 * X / 12" formula is for *any* partial year, where X is months served.
        // If transferDate is 1/1, monthsInTransferYear = 12. 7 * 12 / 12 = 7 days. This works.
    }


    // Display results for the next year after transfer
    outputHtml += `
                <div class="result-item">
                    <p class="text-lg"><strong>${nextYear}年 (轉任次年)：</strong></p>
                    <p class="text-xl font-bold text-green-700">休假天數：${nextYearVacationDays} 日</p>
                    <p class="explanation">計算說明：轉任當年 (${transferYear}年) 在職 ${monthsInTransferYear} 個月，依「7 × ${monthsInTransferYear} / 12」公式計算，無條件進位。</p>
                </div>
            `;

    // Loop for subsequent years
    let currentSeniorityYears = pgyYears;
    let currentSeniorityMonths = militaryMonths;

    // Add the partial year of transfer employment to seniority
    currentSeniorityMonths += monthsInTransferYear;

    // Loop from the year after the "next year" calculation
    for (let year = nextYear + 1; year <= startCalcYear + 20; year++) { // Calculate up to 20 years from startCalcYear
        // For each full year passed after transfer year, add 12 months to seniority
        // This accounts for full calendar years of service *before* the year whose leave is being calculated.
        // The seniority for Year N's vacation is based on service *up to the end of Year N-1*.

        // The seniority at the end of the previous year (year - 1)
        let actualYearsPassedSinceTransfer = year - (transferYear + 1); // e.g., for 115 from 114, this is 1
        let tempSeniorityYears = pgyYears + Math.floor((militaryMonths + monthsInTransferYear) / 12) + actualYearsPassedSinceTransfer;
        let tempSeniorityMonths = (militaryMonths + monthsInTransferYear) % 12;

        // Adjust for actual full years of service for the rule
        let totalServiceYearsForRules = tempSeniorityYears;
        // If months exist, count it as a partial year but only if totalSeniorityMonths is >= 12, then it moves to next year.
        if (tempSeniorityMonths > 0) {
            // This logic is tricky. The examples "服務滿3年" imply whole years.
            // "3年5個月工作年資；服務滿3年，給假14日" means 3 years and 5 months *counts* as "滿3年".
            // So, we just need to calculate the full years component.
        }

        const totalSeniorityAtEndOfPreviousYearMonths = pgyYears * 12 + militaryMonths + monthsInTransferYear + ((year - 1) - (transferYear + 1) + 1) * 12; // total months from PGY start to end of (current_calc_year - 1)
        // This part (year - 1) - (transferYear + 1) + 1 is the number of full calendar years passed AFTER the 'nextYear' (transferYear + 1)
        // For example, if transferYear=2024, nextYear=2025.
        // For 2026: (2026-1) - (2024+1) + 1 = 2025 - 2025 + 1 = 1 full year passed since end of 2025.
        // This seems to be the correct accumulation of full years.

        const totalYearsSeniority = Math.floor(totalSeniorityAtEndOfPreviousYearMonths / 12);
        const remainingMonthsSeniority = totalSeniorityAtEndOfPreviousYearMonths % 12;

        const vacationDays = getVacationDaysBySeniority(totalYearsSeniority, remainingMonthsSeniority);

        outputHtml += `
                    <div class="result-item">
                        <p class="text-lg"><strong>${year}年：</strong></p>
                        <p class="text-xl font-bold text-green-700">休假天數：${vacationDays} 日</p>
                        <p class="explanation">計算說明：截至前一年度底（${year - 1}年底），總服務年資累計約 ${totalYearsSeniority} 年 ${remainingMonthsSeniority} 個月，符合服務滿 ${getSeniorityThreshold(totalYearsSeniority, remainingMonthsSeniority)} 年給假 ${vacationDays} 日的規定。</p>
                    </div>
                `;

        if (vacationDays === 30) {
            outputHtml += `
                        <div class="result-item text-center text-gray-600 italic">
                            <p>已達最高休假天數上限 (30日)。</p>
                        </div>
                    `;
            break; // Stop calculating once max vacation is reached
        }
    }

    resultDetailsDiv.innerHTML = outputHtml;
    resultsDiv.classList.remove('hidden');

    loadingSpinner.style.display = 'none'; // Hide spinner
    document.getElementById('calculateBtn').disabled = false; // Enable button
}

// Helper function to determine which rule threshold was met for explanation
function getSeniorityThreshold(totalYears, totalMonths) {
    const totalSeniorityInMonths = totalYears * 12 + totalMonths;
    if (totalSeniorityInMonths >= 14 * 12) return 14;
    if (totalSeniorityInMonths >= 9 * 12) return 9;
    if (totalSeniorityInMonths >= 6 * 12) return 6;
    if (totalSeniorityInMonths >= 3 * 12) return 3;
    if (totalSeniorityInMonths >= 1 * 12) return 1;
    return 0;
}
