import React, { useMemo } from 'react';
import { LineLayer, ShapeSource } from '@rnmapbox/maps';
import type { MapThemeTokens } from '../../theme/mapTheme';
import type { LiveRoute, LngLat } from '../liveMapTypes';
import { isValidLngLat, nearestVertexIndex } from './mapCoordinates';

type Props = {
  id?: string;
  route: LiveRoute | null;
  theme: MapThemeTokens;
  /**
   * Optional live position of the vehicle. When the route has no explicit
   * `traveledCount`, this drives the completed / remaining split so route
   * progress tracks the ride without callers recomputing it.
   */
  progressAt?: LngLat | null;
};

/** Widths/opacities carried over from the retired WebView bridge. */
const ROUTE_WIDTH = 6;
const CASING_WIDTH = 9;

export type RouteSegments = {
  full: LngLat[];
  done: LngLat[];
  rest: LngLat[];
  hasSplit: boolean;
  hasRoute: boolean;
};

function lineFeature(coordinates: LngLat[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };
}

/** Split a route into completed and remaining halves, matching the WebView. */
export function buildRouteSegments(
  route: LiveRoute | null,
  progressAt?: LngLat | null
): RouteSegments {
  const coordinates = (route?.coordinates ?? []).filter(isValidLngLat);

  let traveled = route?.traveledCount;
  if (
    (typeof traveled !== 'number' || !Number.isFinite(traveled)) &&
    progressAt &&
    isValidLngLat(progressAt) &&
    coordinates.length >= 2
  ) {
    traveled = nearestVertexIndex(coordinates, progressAt);
  }

  const splitIndex =
    typeof traveled === 'number' && traveled > 0 && traveled < coordinates.length
      ? traveled
      : -1;
  const hasSplit = splitIndex >= 0;

  return {
    full: coordinates,
    done: hasSplit ? coordinates.slice(0, splitIndex + 1) : coordinates,
    rest: hasSplit ? coordinates.slice(splitIndex) : [],
    hasSplit,
    hasRoute: coordinates.length >= 2,
  };
}

export default function NativeMapRoutes({
  id = 'ematix',
  route,
  theme,
  progressAt,
}: Props) {
  const { full, done, rest, hasSplit, hasRoute } = useMemo(
    () => buildRouteSegments(route, progressAt),
    [route, progressAt]
  );

  if (!hasRoute) return null;

  return (
    <>
      <ShapeSource id={`${id}-route`} shape={lineFeature(full)}>
        <LineLayer
          id={`${id}-route-casing`}
          style={{
            lineColor: theme.routeCasing,
            lineWidth: CASING_WIDTH,
            lineOpacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <LineLayer
          id={`${id}-route-base`}
          style={{
            lineColor: theme.routeBase,
            lineWidth: ROUTE_WIDTH,
            lineOpacity: hasSplit ? 0.9 : 0,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      </ShapeSource>

      {done.length >= 2 ? (
        <ShapeSource id={`${id}-route-done`} shape={lineFeature(done)}>
          <LineLayer
            id={`${id}-route-done-layer`}
            style={{
              lineColor: theme.routeDone,
              lineWidth: ROUTE_WIDTH,
              lineOpacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </ShapeSource>
      ) : null}

      {rest.length >= 2 ? (
        <ShapeSource id={`${id}-route-rest`} shape={lineFeature(rest)}>
          <LineLayer
            id={`${id}-route-rest-layer`}
            style={{
              lineColor: theme.routeRest,
              lineWidth: ROUTE_WIDTH,
              lineOpacity: 0.5,
              lineDasharray: [1.4, 1.1],
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </ShapeSource>
      ) : null}
    </>
  );
}
