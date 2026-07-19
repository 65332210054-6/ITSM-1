import { neon } from '@neondatabase/serverless';
import { checkModuleAccess } from '../auth.js';

// ============================================================
// room-care.js — RoomCare Maintenance System API
// Handles: Branches, Rooms, Tickets, Logs for room maintenance
// ============================================================

export async function onRequest(context) {
  const { request, env } = context;
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(JSON.stringify({ message: 'DATABASE_URL is not set' }), { status: 500 });
  }

  try {
    const userSession = await checkModuleAccess(context, 'room_care', 'view');
    if (userSession === null) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }
    if (userSession === false) {
      return new Response(JSON.stringify({ message: 'Forbidden: You do not have access to the Room Care module' }), { status: 403 });
    }

    const sql = neon(databaseUrl);

    // ── Auto-Migration: Create tables if not exists ──────────────────────
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS rc_rooms (
          id            TEXT PRIMARY KEY,
          branch_id     TEXT NOT NULL,
          number        TEXT NOT NULL,
          type          TEXT NOT NULL DEFAULT 'Standard',
          floor         TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'Available',
          last_inspected DATE,
          inspector     TEXT,
          details       JSONB DEFAULT '{}',
          created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS rc_tickets (
          id          TEXT PRIMARY KEY,
          room_id     TEXT NOT NULL REFERENCES rc_rooms(id) ON DELETE CASCADE,
          branch_id   TEXT NOT NULL,
          desc        TEXT NOT NULL,
          category    TEXT NOT NULL,
          priority    TEXT DEFAULT 'Medium',
          assignee    TEXT,
          cost        NUMERIC DEFAULT 0,
          status      TEXT DEFAULT 'Needs Repair',
          opened_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          closed_at   TIMESTAMP WITH TIME ZONE,
          closed_by   TEXT,
          close_notes TEXT,
          is_history  BOOLEAN DEFAULT FALSE,
          created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS rc_logs (
          id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          branch_id  TEXT,
          user_name  TEXT NOT NULL,
          action     TEXT NOT NULL,
          detail     TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS rc_settings (
          key   TEXT PRIMARY KEY,
          value JSONB NOT NULL DEFAULT '[]'
        )
      `;
    } catch (migErr) {
      console.error('RC Migration Error:', migErr);
    }

    // ── Auto-Seed: If rc_rooms is empty, seed from branches table ──────
    try {
      const roomCount = await sql`SELECT COUNT(*) as count FROM rc_rooms`;
      if (parseInt(roomCount[0].count) === 0) {
        const branchRows = await sql`SELECT id, name FROM branches ORDER BY name`;
        if (branchRows.length > 0) {
          const branch = branchRows[0];
          const defaultRooms = [
            { number: '101', type: 'Standard', floor: '1' },
            { number: '102', type: 'Standard', floor: '1' },
            { number: '103', type: 'Deluxe',   floor: '1' },
            { number: '201', type: 'Standard', floor: '2' },
            { number: '202', type: 'Deluxe',   floor: '2' },
            { number: '301', type: 'Suite',    floor: '3' },
          ];
          for (const r of defaultRooms) {
            const rid = 'r-' + Date.now() + '-' + r.number;
            await sql`
              INSERT INTO rc_rooms (id, branch_id, number, type, floor, status, last_inspected, inspector, details)
              VALUES (
                ${rid},
                ${branch.id},
                ${r.number},
                ${r.type},
                ${r.floor},
                'Available',
                CURRENT_DATE,
                'ระบบ (Auto Seed)',
                '{"electrical":"Normal","ac":"Normal","plumbing":"Normal","furniture":"Normal","appliances":"Normal"}'::jsonb
              )
              ON CONFLICT (id) DO NOTHING
            `;
          }
        }
      }
    } catch (seedErr) {
      console.error('RC Seed Error:', seedErr);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const method = request.method;

    const headers = { 'Content-Type': 'application/json' };
    const err = (msg, status = 400) => new Response(JSON.stringify({ message: msg }), { status, headers });
    const ok = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

    // ════════════════════════════════════════════════════════════
    // GET Endpoints
    // ════════════════════════════════════════════════════════════
    if (method === 'GET') {

      // GET /api/room-care?action=settings
      if (action === 'settings') {
        const systems = await sql`SELECT value FROM rc_settings WHERE key = 'systems'`;
        const roomTypes = await sql`SELECT value FROM rc_settings WHERE key = 'room_types'`;
        const assignees = await sql`SELECT value FROM rc_settings WHERE key = 'assignees'`;

        return ok({
          systems: systems.length > 0 ? systems[0].value : ['Electrical', 'AC', 'Plumbing', 'Furniture', 'Appliances'],
          room_types: roomTypes.length > 0 ? roomTypes[0].value : ['Standard', 'Deluxe', 'Suite', 'Penthouse'],
          assignees: assignees.length > 0 ? assignees[0].value : []
        });
      }

      // GET /api/room-care?action=logs&branch_id=...&limit=50
      if (action === 'logs') {
        const branchId = url.searchParams.get('branch_id');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        let logs;
        if (branchId) {
          logs = await sql`
            SELECT * FROM rc_logs
            WHERE branch_id = ${branchId} OR branch_id IS NULL
            ORDER BY created_at DESC LIMIT ${limit}
          `;
        } else {
          logs = await sql`SELECT * FROM rc_logs ORDER BY created_at DESC LIMIT ${limit}`;
        }
        return ok(logs);
      }

      // GET /api/room-care?action=rooms&branch_id=...
      if (action === 'rooms') {
        const branchId = url.searchParams.get('branch_id');
        if (!branchId) return err('branch_id is required');

        const rooms = await sql`
          SELECT r.*,
            COALESCE(json_agg(t.*) FILTER (WHERE t.id IS NOT NULL AND t.is_history = false), '[]') AS active_tickets,
            COALESCE(json_agg(h.*) FILTER (WHERE h.id IS NOT NULL AND h.is_history = true), '[]')  AS repair_history
          FROM rc_rooms r
          LEFT JOIN rc_tickets t ON t.room_id = r.id AND t.is_history = false
          LEFT JOIN rc_tickets h ON h.room_id = r.id AND h.is_history = true
          WHERE r.branch_id = ${branchId}
          GROUP BY r.id
          ORDER BY r.number
        `;
        return ok(rooms);
      }

      // GET /api/room-care?action=branches
      if (action === 'branches') {
        const rows = await sql`SELECT id, name FROM branches ORDER BY name`;
        return ok(rows);
      }

      // Default GET — return full data for one branch (or first branch)
      const branchId = url.searchParams.get('branch_id');
      const branches = await sql`SELECT id, name FROM branches ORDER BY name`;
      const targetBranchId = branchId || (branches[0]?.id ?? null);

      if (!targetBranchId) return ok({ branches: [], rooms: {}, logs: [] });

      const rooms = await sql`
        SELECT r.*,
          COALESCE(json_agg(t.*) FILTER (WHERE t.id IS NOT NULL AND t.is_history = false), '[]') AS active_tickets,
          COALESCE(json_agg(h.*) FILTER (WHERE h.id IS NOT NULL AND h.is_history = true), '[]')  AS repair_history
        FROM rc_rooms r
        LEFT JOIN rc_tickets t ON t.room_id = r.id AND t.is_history = false
        LEFT JOIN rc_tickets h ON h.room_id = r.id AND h.is_history = true
        WHERE r.branch_id = ${targetBranchId}
        GROUP BY r.id
        ORDER BY r.number
      `;

      const logs = await sql`
        SELECT * FROM rc_logs
        WHERE branch_id = ${targetBranchId} OR branch_id IS NULL
        ORDER BY created_at DESC LIMIT 100
      `;

      return ok({ branches, rooms: rooms, logs });
    }

    // ════════════════════════════════════════════════════════════
    // POST Endpoints (Create)
    // ════════════════════════════════════════════════════════════
    if (method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON body'); }

      // POST add_log
      if (action === 'add_log') {
        const { branch_id, user_name, action: logAction, detail } = body;
        if (!user_name || !logAction || !detail) return err('user_name, action, and detail are required');
        await sql`
          INSERT INTO rc_logs (branch_id, user_name, action, detail)
          VALUES (${branch_id || null}, ${user_name}, ${logAction}, ${detail})
        `;
        return ok({ message: 'Log added' });
      }

      // POST add_room (single room or batch floor)
      if (action === 'add_room') {
        const { branch_id, number, type, floor } = body;
        if (!branch_id || !number || !floor) return err('branch_id, number, and floor are required');
        const rid = 'r-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        const newRoom = await sql`
          INSERT INTO rc_rooms (id, branch_id, number, type, floor, status, last_inspected, inspector, details)
          VALUES (
            ${rid}, ${branch_id}, ${number}, ${type || 'Standard'}, ${floor},
            'Available', CURRENT_DATE, ${userSession.name || 'System'},
            '{"electrical":"Normal","ac":"Normal","plumbing":"Normal","furniture":"Normal","appliances":"Normal"}'::jsonb
          )
          RETURNING *
        `;
        return ok(newRoom[0], 201);
      }

      // POST add_floor (batch rooms for a whole floor)
      if (action === 'add_floor') {
        const { branch_id, floor, room_count, room_type } = body;
        if (!branch_id || !floor || !room_count) return err('branch_id, floor, and room_count are required');

        const existing = await sql`
          SELECT number FROM rc_rooms WHERE branch_id = ${branch_id} AND floor = ${String(floor)}
        `;
        const existingNums = new Set(existing.map(r => r.number));

        const created = [];
        for (let i = 1; i <= room_count; i++) {
          const roomNumber = String(floor) + String(i).padStart(2, '0');
          if (existingNums.has(roomNumber)) continue;
          const rid = 'r-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 5);
          await sql`
            INSERT INTO rc_rooms (id, branch_id, number, type, floor, status, last_inspected, inspector, details)
            VALUES (
              ${rid}, ${branch_id}, ${roomNumber}, ${room_type || 'Standard'}, ${String(floor)},
              'Available', CURRENT_DATE, ${userSession.name || 'System'},
              '{"electrical":"Normal","ac":"Normal","plumbing":"Normal","furniture":"Normal","appliances":"Normal"}'::jsonb
            )
          `;
          created.push(roomNumber);
        }
        return ok({ created });
      }

      // POST add_ticket
      if (action === 'add_ticket') {
        const { room_id, branch_id, desc, category, priority, assignee, cost } = body;
        if (!room_id || !desc || !category) return err('room_id, desc, and category are required');

        const tid = 'tk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const ticketStatus = assignee ? 'Repairing' : 'Needs Repair';

        const ticket = await sql`
          INSERT INTO rc_tickets (id, room_id, branch_id, desc, category, priority, assignee, cost, status, is_history)
          VALUES (
            ${tid}, ${room_id}, ${branch_id || null}, ${desc}, ${category},
            ${priority || 'Medium'}, ${assignee || null}, ${cost || 0}, ${ticketStatus}, false
          )
          RETURNING *
        `;

        // Update room status
        const sysKey = category.toLowerCase().replace(/\s+/g, '_');
        await sql`
          UPDATE rc_rooms
          SET status = 'Needs Repair',
              details = details || ${JSON.stringify({ [sysKey]: 'Needs Repair' })}::jsonb,
              updated_at = NOW()
          WHERE id = ${room_id}
        `;

        return ok(ticket[0], 201);
      }

      // POST update_settings
      if (action === 'update_settings') {
        const { key, value } = body;
        if (!key || !value) return err('key and value are required');
        await sql`
          INSERT INTO rc_settings (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb)
          ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}::jsonb
        `;
        return ok({ message: 'Settings updated' });
      }

      return err('Unknown action', 400);
    }

    // ════════════════════════════════════════════════════════════
    // PUT Endpoints (Update)
    // ════════════════════════════════════════════════════════════
    if (method === 'PUT') {
      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON body'); }

      // PUT update_room
      if (action === 'update_room') {
        const { room_id, number, type } = body;
        if (!room_id) return err('room_id is required');
        await sql`
          UPDATE rc_rooms SET number = ${number}, type = ${type}, updated_at = NOW()
          WHERE id = ${room_id}
        `;
        return ok({ message: 'Room updated' });
      }

      // PUT update_room_inspection (save inspection result)
      if (action === 'update_room_inspection') {
        const { room_id, details, status, inspector, close_tickets } = body;
        if (!room_id) return err('room_id is required');

        await sql`
          UPDATE rc_rooms
          SET details = ${JSON.stringify(details)}::jsonb,
              status = ${status || 'Available'},
              inspector = ${inspector || userSession.name},
              last_inspected = CURRENT_DATE,
              updated_at = NOW()
          WHERE id = ${room_id}
        `;

        // Close tickets if inspection passed
        if (close_tickets && Array.isArray(close_tickets) && close_tickets.length > 0) {
          for (const tid of close_tickets) {
            await sql`
              UPDATE rc_tickets
              SET is_history = true,
                  status = 'Completed',
                  closed_at = NOW(),
                  closed_by = ${userSession.name},
                  close_notes = 'ตรวจเช็คใหม่พบว่าระบบปกติ',
                  updated_at = NOW()
              WHERE id = ${tid}
            `;
          }
        }
        return ok({ message: 'Inspection saved' });
      }

      // PUT update_ticket
      if (action === 'update_ticket') {
        const { ticket_id, desc, category, priority, assignee, cost } = body;
        if (!ticket_id) return err('ticket_id is required');
        const ticketStatus = assignee ? 'Repairing' : 'Needs Repair';
        await sql`
          UPDATE rc_tickets
          SET desc = ${desc}, category = ${category}, priority = ${priority},
              assignee = ${assignee || null}, cost = ${cost || 0},
              status = ${ticketStatus}, updated_at = NOW()
          WHERE id = ${ticket_id}
        `;
        return ok({ message: 'Ticket updated' });
      }

      // PUT start_ticket (change status to Repairing)
      if (action === 'start_ticket') {
        const { ticket_id } = body;
        if (!ticket_id) return err('ticket_id is required');
        await sql`UPDATE rc_tickets SET status = 'Repairing', updated_at = NOW() WHERE id = ${ticket_id}`;
        return ok({ message: 'Ticket started' });
      }

      // PUT finish_ticket (close ticket, move to history)
      if (action === 'finish_ticket') {
        const { ticket_id, room_id, close_notes } = body;
        if (!ticket_id || !room_id) return err('ticket_id and room_id are required');

        const ticketResult = await sql`SELECT * FROM rc_tickets WHERE id = ${ticket_id}`;
        if (ticketResult.length === 0) return err('Ticket not found', 404);
        const t = ticketResult[0];

        // Move ticket to history
        await sql`
          UPDATE rc_tickets
          SET is_history = true,
              status = 'Completed',
              closed_at = NOW(),
              closed_by = ${userSession.name},
              close_notes = ${close_notes || 'ไม่มีหมายเหตุ'},
              updated_at = NOW()
          WHERE id = ${ticket_id}
        `;

        // Check remaining active tickets for this room
        const remaining = await sql`
          SELECT COUNT(*) as count FROM rc_tickets WHERE room_id = ${room_id} AND is_history = false
        `;

        const sysKey = t.category ? t.category.toLowerCase().replace(/\s+/g, '_') : null;

        if (parseInt(remaining[0].count) === 0) {
          // All tickets closed — room is Available
          await sql`
            UPDATE rc_rooms
            SET status = 'Available',
                details = '{"electrical":"Normal","ac":"Normal","plumbing":"Normal","furniture":"Normal","appliances":"Normal"}'::jsonb,
                updated_at = NOW()
            WHERE id = ${room_id}
          `;
        } else if (sysKey) {
          // Update details for this system key back to Normal if no more active tickets for it
          const sysTickets = await sql`
            SELECT COUNT(*) as count FROM rc_tickets
            WHERE room_id = ${room_id} AND category = ${t.category} AND is_history = false
          `;
          if (parseInt(sysTickets[0].count) === 0) {
            await sql`
              UPDATE rc_rooms
              SET details = details || ${JSON.stringify({ [sysKey]: 'Normal' })}::jsonb,
                  updated_at = NOW()
              WHERE id = ${room_id}
            `;
          }
        }

        return ok({ message: 'Ticket finished' });
      }

      return err('Unknown action', 400);
    }

    // ════════════════════════════════════════════════════════════
    // DELETE Endpoints
    // ════════════════════════════════════════════════════════════
    if (method === 'DELETE') {
      const accessCheck = await checkModuleAccess(context, 'room_care', 'delete');
      if (!accessCheck) {
        return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
      }

      // DELETE room
      if (action === 'delete_room') {
        const roomId = url.searchParams.get('room_id');
        if (!roomId) return err('room_id is required');
        await sql`DELETE FROM rc_rooms WHERE id = ${roomId}`;
        return ok({ message: 'Room deleted' });
      }

      // DELETE floor (all rooms on a floor for a branch)
      if (action === 'delete_floor') {
        const branchId = url.searchParams.get('branch_id');
        const floor = url.searchParams.get('floor');
        if (!branchId || !floor) return err('branch_id and floor are required');
        await sql`DELETE FROM rc_rooms WHERE branch_id = ${branchId} AND floor = ${floor}`;
        return ok({ message: 'Floor deleted' });
      }

      // DELETE branch (clean up all rooms/tickets/logs for a branch)
      if (action === 'delete_branch') {
        const branchId = url.searchParams.get('branch_id');
        if (!branchId) return err('branch_id is required');
        await sql`DELETE FROM rc_rooms WHERE branch_id = ${branchId}`;
        await sql`DELETE FROM rc_logs WHERE branch_id = ${branchId}`;
        return ok({ message: 'Branch room care data deleted' });
      }

      return err('Unknown action', 400);
    }

    return err('Method not allowed', 405);

  } catch (e) {
    console.error('RoomCare API Error:', e);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: e.message }), { status: 500 });
  }
}
