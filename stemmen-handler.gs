/**
 * Hogentcup Stemmen Handler - Web App
 * 
 * Deploy this as a Web App to receive votes from the frontend:
 * 1. Open https://script.google.com
 * 2. Create new project, paste this code
 * 3. Save (Ctrl+S)
 * 4. Click "Deploy" → "New deployment"
 * 5. Click gear icon → "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone"
 * 8. Click "Deploy"
 * 9. Copy the Web App URL and paste it in app.js
 * 
 * Required sheets (created by spreadsheet-initializer.gs):
 * - "Stemmen" - Main voting data
 * - "Algemene Themas", "Ronde Themas", "Tafelrondes", "Schiftingsvragen" - Categories
 * - "Gebruikers" - User completion tracking
 * - "Samenvatting" - Statistics
 */

const SPREADSHEET_NAME = 'Hogentcup Stemmen 2026';

// Category mapping (must match app.js)
const CATEGORY_NAMES = {
    'algemeneThemas': 'Algemene Themas',
    'rondeThemas': 'Ronde Themas',
    'tafelrondes': 'Tafelrondes',
    'schiftingsvragen': 'Schiftingsvragen'
};

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
    return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        message: 'Hogentcup Stemmen Handler is running'
    })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests from the voting frontend
 */
function doPost(e) {
    try {
        // Parse the request data
        const data = JSON.parse(e.postData.contents);
        
        // Validate required fields
        if (!data.user || !data.category || !data.votes || !Array.isArray(data.votes)) {
            return createErrorResponse('Missing required fields: user, category, votes');
        }
        
        // Get or create the spreadsheet
        const spreadsheet = getOrCreateSpreadsheet();
        
        // Record the votes
        const result = recordVotes(spreadsheet, data);
        
        // Update user completion status
        updateUserStatus(spreadsheet, data.user, data.category);
        
        // Return success response
        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: 'Stemmen succesvol opgeslagen',
            votesRecorded: result.count
        })).setMimeType(ContentService.MimeType.JSON);
        
    } catch (error) {
        console.error('Error in doPost:', error);
        return createErrorResponse('Server error: ' + error.message);
    }
}

/**
 * Create error response
 */
function createErrorResponse(message) {
    return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: message
    })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get existing spreadsheet or create new one
 */
function getOrCreateSpreadsheet() {
    const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
    
    if (files.hasNext()) {
        const file = files.next();
        return SpreadsheetApp.openById(file.getId());
    }
    
    // If not found, create it
    console.warn('Spreadsheet not found, creating new one');
    return SpreadsheetApp.create(SPREADSHEET_NAME);
}

/**
 * Record votes to the "Stemmen" sheet
 */
function recordVotes(spreadsheet, data) {
    const sheet = spreadsheet.getSheetByName('Stemmen');
    if (!sheet) {
        throw new Error('Stemmen sheet not found. Run the initializer first!');
    }
    
    const timestamp = new Date();
    const sessionId = generateSessionId();
    const categoryName = CATEGORY_NAMES[data.category] || data.category;
    const user = data.user;
    const votes = data.votes;
    
    // Add each vote with its rank
    votes.forEach((vote, index) => {
        const row = [
            timestamp,           // Tijdstempel
            user.id,             // Gebruiker ID
            user.name,           // Gebruiker Naam
            categoryName,        // Categorie
            vote,                // Optie Gekozen
            index + 1,           // Rangorde (1-based)
            sessionId            // Sessie ID
        ];
        sheet.appendRow(row);
    });
    
    // Sort the sheet by timestamp (descending) to keep newest votes at top
    const lastRow = sheet.getLastRow();
    if (lastRow > 2) {
        const range = sheet.getRange(2, 1, lastRow - 1, 7);
        range.sort({ column: 1, ascending: false });
    }
    
    console.log(`Recorded ${votes.length} votes for user ${user.name} in category ${categoryName}`);
    
    return { count: votes.length, sessionId: sessionId };
}

/**
 * Update user completion status in the "Gebruikers" sheet
 */
function updateUserStatus(spreadsheet, user, category) {
    const sheet = spreadsheet.getSheetByName('Gebruikers');
    if (!sheet) {
        console.warn('Gebruikers sheet not found');
        return;
    }
    
    // Find the user row
    const data = sheet.getDataRange().getValues();
    const categoryIndex = getCategoryColumnIndex(category);
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] == user.id) {
            // Mark this category as complete ("✓")
            sheet.getRange(i + 1, categoryIndex).setValue('✓');
            
            // Check if all categories are complete
            updateCompletenessStatus(sheet, i + 1);
            break;
        }
    }
}

/**
 * Get column index for a category in the Gebruikers sheet
 */
function getCategoryColumnIndex(category) {
    const mapping = {
        'algemeneThemas': 3,
        'rondeThemas': 4,
        'tafelrondes': 5,
        'schiftingsvragen': 6
    };
    return mapping[category] || 3;
}

/**
 * Update the "Compleet" column if all categories have votes
 */
function updateCompletenessStatus(sheet, row) {
    const range = sheet.getRange(row, 3, 1, 4); // Columns C-F (categories)
    const values = range.getValues()[0];
    
    // Check if all categories have a checkmark
    const allComplete = values.every(val => val === '✓');
    
    if (allComplete) {
        sheet.getRange(row, 7).setValue('✓').setFontColor('#34a853');
    }
}

/**
 * Generate a unique session ID
 */
function generateSessionId() {
    return Utilities.getUuid().substring(0, 8);
}

/**
 * Get statistics (for admin purposes)
 */
function getStatistics() {
    const spreadsheet = getOrCreateSpreadsheet();
    const stemmenSheet = spreadsheet.getSheetByName('Stemmen');
    
    if (!stemmenSheet) {
        return { error: 'Stemmen sheet not found' };
    }
    
    const lastRow = stemmenSheet.getLastRow();
    if (lastRow <= 1) {
        return { totalVotes: 0, uniqueUsers: 0 };
    }
    
    const data = stemmenSheet.getDataRange().getValues();
    
    // Count unique users
    const uniqueUsers = new Set();
    const categoryCounts = {};
    
    for (let i = 1; i < data.length; i++) {
        const userId = data[i][1];
        const category = data[i][3];
        
        uniqueUsers.add(userId);
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
    
    return {
        totalVotes: lastRow - 1,
        uniqueUsers: uniqueUsers.size,
        votesPerCategory: categoryCounts
    };
}

/**
 * Clear all votes (admin function)
 */
function clearAllVotes() {
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getSheetByName('Stemmen');
    
    if (sheet && sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
        return { success: true, message: 'All votes cleared' };
    }
    return { success: false, message: 'No votes to clear' };
}

/**
 * Test function (run this to verify the script works)
 */
function testHandler() {
    const mockRequest = {
        postData: {
            contents: JSON.stringify({
                user: { id: 1, name: 'Test User' },
                category: 'algemeneThemas',
                votes: ['De Romeinen', 'Wild West', 'Galabal'],
                timestamp: new Date().toISOString()
            })
        }
    };
    
    const result = doPost(mockRequest);
    console.log('Test result:', result.getContent());
}
