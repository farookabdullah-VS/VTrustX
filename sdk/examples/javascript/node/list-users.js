import { VTrustXClient } from './client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Example: List all users and their roles
 */
async function listUsers() {
  const client = new VTrustXClient(process.env.API_URL || 'http://localhost:3000/api');

  try {
    // Login
    console.log('🔐 Logging in...');
    await client.login(
      process.env.EMAIL || 'admin@vtrustx.com',
      process.env.PASSWORD || 'admin123'
    );
    console.log('✅ Logged in\n');

    // Get all users
    console.log('👥 Fetching users...');
    const users = await client.getUsers();

    console.log(`\nFound ${users.length} users:\n`);
    console.log('─'.repeat(80));
    console.log('ID'.padEnd(8), 'Username'.padEnd(20), 'Email'.padEnd(30), 'Role');
    console.log('─'.repeat(80));

    users.forEach(user => {
      console.log(
        user.id.toString().padEnd(8),
        (user.username || 'N/A').padEnd(20),
        (user.email || 'N/A').padEnd(30),
        user.role || 'N/A'
      );
    });

    console.log('─'.repeat(80));

    // Get roles
    console.log('\n🎭 Available roles:');
    const roles = await client.getRoles();
    roles.forEach(role => {
      console.log(`   - ${role.name} (${role.permissions?.length || 0} permissions)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
listUsers();
