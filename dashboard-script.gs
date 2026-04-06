/**
 * Hogentcup Admin Dashboard Script
 * 
 * Deploy this as a Web App:
 * 1. Open https://script.google.com
 * 2. Create new project, paste this code
 * 3. Save (Ctrl+S)
 * 4. Click "Deploy" → "New deployment"
 * 5. Select type: "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone" (or restrict to your domain)
 * 8. Click "Deploy"
 * 9. Copy the Web App URL and update dashboard.html ADMIN_SCRIPT_URL
 */

const SPREADSHEET_NAME = 'Hogentcup Stemmen 2026';

/**
 * Handle GET requests - serve dashboard or return JSON data
 */
function doGet(e) {
    const action = e.parameter.action || 'dashboard';
    const callback = e.parameter.callback;
    
    if (action === 'getDashboardData') {
        return getDashboardData(callback);
    }
    
    // Serve the HTML dashboard
    return HtmlService.createHtmlOutputFromFile('dashboard')
        .setTitle('Hogentcup Admin Dashboard')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Get all dashboard data as JSON
 */
function getDashboardData(callback) {
    try {
        const spreadsheet = getSpreadsheet();
        
        const data = {
            success: true,
            statistics: getStatistics(spreadsheet),
            algemeneThemas: getCategoryResults(spreadsheet, 'Algemene Themas'),
            rondeThemas: getCategoryResults(spreadsheet, 'Ronde Themas'),
            tafelrondes: getCategoryResults(spreadsheet, 'Tafelrondes'),
            schiftingsvragen: getCategoryResults(spreadsheet, 'Schiftingsvragen'),
            users: getUserParticipation(spreadsheet)
        };
        
        return createJsonpResponse(data, callback);
            
    } catch (error) {
        return createJsonpResponse({
            success: false,
            error: error.message
        }, callback);
    }
}

/**
 * Create JSONP response (bypasses CORS)
 */
function createJsonpResponse(data, callback) {
    const jsonString = JSON.stringify(data);
    
    if (callback) {
        // JSONP response
        const output = callback + '(' + jsonString + ');';
        return ContentService.createTextOutput(output)
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
        // Regular JSON
        return ContentService.createTextOutput(jsonString)
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Get the spreadsheet
 */
function getSpreadsheet() {
    const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) {
        return SpreadsheetApp.openById(files.next().getId());
    }
    throw new Error('Spreadsheet not found: ' + SPREADSHEET_NAME);
}

/**
 * Get overall statistics
 */
function getStatistics(spreadsheet) {
    const stemmenSheet = spreadsheet.getSheetByName('Stemmen');
    const usersSheet = spreadsheet.getSheetByName('Gebruikers');
    
    let stats = {
        totalVotes: 0,
        uniqueVoters: 0,
        completedVoters: 0
    };
    
    if (stemmenSheet && stemmenSheet.getLastRow() > 1) {
        const data = stemmenSheet.getDataRange().getValues();
        const uniqueUsers = new Set();
        
        // Skip header row
        for (let i = 1; i < data.length; i++) {
            if (data[i][1]) uniqueUsers.add(data[i][1]); // User ID column
        }
        
        stats.totalVotes = data.length - 1;
        stats.uniqueVoters = uniqueUsers.size;
    }
    
    // Count completed users from Gebruikers sheet
    if (usersSheet && usersSheet.getLastRow() > 1) {
        const userData = usersSheet.getDataRange().getValues();
        let completed = 0;
        
        for (let i = 1; i < userData.length; i++) {
            if (userData[i][6] === '✓') completed++; // Compleet column
        }
        
        stats.completedVoters = completed;
    }
    
    return stats;
}

/**
 * Get results for a specific category
 */
function getCategoryResults(spreadsheet, categoryName) {
    const categorySheet = spreadsheet.getSheetByName(categoryName);
    if (!categorySheet || categorySheet.getLastRow() <= 1) {
        return [];
    }
    
    const data = categorySheet.getDataRange().getValues();
    const results = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
        const id = data[i][0];
        const name = data[i][1];
        const votes = parseInt(data[i][2]) || 0;
        
        if (name) {
            results.push({ id, name, votes });
        }
    }
    
    // Sort by votes descending
    return results.sort((a, b) => b.votes - a.votes);
}

/**
 * Get user participation status
 */
function getUserParticipation(spreadsheet) {
    const usersSheet = spreadsheet.getSheetByName('Gebruikers');
    if (!usersSheet || usersSheet.getLastRow() <= 1) {
        return [];
    }
    
    const data = usersSheet.getDataRange().getValues();
    const users = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
        const user = {
            id: data[i][0],
            name: data[i][1],
            algemene: data[i][2] === '✓',
            ronde: data[i][3] === '✓',
            tafel: data[i][4] === '✓',
            schifting: data[i][5] === '✓',
            compleet: data[i][6] === '✓'
        };
        
        users.push(user);
    }
    
    // Sort: incomplete first, then by name
    return users.sort((a, b) => {
        if (a.compleet !== b.compleet) return a.compleet ? 1 : -1;
        return a.name.localeCompare(b.name);
    });
}

/**
 * Manually trigger recalculation of all results
 */
function recalculateResults() {
    const spreadsheet = getSpreadsheet();
    const stemmenSheet = spreadsheet.getSheetByName('Stemmen');
    
    if (!stemmenSheet) {
        return { error: 'Stemmen sheet not found' };
    }
    
    // Force recalculation by touching all formula cells
    const categories = ['Algemene Themas', 'Ronde Themas', 'Tafelrondes', 'Schiftingsvragen'];
    
    categories.forEach(catName => {
        const sheet = spreadsheet.getSheetByName(catName);
        if (sheet) {
            const lastRow = sheet.getLastRow();
            if (lastRow > 1) {
                // Refresh formulas in vote count column
                const range = sheet.getRange(2, 3, lastRow - 1, 1);
                const formulas = range.getFormulas();
                range.setFormulas(formulas);
            }
        }
    });
    
    return { success: true, message: 'Results recalculated' };
}

/**
 * Get raw vote data for export/analysis
 */
function getRawVotes() {
    const spreadsheet = getSpreadsheet();
    const stemmenSheet = spreadsheet.getSheetByName('Stemmen');
    
    if (!stemmenSheet || stemmenSheet.getLastRow() <= 1) {
        return [];
    }
    
    const data = stemmenSheet.getDataRange().getValues();
    const votes = [];
    
    for (let i = 1; i < data.length; i++) {
        votes.push({
            timestamp: data[i][0],
            userId: data[i][1],
            userName: data[i][2],
            category: data[i][3],
            option: data[i][4],
            rank: data[i][5],
            sessionId: data[i][6]
        });
    }
    
    return votes;
}

/**
 * Test function
 */
function testDashboard() {
    const spreadsheet = getSpreadsheet();
    console.log('Statistics:', getStatistics(spreadsheet));
    console.log('Algemene Themas:', getCategoryResults(spreadsheet, 'Algemene Themas'));
    console.log('Users:', getUserParticipation(spreadsheet));
}
