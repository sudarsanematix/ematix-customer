import {
  CHENNAI_REGION,
  LIVE_MAP_STYLE,
  VEHICLE_COLORS_DARK,
  VEHICLE_COLORS_LIGHT,
  type LivePin,
  type LiveRoute,
  type LiveVehicle,
  type LngLat,
  type MapRegion,
} from './liveMapTypes';
import { buildMapTheme, type MapThemeTokens } from '../theme/mapTheme';

/** Bumped whenever the WebView <-> host command protocol changes. */
export const LIVE_MAP_PROTOCOL = 2;

const MAPBOX_VERSION = '3.1.2';

export type LiveMapBootstrap = {
  accessToken: string;
  style: string;
  center: LngLat;
  zoom: number;
  interactive: boolean;
  padding: number;
  route: LiveRoute | null;
  pins: LivePin[];
  vehicle: LiveVehicle | null;
  follow: boolean;
  /** Theme tokens for the document, the route palette and the markers. */
  theme: MapThemeTokens;
};

const RUNTIME = String.raw`
(function () {
  var CFG = __EMATIX_CONFIG__;
  var PROTOCOL = __EMATIX_PROTOCOL__;
  var VEHICLE_COLORS = __EMATIX_VEHICLE_COLORS__;
  var VEHICLE_COLORS_DARK = __EMATIX_VEHICLE_COLORS_DARK__;

  var THEME = CFG.theme;

  var ROUTE_WIDTHS = {
    casing: 9,
    base: 6,
    done: 6,
    rest: 6
  };

  var ROUTE_OPACITIES = {
    casing: 0.95,
    base: 0.9,
    done: 1,
    rest: 0.5
  };

  // Rebuilt from THEME on every theme change so the layer paint always reads
  // the live palette rather than the one baked into the document.
  var ROUTE = buildRoutePalette(THEME);

  var ready = false;
  var queue = [];
  var map = null;
  var currentRoute = null;
  var currentPins = [];
  var pinMarkers = {};
  var vehicleMarker = null;
  var vehicleEl = null;
  var vehicleBody = null;
  var vehicleKind = null;
  var suppressAnim = false;
  var following = false;
  var bearingValue = 0;
  var bearingKnown = false;

  function buildRoutePalette(theme) {
    return {
      casing: { color: theme.routeCasing, width: ROUTE_WIDTHS.casing, opacity: ROUTE_OPACITIES.casing },
      base: { color: theme.routeBase, width: ROUTE_WIDTHS.base, opacity: ROUTE_OPACITIES.base },
      done: { color: theme.routeDone, width: ROUTE_WIDTHS.done, opacity: ROUTE_OPACITIES.done },
      rest: { color: theme.routeRest, width: ROUTE_WIDTHS.rest, opacity: ROUTE_OPACITIES.rest }
    };
  }

  // Every themed CSS value lives in a custom property on :root, so a theme
  // switch is a handful of setProperty calls instead of a document reload.
  function applyThemeVars(theme) {
    var root = document.documentElement;
    if (!root || !root.style || !root.style.setProperty) return;
    root.style.setProperty('--ematix-base', theme.base);
    root.style.setProperty('--ematix-on-base', theme.onBase);
    root.style.setProperty('--ematix-shadow', theme.shadow);
    root.style.setProperty('--ematix-attribution', theme.attributionFg);
  }

  function vehicleColorFor(kind) {
    var table = THEME.isDark ? VEHICLE_COLORS_DARK : VEHICLE_COLORS;
    var resolved = kind || 'bike';
    return table[resolved] || table.bike;
  }

  function paintVehicleColor() {
    if (!vehicleBody) return;
    vehicleBody.style.background = vehicleColorFor(vehicleKind);
  }

  function postEvent(event, payload) {
    var envelope = JSON.stringify({
      source: 'ematix-live-map',
      protocol: PROTOCOL,
      event: event,
      payload: payload || {}
    });
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(envelope);
        return;
      }
    } catch (nativeError) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(envelope, '*');
      }
    } catch (webError) {}
  }

  function emptyFeature() {
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [] }
    };
  }

  function lineFeature(coordinates) {
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coordinates || [] }
    };
  }

  function isValidPair(value) {
    return (
      Array.isArray(value) &&
      value.length === 2 &&
      isFinite(value[0]) &&
      isFinite(value[1])
    );
  }

  function setData(sourceId, data) {
    if (!map) return;
    var source = map.getSource(sourceId);
    if (source && typeof source.setData === 'function') source.setData(data);
  }

  function setPaint(layerId, property, value) {
    if (!map) return;
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value);
  }

  function setSuppress(value) {
    suppressAnim = !!value;
    if (vehicleEl) vehicleEl.classList.toggle('ematix-vehicle--no-anim', suppressAnim);
  }

  function pinElement(color, variant) {
    var element = document.createElement('div');
    var shape = variant === 'end' ? 'end' : 'dot';
    element.className = 'ematix-pin ematix-pin--' + shape;
    element.innerHTML =
      '<span class="ematix-pin__body" style="background:' + color + ';color:' + color + '">' +
      '<i class="ematix-pin__core"></i>' +
      '</span>';
    return element;
  }

  function vehicleElement(kind) {
    var element = document.createElement('div');
    element.className = 'ematix-vehicle';
    element.innerHTML =
      '<span class="ematix-vehicle__body" style="background:' +
      vehicleColorFor(kind) +
      '">' +
      '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">' +
      '<path class="ematix-vehicle__arrow" d="M12 3.4 L18.2 18.6 L12 15.1 L5.8 18.6 Z" />' +
      '</svg>' +
      '</span>';
    return element;
  }

  function rotateVehicle(bearing) {
    if (!vehicleBody) return;
    if (!bearingKnown) {
      bearingValue = bearing;
      bearingKnown = true;
    } else {
      var delta = ((bearing - bearingValue + 540) % 360) - 180;
      bearingValue = bearingValue + delta;
    }
    vehicleBody.style.transform = 'rotate(' + bearingValue.toFixed(1) + 'deg)';
  }

  function easeTo(point, duration) {
    if (!map || !isValidPair(point)) return;
    map.easeTo({
      center: [point[0], point[1]],
      duration: typeof duration === 'number' ? duration : 700,
      essential: true
    });
  }

  // Repaints the four route layers in place. Safe to call before or after
  // map.setStyle, so a theme switch can reuse it for the paint-only half.
  function syncRoutePaint() {
    if (!map) return;
    setPaint('ematix-route-casing', 'line-color', ROUTE.casing.color);
    setPaint('ematix-route-base', 'line-color', ROUTE.base.color);
    setPaint('ematix-route-done', 'line-color', ROUTE.done.color);
    setPaint('ematix-route-rest', 'line-color', ROUTE.rest.color);
  }

  function ensureRouteLayers() {
    if (!map || map.getSource('ematix-route')) return;

    map.addSource('ematix-route', { type: 'geojson', data: emptyFeature() });
    map.addSource('ematix-route-done', { type: 'geojson', data: emptyFeature() });
    map.addSource('ematix-route-rest', { type: 'geojson', data: emptyFeature() });

    map.addLayer({
      id: 'ematix-route-casing',
      type: 'line',
      source: 'ematix-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROUTE.casing.color,
        'line-width': ROUTE.casing.width,
        'line-opacity': ROUTE.casing.opacity
      }
    });

    map.addLayer({
      id: 'ematix-route-base',
      type: 'line',
      source: 'ematix-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROUTE.base.color,
        'line-width': ROUTE.base.width,
        'line-opacity': 0
      }
    });

    map.addLayer({
      id: 'ematix-route-done',
      type: 'line',
      source: 'ematix-route-done',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROUTE.done.color,
        'line-width': ROUTE.done.width,
        'line-opacity': 0
      }
    });

    map.addLayer({
      id: 'ematix-route-rest',
      type: 'line',
      source: 'ematix-route-rest',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROUTE.rest.color,
        'line-width': ROUTE.rest.width,
        'line-opacity': 0,
        'line-dasharray': [1.4, 1.1]
      }
    });
  }

  function applyRoute(route) {
    currentRoute = route || null;
    if (!map) return;
    ensureRouteLayers();

    var coordinates = (currentRoute && currentRoute.coordinates) || [];
    if (coordinates.length < 2) {
      setData('ematix-route', emptyFeature());
      setData('ematix-route-done', emptyFeature());
      setData('ematix-route-rest', emptyFeature());
      setPaint('ematix-route-casing', 'line-opacity', 0);
      setPaint('ematix-route-base', 'line-opacity', 0);
      setPaint('ematix-route-done', 'line-opacity', 0);
      setPaint('ematix-route-rest', 'line-opacity', 0);
      return;
    }

    setData('ematix-route', lineFeature(coordinates));
    setPaint('ematix-route-casing', 'line-opacity', ROUTE.casing.opacity);

    var traveled = currentRoute.traveledCount;
    var split =
      typeof traveled === 'number' &&
      traveled > 0 &&
      traveled < coordinates.length;

    if (!split) {
      setData('ematix-route-done', lineFeature(coordinates));
      setData('ematix-route-rest', emptyFeature());
      setPaint('ematix-route-base', 'line-opacity', 0);
      setPaint('ematix-route-done', 'line-opacity', ROUTE.done.opacity);
      setPaint('ematix-route-rest', 'line-opacity', 0);
      return;
    }

    setData('ematix-route-done', lineFeature(coordinates.slice(0, traveled + 1)));
    setData('ematix-route-rest', lineFeature(coordinates.slice(traveled)));
    setPaint('ematix-route-base', 'line-opacity', ROUTE.base.opacity);
    setPaint('ematix-route-done', 'line-opacity', ROUTE.done.opacity);
    setPaint('ematix-route-rest', 'line-opacity', ROUTE.rest.opacity);
  }

  function applyPins(pins) {
    var next = Array.isArray(pins) ? pins : [];
    currentPins = next;
    if (!map) return;

    var seen = {};
    next.forEach(function (pin) {
      if (!pin || !pin.id || !isValidPair(pin.lngLat)) return;
      seen[pin.id] = true;
      var shape = pin.variant === 'end' ? 'end' : 'dot';
      var existing = pinMarkers[pin.id];

      // A changed shape needs a fresh element, so rebuild rather than patch.
      if (existing && existing.variant !== shape) {
        existing.marker.remove();
        delete pinMarkers[pin.id];
        existing = null;
      }

      if (existing) {
        existing.marker.setLngLat(pin.lngLat);
        if (pin.color) {
          var body = existing.el.querySelector('.ematix-pin__body');
          if (body) {
            body.style.background = pin.color;
            body.style.color = pin.color;
          }
        }
        return;
      }
      var element = pinElement(pin.color || THEME.routeDone, pin.variant);
      var anchor = pin.variant === 'end' ? 'bottom' : 'center';
      var marker = new mapboxgl.Marker({ element: element, anchor: anchor });
      marker.setLngLat(pin.lngLat);
      marker.addTo(map);
      pinMarkers[pin.id] = { marker: marker, el: element, variant: shape };
    });

    Object.keys(pinMarkers).forEach(function (id) {
      if (seen[id]) return;
      pinMarkers[id].marker.remove();
      delete pinMarkers[id];
    });
  }

  function clearVehicle() {
    if (vehicleMarker) vehicleMarker.remove();
    vehicleMarker = null;
    vehicleEl = null;
    vehicleBody = null;
    vehicleKind = null;
    bearingKnown = false;
  }

  function applyVehicle(vehicle) {
    if (!map) return;
    if (!vehicle || !isValidPair(vehicle.lngLat)) {
      clearVehicle();
      return;
    }

    var kind = vehicle.kind || 'bike';
    var kindChanged = vehicleKind !== kind;
    vehicleKind = kind;

    if (!vehicleMarker) {
      vehicleEl = vehicleElement(kind);
      vehicleBody = vehicleEl.querySelector('.ematix-vehicle__body');
      vehicleMarker = new mapboxgl.Marker({ element: vehicleEl, anchor: 'center' });
      vehicleMarker.setLngLat(vehicle.lngLat);
      vehicleMarker.addTo(map);
      bearingKnown = false;
    } else if (kindChanged) {
      paintVehicleColor();
    }

    if (suppressAnim) vehicleEl.classList.add('ematix-vehicle--no-anim');

    var previous = vehicleMarker.getLngLat();
    var teleported =
      Math.abs(previous.lng - vehicle.lngLat[0]) +
        Math.abs(previous.lat - vehicle.lngLat[1]) >
      0.5;
    if (teleported) setSuppress(true);

    vehicleMarker.setLngLat(vehicle.lngLat);

    if (typeof vehicle.bearing === 'number' && isFinite(vehicle.bearing)) {
      rotateVehicle(vehicle.bearing);
    }
    if (following) easeTo(vehicle.lngLat, 900);
    if (teleported) window.setTimeout(function () { setSuppress(false); }, 60);
  }

  function collectPoints() {
    var points = [];
    var coordinates = (currentRoute && currentRoute.coordinates) || [];
    coordinates.forEach(function (pair) {
      if (isValidPair(pair)) points.push(pair);
    });
    currentPins.forEach(function (pin) {
      if (pin && isValidPair(pin.lngLat)) points.push(pin.lngLat);
    });
    if (vehicleMarker) {
      var position = vehicleMarker.getLngLat();
      points.push([position.lng, position.lat]);
    }
    return points;
  }

  function fitAll(options) {
    if (!map) return;
    var points = collectPoints();
    if (!points.length) return;
    var opts = options || {};
    if (points.length === 1) {
      map.setZoom(typeof opts.zoom === 'number' ? opts.zoom : 15);
      easeTo(points[0], typeof opts.duration === 'number' ? opts.duration : 700);
      return;
    }
    var bounds = new mapboxgl.LngLatBounds(points[0], points[0]);
    for (var i = 1; i < points.length; i += 1) bounds.extend(points[i]);
    map.fitBounds(bounds, {
      padding: typeof opts.padding === 'number' ? opts.padding : CFG.padding,
      duration: typeof opts.duration === 'number' ? opts.duration : 700,
      maxZoom: 16.5,
      essential: true
    });
  }

  var impl = {
    setRoute: function (route) { applyRoute(route); },
    setPins: function (pins) { applyPins(pins); },
    setVehicle: function (vehicle) { applyVehicle(vehicle); },
    setFollow: function (value) {
      following = !!value;
      if (following && vehicleMarker) {
        var position = vehicleMarker.getLngLat();
        easeTo([position.lng, position.lat], 700);
      }
    },
    focusVehicle: function () {
      following = true;
      if (map && vehicleMarker) {
        var position = vehicleMarker.getLngLat();
        map.setZoom(15);
        easeTo([position.lng, position.lat], 700);
      }
    },
    flyTo: function (target) {
      if (!map || !target) return;
      var options = { essential: true };
      if (isValidPair(target.lngLat)) options.center = target.lngLat;
      if (typeof target.zoom === 'number') options.zoom = target.zoom;
      if (typeof target.bearing === 'number') options.bearing = target.bearing;
      if (typeof target.pitch === 'number') options.pitch = target.pitch;
      options.duration = typeof target.duration === 'number' ? target.duration : 800;
      if (typeof options.center === 'undefined' && typeof options.zoom === 'undefined') return;
      map.flyTo(options);
    },
    fitAll: function (options) { fitAll(options); },
    setPadding: function (value) {
      if (typeof value === 'number' && isFinite(value)) CFG.padding = value;
    },
    setTheme: function (next) {
      if (!next || typeof next !== 'object' || !next.styleUrl) return;
      var previous = THEME;
      var styleChanged = next.styleUrl !== previous.styleUrl;
      var darkChanged = !!next.isDark !== !!previous.isDark;

      THEME = next;
      CFG.theme = next;
      applyThemeVars(next);
      ROUTE = buildRoutePalette(next);

      if (!map) return;

      // Markers live in the DOM, so they survive setStyle. The geojson sources
      // and line layers do not, which is why style.load re-adds them below.
      if (darkChanged) paintVehicleColor();
      applyPins(currentPins);
      syncRoutePaint();

      if (styleChanged) {
        map.setStyle(next.styleUrl);
      } else {
        applyRoute(currentRoute);
      }
    }
  };

  var api = {};
  Object.keys(impl).forEach(function (name) {
    api[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      if (!ready) {
        queue.push([name, args]);
        return;
      }
      try {
        impl[name].apply(null, args);
      } catch (error) {
        postEvent('error', { command: name, message: String(error) });
      }
    };
  });
  window.__EMATIX_LIVE_MAP__ = api;

  window.addEventListener('message', function (event) {
    var data = event && event.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        return;
      }
    }
    if (!data || data.source !== 'ematix-live-map-host') return;
    if (!data.command || typeof api[data.command] !== 'function') return;
    api[data.command].apply(null, data.args || []);
  });

  if (typeof mapboxgl === 'undefined') {
    postEvent('error', { message: 'mapbox-gl failed to load' });
    return;
  }

  mapboxgl.accessToken = CFG.accessToken || '';

  applyThemeVars(THEME);

  try {
    map = new mapboxgl.Map({
      container: 'map',
      style: CFG.style,
      center: CFG.center,
      zoom: CFG.zoom,
      interactive: CFG.interactive,
      bearing: 0,
      pitch: 0,
      attributionControl: true
    });
  } catch (bootError) {
    postEvent('error', { message: String(bootError) });
    return;
  }

  window.__EMATIX_MAP__ = map;

  map.on('error', function (event) {
    var error = event && event.error;
    postEvent('error', { message: String((error && error.message) || error || 'map error') });
  });

  map.on('click', function (event) {
    postEvent('press', { lngLat: [event.lngLat.lng, event.lngLat.lat] });
  });

  function stopFollowing() {
    if (!following) return;
    following = false;
    postEvent('userMoved', {});
  }

  map.on('dragstart', function () {
    setSuppress(true);
    stopFollowing();
  });
  map.on('dragend', function () { setSuppress(false); });
  map.on('rotatestart', stopFollowing);
  map.on('zoomstart', function () { setSuppress(true); });
  map.on('zoomend', function () { setSuppress(false); });

  // First paint: seeds from the bootstrap baked into the document.
  function seedFromConfig() {
    try {
      ensureRouteLayers();
      following = !!CFG.follow;
      applyRoute(CFG.route);
      applyPins(CFG.pins);
      applyVehicle(CFG.vehicle);
    } catch (seedError) {
      postEvent('error', { message: String(seedError) });
    }
  }

  // Re-paint after map.setStyle tore the custom sources and layers down.
  // Reads the live currentRoute, not CFG.route, so an in-flight ride keeps the
  // route it had reached rather than snapping back to the initial one.
  function repaintAfterStyleSwap() {
    if (!map) return;
    try {
      ensureRouteLayers();
      syncRoutePaint();
      applyRoute(currentRoute);
    } catch (repaintError) {
      postEvent('error', { message: String(repaintError) });
    }
  }

  map.on('load', function () {
    seedFromConfig();

    ready = true;
    while (queue.length) {
      var pending = queue.shift();
      try {
        impl[pending[0]].apply(null, pending[1]);
      } catch (error) {
        postEvent('error', { command: pending[0], message: String(error) });
      }
    }
    postEvent('ready', {});
  });

  // setStyle drops every non-base-style layer, so the route has to be rebuilt.
  // style.load rather than styledata, which fires per-tile.
  map.on('style.load', function () {
    repaintAfterStyleSwap();
  });
})();
`;

