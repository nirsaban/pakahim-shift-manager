// Dead-head travel estimator.
//
// There is no timetable in the source data, so distance is measured in stops
// along the line graph transcribed from the ops booklet, then converted to
// minutes. Dijkstra over consecutive stops means a journey that changes lines
// (e.g. Jerusalem -> Tel Aviv -> Ashkelon) is costed through the interchange
// rather than written off as "no shared line".
//
// The single most important invariant: an unknown endpoint yields `null`, never
// 0. A 0 would make every unknown station look like a perfect swap.

import { TRAIN_LINES } from '../reference/lines';
import {
  TRAVEL_CROSS_LINE_MINUTES,
  TRAVEL_FIXED_OVERHEAD_MINUTES,
  TRAVEL_MINUTES_PER_STOP,
} from './config';

let adjacency: Map<string, Set<string>> | null = null;

/** Consecutive stops on any certain line are neighbours. Symmetric. */
function graph(): Map<string, Set<string>> {
  if (adjacency) return adjacency;

  const g = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!g.has(a)) g.set(a, new Set());
    if (!g.has(b)) g.set(b, new Set());
    g.get(a)!.add(b);
    g.get(b)!.add(a);
  };

  for (const line of TRAIN_LINES) {
    // Inferred lines are excluded: their stop list is a guess, and a guessed
    // distance would silently corrupt a swap recommendation.
    if (line.uncertain) continue;
    for (let i = 1; i < line.stops.length; i += 1) link(line.stops[i - 1], line.stops[i]);
  }

  adjacency = g;
  return g;
}

/** Shortest path in stops between two stations, or null if unreachable. */
export function stopsBetween(from: string, to: string): number | null {
  if (from === to) return 0;
  const g = graph();
  if (!g.has(from) || !g.has(to)) return null;

  // Unweighted edges, so BFS is already the shortest path.
  const seen = new Set<string>([from]);
  let frontier = [from];
  let depth = 0;

  while (frontier.length > 0) {
    depth += 1;
    const next: string[] = [];
    for (const node of frontier) {
      for (const neighbour of g.get(node) ?? []) {
        if (seen.has(neighbour)) continue;
        if (neighbour === to) return depth;
        seen.add(neighbour);
        next.push(neighbour);
      }
    }
    frontier = next;
  }

  return null;
}

/**
 * Minutes to travel between two stations as a passenger.
 * Returns null when either endpoint is unknown — callers must skip, not zero.
 */
export function estimateTravelMinutes(
  from: string | null | undefined,
  to: string | null | undefined,
): number | null {
  if (!from || !to) return null;
  if (from === to) return 0;

  const stops = stopsBetween(from, to);
  if (stops === null) return TRAVEL_CROSS_LINE_MINUTES;
  return TRAVEL_FIXED_OVERHEAD_MINUTES + stops * TRAVEL_MINUTES_PER_STOP;
}

/** Test seam — the graph is memoised across calls. */
export function resetTravelGraph(): void {
  adjacency = null;
}
