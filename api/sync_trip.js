// api/sync_trip.js
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
const { logSuccess, logError } = require("../lib/etl/utils");
const mg = require("mygeotab");

const BATCH = 500;

function durationToSeconds(value) {
  if (!value) return null;
  const str = String(value).trim();
  const parts = str.split(":");
  if (parts.length !== 3) return null;
  const [h, m, s] = parts.map(Number);
  return Math.round(h * 3600 + m * 60 + s);
}

async function getTripTimestamp() {
  const rows = await sql`
    SELECT last_timestamp
    FROM sync_state
    WHERE source='trip'
  `;
  if (rows.length === 0) {
    return new Date("2000-01-01T00:00:00Z").toISOString();
  }
  const ts = rows[0].last_timestamp;
  return ts instanceof Date ? ts.toISOString() : ts;
}

async function updateTripTimestamp(ts) {
  const iso = ts instanceof Date ? ts.toISOString() : ts;
  await sql`
    UPDATE sync_state
    SET last_timestamp = ${iso},
        updated_at = NOW()
    WHERE source='trip'
  `;
}

async function insertTripsBatch(batch) {
  if (!batch.length) return;

  for (const t of batch) {
    await sql`
      INSERT INTO geotab_trip (
        id, device_id, driver_id,
        start_time, end_time,
        distance_km, top_speed_kph,
        idle_time_seconds, moving_time_seconds, stop_time_seconds,
        start_location, end_location,
        average_speed_kph, maximum_speed_kph,
        driver_behavior_score, fuel_consumption_liters,
        working_time_seconds, driving_time_seconds,
        created_at
      ) VALUES (
        ${t.id}, ${t.device?.id || null}, ${t.driver?.id || null},
        ${t.start || null}, ${t.stop || null},
        ${t.distance ? Math.round(t.distance / 1000 * 100) / 100 : null},
        ${t.maximumSpeed ? Math.round(t.maximumSpeed * 3.6 * 100) / 100 : null},
        ${durationToSeconds(t.idleDuration)},
        ${durationToSeconds(t.drivingDuration)},
        ${durationToSeconds(t.stopDuration)},
        ST_SetSRID(ST_MakePoint(${t.start ? 0 : null}, ${t.start ? 0 : null}), 4326),
        ST_SetSRID(ST_MakePoint(${t.stop ? 0 : null}, ${t.stop ? 0 : null}), 4326),
        ${t.averageSpeed ? Math.round(t.averageSpeed * 3.6 * 100) / 100 : null},
        ${t.maximumSpeed ? Math.round(t.maximumSpeed * 3.6 * 100) / 100 : null},
        ${null}, ${null}, ${null}, ${durationToSeconds(t.drivingDuration)},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        device_id = EXCLUDED.device_id,
        driver_id = EXCLUDED.driver_id,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        distance_km = EXCLUDED.distance_km,
        top_speed_kph = EXCLUDED.top_speed_kph,
        idle_time_seconds = EXCLUDED.idle_time_seconds,
        moving_time_seconds = EXCLUDED.moving_time_seconds,
        stop_time_seconds = EXCLUDED.stop_time_seconds,
        start_location = EXCLUDED.start_location,
        end_location = EXCLUDED.end_location,
        average_speed_kph = EXCLUDED.average_speed_kph,
        maximum_speed_kph = EXCLUDED.maximum_speed_kph,
        driver_behavior_score = EXCLUDED.driver_behavior_score,
        fuel_consumption_liters = EXCLUDED.fuel_consumption_liters,
        working_time_seconds = EXCLUDED.working_time_seconds,
        driving_time_seconds = EXCLUDED.driving_time_seconds,
        created_at = NOW()
    `;
  }
}

module.exports = async (req, res) => {
  const start = Date.now();
  let loops = 0;
  let total = 0;
  let fromDate;

  try {
    const api = new mg.API(process.env.GEOTAB_USERNAME, process.env.GEOTAB_PASSWORD, process.env.GEOTAB_DATABASE);
    await api.authenticate();

    while (true) {
      loops++;

      fromDate = await getTripTimestamp();

      const batch = await api.call("Get", {
        typeName: "Trip",
        search: { fromDate },
        resultsLimit: BATCH
      });

      await insertTripsBatch(batch);

      let maxDate = null;
      for (const t of batch) {
        if (t.stop) {
          const d = new Date(t.stop);
          if (!maxDate || d > maxDate) maxDate = d;
        }
      }

      if (maxDate) await updateTripTimestamp(maxDate);

      total += batch.length;

      if (batch.length < BATCH) break;
      if (loops >= 50) break; // safety guard (50 batches)
    }

    const duration = Date.now() - start;

    await logSuccess({
      tripsProcessed: total,
      fromDate,
      toDate: null,
      duration,
      raw: { batchesExecuted: loops, totalInserted: total }
    });

    res.status(200).json({
      status: "ok",
      batchesExecuted: loops,
      totalInserted: total
    });

  } catch (err) {
    console.error("sync_trip error:", err);
    const duration = Date.now() - start;
    await logError({
      error: String(err),
      fromDate,
      duration,
      raw: { message: err.message, stack: err.stack, batchesExecuted: loops, totalInserted: total }
    });
    res.status(500).json({ error: String(err) });
  }
};


