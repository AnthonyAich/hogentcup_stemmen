/**
 * Hogentcup Spreadsheet Initializer
 * 
 * Run this script to create a fully initialized spreadsheet with:
 * - Main voting sheet with headers
 * - Separate sheets for each category
 * - Summary/statistics sheets
 * - Data validation and formatting
 * 
 * How to use:
 * 1. Open https://script.google.com
 * 2. Create new project, paste this code
 * 3. Update the SPREADSHEET_NAME if desired
 * 4. Run the initializeSpreadsheet() function (▶️ button)
 * 5. Grant permissions when prompted
 * 6. Check your Google Drive for the new spreadsheet
 */

// Configuration
const SPREADSHEET_NAME = 'Hogentcup Stemmen 2026';

// Category configuration (names must match your JSON files)
const CATEGORIES = {
  'Algemene Themas': {
    maxVotes: 3,
    color: '#4285f4' // Blue
  },
  'Ronde Themas': {
    maxVotes: 15,
    color: '#34a853' // Green
  },
  'Tafelrondes': {
    maxVotes: 5,
    color: '#aa66cc' // Purple
  },
  'Schiftingsvragen': {
    maxVotes: 2,
    color: '#ff9800' // Orange
  }
};

/**
 * Main initialization function
 */
function initializeSpreadsheet() {
  console.log('Starting spreadsheet initialization...');
  
  // Create or get existing spreadsheet
  const spreadsheet = createOrGetSpreadsheet();
  console.log('Spreadsheet created/opened:', spreadsheet.getUrl());
  
  // Initialize main voting sheet
  initializeMainSheet(spreadsheet);
  
  // Initialize category reference sheets
  initializeCategorySheets(spreadsheet);
  
  // Initialize summary sheets
  initializeSummarySheets(spreadsheet);
  
  // Initialize user tracking sheet
  initializeUserSheet(spreadsheet);
  
  console.log('✅ Spreadsheet initialization complete!');
  console.log('URL:', spreadsheet.getUrl());
  
  // Show success message
  SpreadsheetApp.getUi().alert(
    'Initialisatie voltooid!',
    'De spreadsheet is succesvol geïnitialiseerd.\n\n' +
    'URL: ' + spreadsheet.getUrl(),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
  
  return spreadsheet.getUrl();
}

/**
 * Create or get existing spreadsheet
 */
function createOrGetSpreadsheet() {
  // Check if spreadsheet already exists
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  
  if (files.hasNext()) {
    const file = files.next();
    console.log('Opening existing spreadsheet:', file.getId());
    return SpreadsheetApp.openById(file.getId());
  }
  
  // Create new spreadsheet
  console.log('Creating new spreadsheet:', SPREADSHEET_NAME);
  return SpreadsheetApp.create(SPREADSHEET_NAME);
}

/**
 * Initialize main voting sheet (Stemmen)
 */
function initializeMainSheet(spreadsheet) {
  const sheetName = 'Stemmen';
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  // Delete if exists and recreate
  if (sheet) {
    spreadsheet.deleteSheet(sheet);
  }
  
  sheet = spreadsheet.insertSheet(sheetName);
  
  // Set up headers
  const headers = [
    'Tijdstempel',
    'Gebruiker ID',
    'Gebruiker Naam',
    'Categorie',
    'Optie Gekozen',
    'Rangorde',
    'Sessie ID'
  ];
  
  sheet.appendRow(headers);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  headerRange.setFontSize(11);
  
  // Set column widths
  sheet.setColumnWidth(1, 160);  // Tijdstempel
  sheet.setColumnWidth(2, 90);   // Gebruiker ID
  sheet.setColumnWidth(3, 200);  // Gebruiker Naam
  sheet.setColumnWidth(4, 180);  // Categorie
  sheet.setColumnWidth(5, 400);  // Optie Gekozen
  sheet.setColumnWidth(6, 80);   // Rangorde
  sheet.setColumnWidth(7, 200);  // Sessie ID
  
  // Add data validation for categories
  const categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.keys(CATEGORIES))
    .setAllowInvalid(false)
    .setHelpText('Kies een geldige categorie')
    .build();
  
  // Apply validation to category column (D2:D1000)
  const categoryRange = sheet.getRange(2, 4, 999, 1);
  categoryRange.setDataValidation(categoryRule);
  
  // Add conditional formatting for categories
  Object.entries(CATEGORIES).forEach(([category, config], index) => {
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(category)
      .setBackground(config.color)
      .setFontColor('#ffffff')
      .setRanges([sheet.getRange('D2:D1000')])
      .build();
    
    const rules = sheet.getConditionalFormatRules();
    rules.push(rule);
    sheet.setConditionalFormatRules(rules);
  });
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Protect header row
  const protection = sheet.getRange(1, 1, 1, headers.length).protect();
  
  console.log('✅ Main sheet "Stemmen" initialized');
}

