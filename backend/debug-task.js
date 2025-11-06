const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function debugTaskCreation() {
  try {
    console.log('🔐 Step 1: Login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'password'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.data.token;
    console.log('🎫 Token (first 20 chars):', token.substring(0, 20) + '...');
    
    console.log('\n📋 Step 2: Create task...');
    const taskResponse = await axios.post(`${API_BASE}/tasks`, {
      title: 'Debug Test Task',
      description: 'Created via debug script',
      service_class: 'Linear',
      ai_eligible: true,
      tags: ['debug', 'test']
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Task created successfully!');
    console.log('📋 Task data:', JSON.stringify(taskResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request failed:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

debugTaskCreation();