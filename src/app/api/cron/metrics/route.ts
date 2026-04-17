import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getIntervalBucket, MetricPayload } from '@/lib/metrics-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    
    // Security Defect Fix: Prevent "Bearer undefined" from validating successfully if CRON_SECRET is unconfigured
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const ts = getIntervalBucket(now);

    const intervalStart = new Date(ts);
    const intervalEnd = new Date(ts);
    intervalEnd.setMinutes(intervalEnd.getMinutes() + 29, 59, 999);

    const activeIncidents = await db.incident.count({
      where: { status: { notIn: ['CLOSED', 'RESOLVED'] } }
    });

    const activeVulns = await db.vulnerability.count({
      where: { status: { notIn: ['MITIGATED', 'RESOLVED'] } }
    });

    const slaBreached = await db.incident.count({
      where: { status: { notIn: ['CLOSED', 'RESOLVED'] }, targetSlaDate: { lt: now } }
    });

    // Resolved in this specific bucket
    const resolvedIncidentsDelta = await db.incident.count({
      where: { 
        status: { in: ['CLOSED', 'RESOLVED'] },
        updatedAt: { gte: intervalStart, lte: intervalEnd }
      }
    });

    const resolvedVulnsDelta = await db.vulnerability.count({
      where: { 
        status: { in: ['MITIGATED', 'RESOLVED'] },
        updatedAt: { gte: intervalStart, lte: intervalEnd }
      }
    });

    const payload: MetricPayload = {
      activeIncidents,
      activeVulns,
      slaBreached,
      resolvedIncidentsDelta,
      resolvedVulnsDelta
    };

    const snapshot = await db.metricSnapshot.upsert({
      where: {
        timestamp_scopeType_scopeId: {
          timestamp: ts,
          scopeType: 'GLOBAL',
          scopeId: 'ALL'
        }
      },
      update: { payload: JSON.stringify(payload) },
      create: {
        timestamp: ts,
        scopeType: 'GLOBAL',
        scopeId: 'ALL',
        payload: JSON.stringify(payload)
      }
    });

    return NextResponse.json({ success: true, timestamp: ts, stats: payload });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate metrics' }, { status: 500 });
  }
}