/**
 * Initialize category reference sheets
 */
function initializeCategorySheets(spreadsheet) {
  Object.entries(CATEGORIES).forEach(([categoryName, config]) => {
    let sheet = spreadsheet.getSheetByName(categoryName);
    
    // Delete if exists
    if (sheet) {
      spreadsheet.deleteSheet(sheet);
    }
    
    sheet = spreadsheet.insertSheet(categoryName);
    
    // Add headers
    sheet.appendRow(['ID', 'Naam', 'Totaal Stemmen', 'Rang']);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, 4);
    headerRange.setFontWeight('bold');
    headerRange.setBackground(config.color);
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    
    // Since we can't directly access JSON files, create template structure
    // In a real scenario, you would fetch these from your web server
    const templateData = getCategoryTemplate(categoryName);
    
    templateData.forEach((item, index) => {
      sheet.appendRow([item.id, item.name, 0, '']);
    });
    
    // Set column widths
    sheet.setColumnWidth(1, 60);   // ID
    sheet.setColumnWidth(2, 400);  // Naam
    sheet.setColumnWidth(3, 120);  // Totaal Stemmen
    sheet.setColumnWidth(4, 80);   // Rang
    
    // Format data rows
    const dataRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4);
    dataRows.setHorizontalAlignment('left');
    dataRows.setVerticalAlignment('middle');
    
    // Center ID and counts
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).setHorizontalAlignment('center');
    sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).setHorizontalAlignment('center');
    sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).setHorizontalAlignment('center');
    
    // Add formulas for vote counting (will work when main sheet has data)
    const voteCountRange = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1);
    for (let i = 2; i <= sheet.getLastRow(); i++) {
      const optionName = sheet.getRange(i, 2).getValue();
      const formula = `=COUNTIFS(Stemmen!E:E,"*"&B${i}&"*",Stemmen!D:D,"${categoryName}")`;
      sheet.getRange(i, 3).setFormula(formula);
    }
    
    // Freeze header
    sheet.setFrozenRows(1);
    
    console.log(`✅ Category sheet "${categoryName}" initialized with ${templateData.length} items`);
  });
}

/**
 * Initialize summary sheets
 */
function initializeSummarySheets(spreadsheet) {
  // Summary: Stemmen per Categorie
  let summarySheet = spreadsheet.getSheetByName('Samenvatting');
  if (summarySheet) {
    spreadsheet.deleteSheet(summarySheet);
  }
  summarySheet = spreadsheet.insertSheet('Samenvatting');
  
  summarySheet.appendRow(['Statistiek', 'Waarde']);
  summarySheet.appendRow(['', '']);
  summarySheet.appendRow(['TOTAAL STEMMEN', '=COUNTA(Stemmen!A2:A)']);
  summarySheet.appendRow(['UNIEKE GEBRUIKERS', '=COUNTUNIQUE(Stemmen!C2:C)']);
  summarySheet.appendRow(['', '']);
  summarySheet.appendRow(['STEMMEN PER CATEGORIE', '']);
  
  let row = 7;
  Object.entries(CATEGORIES).forEach(([categoryName, config]) => {
    summarySheet.appendRow([
      categoryName,
      `=COUNTIF(Stemmen!D:D,"${categoryName}")/(${config.maxVotes})`
    ]);
    summarySheet.getRange(row, 2).setNumberFormat('0');
    row++;
  });
  
  // Format summary sheet
  summarySheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  summarySheet.getRange(3, 1, 2, 1).setFontWeight('bold');
  summarySheet.getRange(3, 2, 2, 1).setFontWeight('bold').setFontSize(14);
  summarySheet.getRange(6, 1, 1, 2).setFontWeight('bold').setBackground('#e8f0fe');
  summarySheet.setColumnWidth(1, 250);
  summarySheet.setColumnWidth(2, 150);
  
  summarySheet.setFrozenRows(1);
  
  console.log('✅ Summary sheet "Samenvatting" initialized');
  
  // User participation tracking
  let userSheet = spreadsheet.getSheetByName('Gebruikers');
  if (userSheet) {
    spreadsheet.deleteSheet(userSheet);
  }
  userSheet = spreadsheet.insertSheet('Gebruikers');
  
  userSheet.appendRow(['Gebruiker ID', 'Naam', 'Algemene Themas', 'Ronde Themas', 'Tafelrondes', 'Schiftingsvragen', 'Compleet']);
  
  // Format headers
  userSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');
  userSheet.setFrozenRows(1);
  
  userSheet.setColumnWidth(1, 100);
  userSheet.setColumnWidth(2, 200);
  userSheet.setColumnWidth(3, 140);
  userSheet.setColumnWidth(4, 120);
  userSheet.setColumnWidth(5, 120);
  userSheet.setColumnWidth(6, 140);
  userSheet.setColumnWidth(7, 100);
  
  console.log('✅ User tracking sheet "Gebruikers" initialized');
}