const STYLES = `
  /* Seeded from the theme at build time, then rewritten in place by the
     setTheme command so a theme switch never reloads the document. */
  :root {
    --ematix-base: __EMATIX_CSS_BASE__;
    --ematix-on-base: __EMATIX_CSS_ON_BASE__;
    --ematix-shadow: __EMATIX_CSS_SHADOW__;
    --ematix-attribution: __EMATIX_CSS_ATTRIBUTION__;
  }
  html, body { margin: 0; padding: 0; background: var(--ematix-base); }
  #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  .mapboxgl-canvas { outline: none; }
  .mapboxgl-ctrl-attrib { font-size: 9px; opacity: 0.85; color: var(--ematix-attribution); }
  .mapboxgl-ctrl-attrib a { color: var(--ematix-attribution); }
  .mapboxgl-ctrl-attrib-button { display: none; }
  .ematix-pin { width: 24px; height: 28px; }
  .ematix-pin__body {
    position: absolute; left: 50%; top: 50%;
    display: block;
  }
  .ematix-pin--dot .ematix-pin__body {
    width: 15px; height: 15px; margin: -7.5px 0 0 -7.5px;
    border-radius: 50%;
    box-shadow: 0 0 0 3px var(--ematix-on-base), 0 2px 6px var(--ematix-shadow);
  }
  .ematix-pin--dot .ematix-pin__body::after {
    content: ''; position: absolute;
    top: -9px; right: -9px; bottom: -9px; left: -9px;
    border-radius: 50%; background: currentColor; opacity: 0.22;
    animation: ematix-pulse 1.9s ease-out infinite;
  }
  .ematix-pin--end .ematix-pin__body {
    width: 17px; height: 17px; margin: -13px 0 0 -8.5px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 6px var(--ematix-shadow);
  }
  .ematix-pin__core {
    position: absolute; left: 50%; top: 50%;
    width: 6px; height: 6px; margin: -3px 0 0 -3px;
    border-radius: 50%; background: var(--ematix-on-base); display: none;
  }
  .ematix-pin--end .ematix-pin__core { display: block; }
  .ematix-vehicle {
    width: 42px; height: 42px;
    transition: transform 1100ms linear;
    will-change: transform;
  }
  .ematix-vehicle--no-anim { transition: none !important; }
  .ematix-vehicle__body {
    position: absolute; left: 50%; top: 50%;
    width: 36px; height: 36px; margin: -18px 0 0 -18px;
    border-radius: 50%;
    border: 3px solid var(--ematix-on-base);
    box-shadow: 0 3px 10px var(--ematix-shadow);
    display: flex; align-items: center; justify-content: center;
    transition: transform 420ms ease-out, background-color 300ms linear;
  }
  .ematix-vehicle__arrow { fill: var(--ematix-on-base); }
  @keyframes ematix-pulse {
    0% { transform: scale(0.7); opacity: 0.32; }
    70% { transform: scale(1.9); opacity: 0; }
    100% { transform: scale(1.9); opacity: 0; }
  }
`;

