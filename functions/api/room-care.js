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

    // ── Auto-Migration: Run once per worker isolate instance ──────────────
    if (!globalThis._rcMigrated) {
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
          );
        `;
        await sql`
          CREATE TABLE IF NOT EXISTS rc_tickets (
            id          TEXT PRIMARY KEY,
            room_id     TEXT NOT NULL REFERENCES rc_rooms(id) ON DELETE CASCADE,
            branch_id   TEXT NOT NULL,
            "desc"      TEXT NOT NULL,
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
          );
        `;
        await sql`
          CREATE TABLE IF NOT EXISTS rc_logs (
            id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            branch_id  TEXT,
            user_name  TEXT NOT NULL,
            action     TEXT NOT NULL,
            detail     TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        await sql`
          CREATE TABLE IF NOT EXISTS rc_settings (
            key   TEXT PRIMARY KEY,
            value JSONB NOT NULL DEFAULT '[]'
          );
        `;
        await sql`
          CREATE TABLE IF NOT EXISTS rc_incidents (
            id          TEXT PRIMARY KEY,
            branch_id   TEXT NOT NULL,
            room_id     TEXT,
            title       TEXT NOT NULL,
            detail      TEXT,
            category    TEXT DEFAULT 'General',
            severity    TEXT DEFAULT 'Normal',
            reporter    TEXT NOT NULL,
            created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        await sql`ALTER TABLE rc_tickets ADD COLUMN IF NOT EXISTS ticket_no TEXT;`;
        globalThis._rcMigrated = true;
      } catch (migErr) {
        console.error('RC Migration Error:', migErr);
      }
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

      // GET /api/room-care?action=incidents&branch_id=...&room_id=...
      if (action === 'incidents') {
        const branchId = url.searchParams.get('branch_id');
        const roomId = url.searchParams.get('room_id');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        let incidents;
        if (roomId) {
          incidents = await sql`SELECT * FROM rc_incidents WHERE room_id = ${roomId} ORDER BY created_at DESC LIMIT ${limit}`;
        } else if (branchId) {
          incidents = await sql`SELECT * FROM rc_incidents WHERE branch_id = ${branchId} ORDER BY created_at DESC LIMIT ${limit}`;
        } else {
          incidents = await sql`SELECT * FROM rc_incidents ORDER BY created_at DESC LIMIT ${limit}`;
        }
        return ok(incidents);
      }

      // GET /api/room-care?action=repair_history
      if (action === 'repair_history') {
        const branchId = url.searchParams.get('branch_id');
        if (!branchId) return err('branch_id is required');

        const roomNumber = url.searchParams.get('room_number') || '';
        const category = url.searchParams.get('category') || '';
        const startDate = url.searchParams.get('start_date') || '';
        const endDate = url.searchParams.get('end_date') || '';

        const rows = await sql`
          SELECT t.*, r.number as room_number, b.name as branch_name
          FROM rc_tickets t
          LEFT JOIN rc_rooms r ON t.room_id = r.id
          LEFT JOIN branches b ON t.branch_id = b.id
          WHERE t.branch_id = ${branchId}
            -- แก้ไขการเปรียบเทียบค่าว่าง ให้ SQL เข้าใจง่ายขึ้น
            AND (${roomNumber} = '' OR r.number ILIKE ${'%' + roomNumber + '%'})
            AND (${category} = '' OR t.category = ${category})
            AND (${startDate} = '' OR t.created_at >= ${startDate ? startDate + 'T00:00:00' : '1970-01-01T00:00:00'})
            AND (${endDate} = '' OR t.created_at <= ${endDate ? endDate + 'T23:59:59' : '2099-12-31T23:59:59'})
            -- เพิ่มเงื่อนไขนี้ ถ้าต้องการเฉพาะรายการที่เป็น History แล้วจริงๆ
            -- AND t.is_history = true 
          ORDER BY t.created_at DESC
        `;
        return ok(rows);
      }

      // GET /api/room-care?action=incidents_history
      if (action === 'incidents_history') {
        const branchId = url.searchParams.get('branch_id');
        if (!branchId) return err('branch_id is required');

        const roomNumber = url.searchParams.get('room_number') || '';
        const startDate = url.searchParams.get('start_date') || '';
        const endDate = url.searchParams.get('end_date') || '';

        const rows = await sql`
          SELECT inc.*, r.number as room_number, b.name as branch_name
          FROM rc_incidents inc
          LEFT JOIN rc_rooms r ON inc.room_id = r.id
          LEFT JOIN branches b ON inc.branch_id = b.id
          WHERE inc.branch_id = ${branchId}
            AND (${roomNumber} = '' OR r.number ILIKE ${'%' + roomNumber + '%'})
            AND (${startDate} = '' OR inc.created_at >= ${startDate ? startDate + 'T00:00:00' : '1970-01-01T00:00:00'})
            AND (${endDate} = '' OR inc.created_at <= ${endDate ? endDate + 'T23:59:59' : '2099-12-31T23:59:59'})
          ORDER BY inc.created_at DESC
        `;
        return ok(rows);
      }

      // GET /api/room-care?action=rooms&branch_id=...
      if (action === 'rooms') {
        const branchId = url.searchParams.get('branch_id');
        if (!branchId) return err('branch_id is required');

        const rooms = await sql`
          SELECT r.*,
            COALESCE((
              SELECT json_agg(t.* ORDER BY t.created_at DESC)
              FROM rc_tickets t
              WHERE t.room_id = r.id AND t.is_history = false
            ), '[]'::json) AS active_tickets,
            COALESCE((
              SELECT json_agg(h.* ORDER BY h.created_at DESC)
              FROM rc_tickets h
              WHERE h.room_id = r.id AND h.is_history = true
            ), '[]'::json) AS repair_history,
            COALESCE((
              SELECT json_agg(inc.* ORDER BY inc.created_at DESC)
              FROM rc_incidents inc
              WHERE inc.room_id = r.id
            ), '[]'::json) AS incidents
          FROM rc_rooms r
          WHERE r.branch_id = ${branchId}
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
          COALESCE((
            SELECT json_agg(t.* ORDER BY t.created_at DESC)
            FROM rc_tickets t
            WHERE t.room_id = r.id AND t.is_history = false
          ), '[]'::json) AS active_tickets,
          COALESCE((
            SELECT json_agg(h.* ORDER BY h.created_at DESC)
            FROM rc_tickets h
            WHERE h.room_id = r.id AND h.is_history = true
          ), '[]'::json) AS repair_history,
          COALESCE((
            SELECT json_agg(inc.* ORDER BY inc.created_at DESC)
            FROM rc_incidents inc
            WHERE inc.room_id = r.id
          ), '[]'::json) AS incidents
        FROM rc_rooms r
        WHERE r.branch_id = ${targetBranchId}
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
      const accessCheck = await checkModuleAccess(context, 'room_care', 'create');
      if (!accessCheck) {
        return err('Forbidden: คุณไม่มีสิทธิ์ในการสร้าง/เพิ่มข้อมูล', 403);
      }

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

      // POST add_incident
      if (action === 'add_incident') {
        const { branch_id, room_id, title, detail, category, severity, reporter } = body;
        if (!branch_id || !title) return err('branch_id and title are required');

        const incId = 'inc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const inc = await sql`
          INSERT INTO rc_incidents (id, branch_id, room_id, title, detail, category, severity, reporter)
          VALUES (
            ${incId}, ${branch_id}, ${room_id || null}, ${title}, ${detail || ''},
            ${category || 'General'}, ${severity || 'Normal'}, ${reporter || userSession.name || 'System'}
          )
          RETURNING *
        `;

        // Log action
        let logDetail = `บันทึกเหตุการณ์: ${title}`;
        if (detail) logDetail += ` (${detail})`;
        await sql`
          INSERT INTO rc_logs (branch_id, user_name, action, detail)
          VALUES (${branch_id}, ${reporter || userSession.name || 'System'}, 'บันทึกเหตุการณ์', ${logDetail})
        `;

        return ok(inc[0], 201);
      }

      // POST add_ticket
      if (action === 'add_ticket') {
        const { room_id, branch_id, desc, category, priority, assignee, cost } = body;
        if (!room_id || !desc || !category) return err('room_id, desc, and category are required');

        const tid = 'tk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const todayCount = await sql`
          SELECT COUNT(*)::int as count FROM rc_tickets
          WHERE TO_CHAR(created_at, 'YYYYMMDD') = ${todayStr}
        `;
        const seq = (todayCount[0]?.count || 0) + 1;
        const roomRes = await sql`SELECT number FROM rc_rooms WHERE id = ${room_id}`;
        const roomNum = roomRes[0]?.number || '000';
        const ticketNo = `${todayStr}-${roomNum}-${String(seq).padStart(3, '0')}`;

        const ticketStatus = assignee ? 'Repairing' : 'Needs Repair';

        const ticket = await sql`
          INSERT INTO rc_tickets (id, ticket_no, room_id, branch_id, "desc", category, priority, assignee, cost, status, is_history)
          VALUES (
            ${tid}, ${ticketNo}, ${room_id}, ${branch_id || null}, ${desc}, ${category},
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
      const accessCheck = await checkModuleAccess(context, 'room_care', 'edit');
      if (!accessCheck) {
        return err('Forbidden: คุณไม่มีสิทธิ์ในการแก้ไขข้อมูล', 403);
      }

      let body;
      try { body = await request.json(); } catch { return err('Invalid JSON body'); }

      // PUT update_room
      if (action === 'update_room') {
        const { room_id, number, type, status } = body;
        if (!room_id) return err('room_id is required');
        await sql`
          UPDATE rc_rooms 
          SET number = COALESCE(${number}, number), 
              type = COALESCE(${type}, type), 
              status = COALESCE(${status}, status), 
              updated_at = NOW()
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
          SET "desc" = ${desc}, category = ${category}, priority = ${priority},
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

      // DELETE ticket (repair history record)
      if (action === 'delete_ticket') {
        const ticketId = url.searchParams.get('ticket_id');
        if (!ticketId) return err('ticket_id is required');
        // Get ticket info for logging
        const ticketRes = await sql`SELECT t.*, r.number as room_number FROM rc_tickets t LEFT JOIN rc_rooms r ON t.room_id = r.id WHERE t.id = ${ticketId}`;
        if (ticketRes.length === 0) return err('Ticket not found', 404);
        const t = ticketRes[0];
        await sql`DELETE FROM rc_tickets WHERE id = ${ticketId}`;
        // Log deletion
        await sql`INSERT INTO rc_logs (branch_id, user_name, action, detail) VALUES (${t.branch_id || null}, ${userSession.name}, 'ลบประวัติการซ่อม', ${'ลบประวัติการซ่อม ' + (t.ticket_no || ticketId) + ' ห้อง ' + (t.room_number || '-') + ': ' + (t.desc || '-')})`;
        return ok({ message: 'Ticket deleted' });
      }

      // DELETE incident
      if (action === 'delete_incident') {
        const incidentId = url.searchParams.get('incident_id');
        if (!incidentId) return err('incident_id is required');
        const incRes = await sql`SELECT inc.*, r.number as room_number FROM rc_incidents inc LEFT JOIN rc_rooms r ON inc.room_id = r.id WHERE inc.id = ${incidentId}`;
        if (incRes.length === 0) return err('Incident not found', 404);
        const inc = incRes[0];
        await sql`DELETE FROM rc_incidents WHERE id = ${incidentId}`;
        // Log deletion
        await sql`INSERT INTO rc_logs (branch_id, user_name, action, detail) VALUES (${inc.branch_id || null}, ${userSession.name}, 'ลบบันทึกเหตุการณ์', ${'ลบบันทึกเหตุการณ์: ' + (inc.title || incidentId) + ' ห้อง ' + (inc.room_number || '-')})`;
        return ok({ message: 'Incident deleted' });
      }

      return err('Unknown action', 400);
    }

    return err('Method not allowed', 405);

  } catch (e) {
    console.error('RoomCare API Error:', e);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: e.message }), { status: 500 });
  }
}
