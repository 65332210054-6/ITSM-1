import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_zJW3ulGCVoM9@ep-silent-tree-a4ebgctg-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function inject() {
  console.log("Checking modules for sample data...");

  // 1. IPAM
  const ipCount = await sql`SELECT COUNT(*)::int as count FROM ip_addresses`;
  if (ipCount[0].count === 0) {
    console.log("Injecting IPAM samples...");
    const ips = [
      { id: 'ip-1', ip_address: '192.168.1.10', subnet_mask: '255.255.255.0', vlan: '10', description: 'Core Switch', status: 'In Use' },
      { id: 'ip-2', ip_address: '192.168.1.50', subnet_mask: '255.255.255.0', vlan: '10', description: 'Server AD-01', status: 'Reserved' },
      { id: 'ip-3', ip_address: '192.168.2.100', subnet_mask: '255.255.255.0', vlan: '20', description: 'Wi-Fi AP Office', status: 'In Use' },
      { id: 'ip-4', ip_address: '10.0.0.1', subnet_mask: '255.0.0.0', vlan: '100', description: 'Gateway Firewall', status: 'In Use' }
    ];
    for (const ip of ips) {
      await sql`INSERT INTO ip_addresses (id, ip_address, subnet_mask, vlan, description, status) VALUES (${ip.id}, ${ip.ip_address}, ${ip.subnet_mask}, ${ip.vlan}, ${ip.description}, ${ip.status})`;
    }
  }

  // 2. Consumables
  const consumableCount = await sql`SELECT COUNT(*)::int as count FROM consumables`;
  if (consumableCount[0].count === 0) {
    console.log("Injecting Consumables samples...");
    const items = [
      { id: 'con-1', name: 'Mouse Wireless (Logitech)', category: 'Peripherals', quantity: 15, min_quantity: 5, unit: 'ชิ้น', location: 'ตู้ A1' },
      { id: 'con-2', name: 'Keyboard USB', category: 'Peripherals', quantity: 3, min_quantity: 5, unit: 'ชิ้น', location: 'ตู้ A2' },
      { id: 'con-3', name: 'Toner HP 85A', category: 'Printer', quantity: 2, min_quantity: 2, unit: 'กล่อง', location: 'ห้องเก็บของ 1' },
      { id: 'con-4', name: 'Cat6 Cable (3m)', category: 'Network', quantity: 20, min_quantity: 10, unit: 'เส้น', location: 'ตู้ B' }
    ];
    for (const item of items) {
      await sql`INSERT INTO consumables (id, name, category, quantity, min_quantity, unit, location) VALUES (${item.id}, ${item.name}, ${item.category}, ${item.quantity}, ${item.min_quantity}, ${item.unit}, ${item.location})`;
    }
  }

  // 3. Domains
  const domainCount = await sql`SELECT COUNT(*)::int as count FROM domains`;
  if (domainCount[0].count === 0) {
    console.log("Injecting Domains samples...");
    await sql`
      INSERT INTO domains (id, name, registrar, expiration_date, ssl_type, ssl_expiration, hosting_provider, status)
      VALUES 
      ('dom-1', 'company-portal.com', 'GoDaddy', NOW() + INTERVAL '10 months', 'DV SSL', NOW() + INTERVAL '3 months', 'DigitalOcean', 'Active'),
      ('dom-2', 'internal-app.net', 'Namecheap', NOW() + INTERVAL '15 days', 'None', NULL, 'AWS', 'Active')
    `;
  }

  // 4. Licenses
  const licenseCount = await sql`SELECT COUNT(*)::int as count FROM licenses`;
  if (licenseCount[0].count === 0) {
    console.log("Injecting Licenses samples...");
    await sql`
      INSERT INTO licenses (id, name, version, total_licenses, expiration_date, vendor, status)
      VALUES 
      ('lic-1', 'Microsoft 365 Business Standard', '2024', 50, NOW() + INTERVAL '6 months', 'Microsoft', 'Active'),
      ('lic-2', 'Adobe Creative Cloud', 'All Apps', 5, NOW() - INTERVAL '2 days', 'Adobe', 'Expired')
    `;
  }

  console.log("Done!");
}

inject();
