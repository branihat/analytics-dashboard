#!/usr/bin/env node

/**
 * Test ATR Functionality
 * 
 * This script tests the ATR documents functionality to ensure it's working correctly
 */

const UploadedATRModel = require('./models/UploadedATR');

async function testATRFunctionality() {
  console.log('🔄 Testing ATR Documents functionality...\n');

  try {
    // Test 1: Get all ATR documents
    console.log('📋 Test 1: Getting all ATR documents...');
    const allDocuments = await UploadedATRModel.getAllATRDocuments();
    console.log(`✅ Successfully retrieved ${allDocuments.length} ATR documents`);

    // Test 2: Get ATR documents by site
    console.log('\n📋 Test 2: Getting ATR documents by site...');
    const siteDocuments = await UploadedATRModel.getATRDocumentsBySite('Bukaro');
    console.log(`✅ Successfully retrieved ${siteDocuments.length} ATR documents for Bukaro site`);

    // Test 3: Get ATR documents by department
    console.log('\n📋 Test 3: Getting ATR documents by department...');
    const deptDocuments = await UploadedATRModel.getATRDocumentsByDepartment('E&T Department');
    console.log(`✅ Successfully retrieved ${deptDocuments.length} ATR documents for E&T Department`);

    // Test 4: Search ATR documents
    console.log('\n📋 Test 4: Searching ATR documents...');
    const searchResults = await UploadedATRModel.searchATRDocuments('test');
    console.log(`✅ Successfully searched ATR documents, found ${searchResults.length} results`);

    console.log('\n🎉 All ATR functionality tests passed!');
    console.log('✅ The ATR documents feature is working correctly');

  } catch (error) {
    console.error('❌ ATR functionality test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testATRFunctionality();