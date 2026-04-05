import React from "react";
import MapView, { Callout, Marker, Polyline } from "react-native-maps";

export function AppMapView({ children, style, initialRegion, showsUserLocation, mapRef }: any) {
  return (
    <MapView
      ref={mapRef}
      style={style}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsCompass
      showsScale
    >
      {children}
    </MapView>
  );
}

export function AppMarker({ coordinate, pinColor, children, anchor }: any) {
  return (
    <Marker coordinate={coordinate} pinColor={pinColor} anchor={anchor}>
      {children}
    </Marker>
  );
}

export function AppCallout({ children }: any) {
  return <Callout>{children}</Callout>;
}

export function AppPolyline({ coordinates, strokeColor, strokeWidth, lineDashPattern }: any) {
  if (!coordinates || coordinates.length < 2) return null;
  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={strokeColor || "#e8531d"}
      strokeWidth={strokeWidth || 4}
      lineDashPattern={lineDashPattern}
    />
  );
}