export function buildLiveMapHtml(bootstrap: LiveMapBootstrap): string {
  const theme = bootstrap.theme ?? buildMapTheme(false);

  const config: LiveMapBootstrap = {
    accessToken: bootstrap.accessToken ?? '',
    style: bootstrap.style || theme.styleUrl || LIVE_MAP_STYLE,
    center: bootstrap.center ?? [CHENNAI_REGION.longitude, CHENNAI_REGION.latitude],
    zoom: bootstrap.zoom ?? 13,
    interactive: bootstrap.interactive ?? false,
    padding: bootstrap.padding ?? 72,
    route: bootstrap.route ?? null,
    pins: bootstrap.pins ?? [],
    vehicle: bootstrap.vehicle ?? null,
    follow: bootstrap.follow ?? false,
    theme,
  };

  const runtime = RUNTIME
    .replace('__EMATIX_CONFIG__', JSON.stringify(config))
    .replace('__EMATIX_PROTOCOL__', String(LIVE_MAP_PROTOCOL))
    .replace('__EMATIX_VEHICLE_COLORS__', JSON.stringify(VEHICLE_COLORS_LIGHT))
    .replace('__EMATIX_VEHICLE_COLORS_DARK__', JSON.stringify(VEHICLE_COLORS_DARK));

  const styles = STYLES
    .replace('__EMATIX_CSS_BASE__', theme.base)
    .replace('__EMATIX_CSS_ON_BASE__', theme.onBase)
    .replace('__EMATIX_CSS_SHADOW__', theme.shadow)
    .replace('__EMATIX_CSS_ATTRIBUTION__', theme.attributionFg);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<link href="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_VERSION}/mapbox-gl.js"></script>
<style>${styles}</style>
</head>
<body>
<div id="map"></div>
<script>${runtime}</script>
</body>
</html>`;
}

export type { LiveMapBootstrap as LiveMapHtmlConfig };
export type { MapRegion, LngLat };
