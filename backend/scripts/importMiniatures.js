// backend/scripts/importMiniatures.js - NEW FILE
// Run this script to import your CSV data: node scripts/importMiniatures.js

const fs = require('fs');
const path = require('path');
const { dbHelpers } = require('../db/database');

// Function to parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const miniatures = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length !== headers.length) {
      console.warn(`Skipping line ${i + 1}: column count mismatch`);
      continue;
    }
    
    const miniature = {};
    headers.forEach((header, index) => {
      miniature[header] = values[index] || null;
    });
    
    miniatures.push(miniature);
  }
  
  return miniatures;
}

// Function to split comma-separated values
function splitCSVField(field) {
  if (!field || field.trim() === '') return [];
  return field.split(',').map(item => item.trim()).filter(item => item !== '');
}

// Function to import a single miniature
async function importMiniature(miniatureData) {
  try {
    // Insert master miniature
    const insertSQL = `
      INSERT INTO master_miniatures 
      (model_name, sculpt_variant, variant_name, base_size, station, soulstone_cost)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const variantName = miniatureData['Variant Name'] || null;
    const soulstoneCore = miniatureData['Soulstone Cost'] && miniatureData['Soulstone Cost'] !== '' 
      ? parseInt(miniatureData['Soulstone Cost']) 
      : null;

    const result = await dbHelpers.run(insertSQL, [
      miniatureData['Model Name'],
      miniatureData['Sculpt Variant'] || 'M3E',
      variantName,
      miniatureData['Base Size'],
      miniatureData['Station'],
      soulstoneCore
    ]);

    const miniatureId = result.id;
    console.log(`Inserted miniature: ${miniatureData['Model Name']} (ID: ${miniatureId})`);

    // Insert factions
    const factions = splitCSVField(miniatureData['Factions']);
    for (const faction of factions) {
      await dbHelpers.run(
        'INSERT INTO miniature_factions (master_miniature_id, faction) VALUES (?, ?)',
        [miniatureId, faction]
      );
    }

    // Insert keywords
    const keywords = splitCSVField(miniatureData['Keywords']);
    for (const keyword of keywords) {
      await dbHelpers.run(
        'INSERT INTO miniature_keywords (master_miniature_id, keyword) VALUES (?, ?)',
        [miniatureId, keyword]
      );
    }

    // Insert characteristics
    const characteristics = splitCSVField(miniatureData['Characteristics']);
    for (const characteristic of characteristics) {
      await dbHelpers.run(
        'INSERT INTO miniature_characteristics (master_miniature_id, characteristic) VALUES (?, ?)',
        [miniatureId, characteristic]
      );
    }

    // Insert box names
    const boxNames = splitCSVField(miniatureData['Box Names']);
    for (const boxName of boxNames) {
      await dbHelpers.run(
        'INSERT INTO miniature_box_names (master_miniature_id, box_name) VALUES (?, ?)',
        [miniatureId, boxName]
      );
    }

    return miniatureId;
  } catch (error) {
    console.error(`Error importing ${miniatureData['Model Name']}:`, error.message);
    return null;
  }
}

// Main import function
async function importFromCSV(csvFilePath) {
  try {
    console.log('🎯 Starting miniature import from CSV...');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ CSV file not found: ${csvFilePath}`);
      console.log('Expected file location:', path.resolve(csvFilePath));
      return;
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const miniatures = parseCSV(csvContent);
    
    console.log(`📊 Found ${miniatures.length} miniatures to import`);

    // Validate required headers
    const requiredHeaders = ['Model Name', 'Base Size', 'Station', 'Factions', 'Keywords'];
    const firstMiniature = miniatures[0];
    const missingHeaders = requiredHeaders.filter(header => !(header in firstMiniature));
    
    if (missingHeaders.length > 0) {
      console.error(`❌ Missing required headers: ${missingHeaders.join(', ')}`);
      return;
    }

    // Import each miniature
    let successCount = 0;
    for (const miniature of miniatures) {
      const result = await importMiniature(miniature);
      if (result) successCount++;
    }

    console.log(`✅ Import complete! Successfully imported ${successCount}/${miniatures.length} miniatures`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
  }
}

// Command line usage
if (require.main === module) {
  const csvFilePath = process.argv[2] || './sample_miniatures.csv';
  
  console.log('🎯 Malifaux Miniature Data Importer');
  console.log(`📂 Looking for CSV file: ${csvFilePath}`);
  console.log('');
  
  importFromCSV(csvFilePath)
    .then(() => {
      console.log('🏁 Import process finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { importFromCSV, parseCSV, splitCSVField };