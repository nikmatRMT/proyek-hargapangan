// test-dataapi.js - Test MongoDB Data API connection
import 'dotenv/config';

const MONGODB_DATA_API_URL = process.env.MONGODB_DATA_API_URL;
const MONGODB_DATA_API_KEY = process.env.MONGODB_DATA_API_KEY;
const MONGODB_DATA_SOURCE = process.env.MONGODB_DATA_SOURCE || 'Cluster0';
const MONGODB_DB = process.env.MONGODB_DB || 'harga_pasar_mongo';

async function findOneDataApi(collection, filter) {
  const url = `${MONGODB_DATA_API_URL}/action/findOne`;
  
  console.log(`📡 Testing Data API: ${collection}`);
  console.log(`   URL: ${url}`);
  console.log(`   Filter:`, JSON.stringify(filter));
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': MONGODB_DATA_API_KEY,
    },
    body: JSON.stringify({
      dataSource: MONGODB_DATA_SOURCE,
      database: MONGODB_DB,
      collection,
      filter,
    }),
  });
  
  console.log(`   Status: ${res.status} ${res.statusText}`);
  
  const data = await res.json();
  return data;
}

async function testConnection() {
  console.log('\n=== 🧪 Testing MongoDB Data API Connection ===\n');
  
  // Check env vars
  console.log('📋 Environment Variables:');
  console.log(`   MONGODB_DATA_API_URL: ${MONGODB_DATA_API_URL ? '✓ Set' : '✗ Missing'}`);
  console.log(`   MONGODB_DATA_API_KEY: ${MONGODB_DATA_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   MONGODB_DATA_SOURCE: ${MONGODB_DATA_SOURCE}`);
  console.log(`   MONGODB_DB: ${MONGODB_DB}\n`);
  
  if (!MONGODB_DATA_API_URL || !MONGODB_DATA_API_KEY) {
    console.error('❌ Missing required environment variables!');
    console.log('\nCreate .env file with:');
    console.log('MONGODB_DATA_API_URL=https://ap-southeast-1.aws.data.mongodb-api.com/app/...');
    console.log('MONGODB_DATA_API_KEY=your-api-key');
    console.log('MONGODB_DATA_SOURCE=Cluster0');
    console.log('MONGODB_DB=harga_pasar_mongo');
    process.exit(1);
  }
  
  try {
    // Test 1: Find user "admin"
    console.log('\n--- Test 1: Find user "admin" ---');
    const userResult = await findOneDataApi('users', { username: 'admin' });
    
    if (userResult.document) {
      console.log('✅ User found!');
      console.log('   Username:', userResult.document.username);
      console.log('   Role:', userResult.document.role);
      console.log('   Has password hash:', !!userResult.document.password);
    } else {
      console.log('❌ User not found');
      console.log('   Response:', JSON.stringify(userResult, null, 2));
    }
    
    // Test 2: Find any session
    console.log('\n--- Test 2: Check sessions collection ---');
    const sessionResult = await findOneDataApi('sessions', {});
    
    if (sessionResult.document) {
      console.log('✅ Session collection accessible');
      console.log('   Sample session:', JSON.stringify(sessionResult.document, null, 2));
    } else {
      console.log('⚠️  No sessions found (this is OK if no one logged in yet)');
    }
    
    // Test 3: Count markets
    console.log('\n--- Test 3: Find a market ---');
    const marketResult = await findOneDataApi('markets', {});
    
    if (marketResult.document) {
      console.log('✅ Markets collection accessible');
      console.log('   Sample market:', marketResult.document.nama || marketResult.document.name);
    } else {
      console.log('❌ No markets found');
    }
    
    console.log('\n=== ✅ All tests completed! ===\n');
    
  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testConnection();
