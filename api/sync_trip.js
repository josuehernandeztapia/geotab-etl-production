// api/sync_trip.js
const { logSuccess, logError } = require("../lib/etl/utils");
const tripBatch = require("./trip_batch");

module.exports = async (req, res) => {
  const start = Date.now();
  let loops = 0;
  let total = 0;

  try {
    while (true) {
      loops++;

      // Create mock response object to capture trip_batch response
      let batchResult = null;
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            if (code === 200) {
              batchResult = data;
            } else {
              throw new Error(`Trip batch failed: ${JSON.stringify(data)}`);
            }
          }
        }),
        json: (data) => {
          batchResult = data;
        }
      };

      // Call trip_batch handler directly
      await tripBatch(req, mockRes);

      if (!batchResult) {
        throw new Error("No result from trip_batch");
      }

      total += batchResult.processed;

      // Break if no more data to process
      if (!batchResult.hasMore || batchResult.processed === 0) break;

      // Safety guard (50 batches maximum)
      if (loops >= 50) break;
    }

    const duration = Date.now() - start;

    await logSuccess({
      tripsProcessed: total,
      fromDate: null,
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
      fromDate: null,
      duration,
      raw: { message: err.message, stack: err.stack, batchesExecuted: loops, totalInserted: total }
    });
    res.status(500).json({ error: String(err) });
  }
};


