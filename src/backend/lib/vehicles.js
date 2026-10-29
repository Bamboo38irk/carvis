import { VEHICLE_TYPE_TITLES } from './constants.js'

export const bumpOdometer = (client, vehicleId, odometer) =>
  client.query('UPDATE vehicles SET odometer = GREATEST(odometer, $2) WHERE id = $1', [
    vehicleId,
    odometer,
  ])

export function vehicleTitle({ make, model, vehicleType }) {
  const named = [make, model]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')

  return named || VEHICLE_TYPE_TITLES[vehicleType] || VEHICLE_TYPE_TITLES.car
}
