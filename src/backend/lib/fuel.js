export function buildFuelSegments(fills) {
  const usable = fills
    .filter((fill) => fill.odometer !== null && fill.liters !== null)
    .sort((a, b) => a.odometer - b.odometer)

  const segments = []
  let anchor = null
  let litersSinceAnchor = 0
  let costSinceAnchor = 0

  for (const fill of usable) {
    if (!anchor) {
      if (fill.is_full_tank) anchor = fill
      continue
    }

    litersSinceAnchor += Number(fill.liters)
    costSinceAnchor += Number(fill.amount ?? 0)

    if (!fill.is_full_tank) continue

    const distance = fill.odometer - anchor.odometer
    if (distance > 0 && litersSinceAnchor > 0) {
      segments.push({
        from: { date: anchor.spent_at, odometer: anchor.odometer },
        to: { date: fill.spent_at, odometer: fill.odometer },
        distance,
        liters: Math.round(litersSinceAnchor * 100) / 100,
        consumption: Math.round((litersSinceAnchor / distance) * 100 * 100) / 100,
        cost: Math.round(costSinceAnchor * 100) / 100,
      })
    }

    anchor = fill
    litersSinceAnchor = 0
    costSinceAnchor = 0
  }

  return segments
}

export function reviewFuel(fills, segments) {
  return {
    ignoredFills: fills.filter((fill) => fill.liters !== null && fill.odometer === null).length,
    partialOnly:
      segments.length === 0 && fills.length > 1 && fills.every((fill) => !fill.is_full_tank),
  }
}

export function summarizeFuel(segments) {
  if (segments.length === 0) {
    return { segments: [], average: null, best: null, worst: null, distance: 0, liters: 0 }
  }

  const distance = segments.reduce((sum, segment) => sum + segment.distance, 0)
  const liters = segments.reduce((sum, segment) => sum + segment.liters, 0)
  const sorted = [...segments].sort((a, b) => a.consumption - b.consumption)

  return {
    segments,
    average: Math.round((liters / distance) * 100 * 100) / 100,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    distance,
    liters: Math.round(liters * 100) / 100,
  }
}