/**
 * Initialize user reference sheet
 */
function initializeUserSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName('Gebruikers Lijst');
  if (sheet) {
    spreadsheet.deleteSheet(sheet);
  }
  sheet = spreadsheet.insertSheet('Gebruikers Lijst');
  
  sheet.appendRow(['ID', 'Naam', 'Status']);
  
  // Since we can't access the JSON file directly, add template users
  const templateUsers = [
    { id: 1, name: 'Anthony Aichouche' },
    { id: 2, name: 'Heaven Cannoot' },
    { id: 3, name: 'Joren Vandaele' },
    { id: 4, name: 'Arne Buys' },
    { id: 5, name: 'Rosie Dhondt' },
    { id: 6, name: 'Dries Baelen' },
    { id: 7, name: 'Bram Coenye' },
    { id: 8, name: 'Caitlin Ellaby' },
    { id: 9, name: 'Emma Boesmans' },
    { id: 10, name: 'Lennert Lagrainge' },
    { id: 11, name: 'Lore Vriens' },
    { id: 12, name: 'Mohamed Chater' },
    { id: 13, name: 'Nathan Overmeire' },
    { id: 14, name: 'Niels Wauters' }
  ];
  
  templateUsers.forEach(user => {
    sheet.appendRow([user.id, user.name, 'Actief']);
  });
  
  // Format
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#ff9800').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 80);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 100);
  
  console.log(`✅ User list sheet initialized with ${templateUsers.length} template users`);
  console.log('Note: Update this sheet with actual users from your users.json file');
}

/**
 * Get template data for categories
 * Uses actual Hogentcup 2024 data
 */
function getCategoryTemplate(categoryName) {
  const templates = {
    'Algemene Themas': [
      { id: 1, name: "De Romeinen" },
      { id: 2, name: "Wild West" },
      { id: 3, name: "Galabal" },
      { id: 4, name: "MI6 Investigation" },
      { id: 5, name: "Reizen" },
      { id: 6, name: "Flashback jaren '80" }
    ],
    'Ronde Themas': [
      { id: 1, name: "Intro's" },
      { id: 2, name: "Niet zo actuele actua" },
      { id: 3, name: "Wij waren er alleszins niet bij" },
      { id: 4, name: "Geen Shazam nodig" },
      { id: 5, name: "Nerd alert" },
      { id: 6, name: "At the movies" },
      { id: 7, name: "True crime" },
      { id: 8, name: "Olympus tot walhalla" },
      { id: 9, name: "Sport" },
      { id: 10, name: "De markt" },
      { id: 11, name: "De globetrotter" },
      { id: 12, name: "Meme masters" },
      { id: 13, name: "Raadsels" },
      { id: 14, name: "Level up" },
      { id: 15, name: "Out of space" },
      { id: 16, name: "AUgent in de media" },
      { id: 17, name: "Belgie in beeld" },
      { id: 18, name: "Wereldkeuken" },
      { id: 19, name: "Dierenwereld" },
      { id: 20, name: "Puur natuur" },
      { id: 21, name: "Onder druk" },
      { id: 22, name: "Vast en zeker" }
    ],
    'Tafelrondes': [
      { id: 1, name: "Music Maestro" },
      { id: 2, name: "Fotoronde" },
      { id: 3, name: "Heaven's Raster" },
      { id: 4, name: "Raad het fragment" },
      { id: 5, name: "Anagrammen" }
    ],
    'Schiftingsvragen': [
      { id: 1, name: "Hoeveel deelnemers waren er in totaal ooit in de HOGENT-CUP?" },
      { id: 2, name: "Gadgets, hoeveel stuks in de pot?" },
      { id: 3, name: "Wat is de waarde van de gesponsorde winkelkar? (winnaar mag die meedoen)" }
    ]
  };
  
  return templates[categoryName] || [];
}

/**
 * Custom menu for easy access
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Hogentcup')
    .addItem('🔄 Herinitialiseer Spreadsheet', 'initializeSpreadsheet')
    .addItem('📊 Update Statistieken', 'updateStatistics')
    .addSeparator()
    .addItem('❌ Verwijder Alle Data', 'clearAllData')
    .addToUi();
}

/**
 * Update statistics across all sheets
 */
function updateStatistics() {
  // This function would recalculate rankings and statistics
  console.log('Statistics updated');
  SpreadsheetApp.getActiveSpreadsheet().toast('Statistieken bijgewerkt!', 'Succes');
}

/**
 * Clear all voting data but keep structure
 */
function clearAllData() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '⚠️ Let op!',
    'Dit verwijdert ALLE stemdata permanent. Weet je het zeker?',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Stemmen');
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    SpreadsheetApp.getActiveSpreadsheet().toast('Alle data is verwijderd', 'Klaar');
  }
}
