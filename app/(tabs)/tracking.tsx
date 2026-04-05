import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import {
  AppCallout,
  AppMapView,
  AppMarker,
  AppPolyline,
} from "@/components/MapWrapper";
import type { DriverTrip } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type AdminTab = "live" | "history";

const AMMAN_REGION = {
  latitude: 31.9539,
  longitude: 35.9106,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} د`;
  return `${Math.floor(minutes / 60)}س ${minutes % 60}د`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SA", { weekday: "short", month: "short", day: "numeric" });
}

export default function TrackingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    currentUser, vans, driverLocations, customers,
    updateDriverLocation, driverTrips,
    startTrip, endTrip, addRoutePoint,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";
  const vanId = currentUser?.vanId || "";
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [trackingActive, setTrackingActive] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("live");
  const [selectedVanId, setSelectedVanId] = useState<string | null>(null);
  const locationSubRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  // الرحلة النشطة للمندوب
  const activeTrip = (driverTrips || []).find((t) => t.vanId === vanId && t.isActive);
  const todayStr = new Date().toISOString().split("T")[0];

  // رحلات اليوم للمدير
  const todayTrips = (driverTrips || []).filter((t) => t.date === todayStr);
  const historyTrips = [...(driverTrips || [])].reverse();

  // الرحلة المختارة (للمدير أو المندوب)
  const displayTrip: DriverTrip | undefined = isAdmin
    ? (driverTrips || []).find((t) => t.vanId === selectedVanId && t.isActive) ||
      todayTrips.find((t) => t.vanId === selectedVanId)
    : activeTrip;

  // مسار الخريطة
  const routeCoords = (displayTrip?.points || []).map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  const displayLocations = isAdmin
    ? driverLocations
    : driverLocations.filter((l) => l.vanId === vanId);

  const displayCustomers = isAdmin
    ? customers.filter((c) => c.lat)
    : customers.filter((c) => c.lat && c.vanId === vanId);

  const getTimeDiff = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} دقيقة`;
    return `منذ ${Math.floor(mins / 60)} ساعة`;
  };

  const startTracking = async () => {
    if (Platform.OS === "web") {
      Alert.alert("تنبيه", "تتبع GPS غير متاح على الويب");
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("خطأ", "لا يوجد إذن للوصول للموقع");
      return;
    }

    // بدء رحلة جديدة
    startTrip(vanId, currentUser?.name || "");
    setTrackingActive(true);

    locationSubRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 60000, distanceInterval: 50 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        if (vanId) {
          updateDriverLocation({
            vanId,
            lat: latitude,
            lng: longitude,
            driverName: currentUser?.name || "",
          });
          addRoutePoint(vanId, latitude, longitude);
        }
      }
    );

    Alert.alert("بدأت الرحلة", "يتم الآن حساب الكيلومترات وتسجيل مسار الرحلة");
  };

  const stopTracking = () => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    endTrip(vanId);
    setTrackingActive(false);
    Alert.alert(
      "انتهت الرحلة",
      `المسافة المقطوعة: ${(activeTrip?.distanceKm || 0).toFixed(1)} كم\nعدد التوقفات: ${activeTrip?.stops.length || 0}`
    );
  };

  useEffect(() => {
    return () => { locationSubRef.current?.remove(); };
  }, []);

  // إحصائيات المندوب
  const myTripStats = {
    km: activeTrip?.distanceKm.toFixed(1) || "0.0",
    stops: activeTrip?.stops.length || 0,
    points: activeTrip?.points.length || 0,
    startTime: activeTrip?.startTime ? formatTime(activeTrip.startTime) : "--:--",
  };

  // إحصائيات المدير لكل فان
  const getVanTripStats = (vid: string) => {
    const trip = todayTrips.find((t) => t.vanId === vid);
    return {
      km: (trip?.distanceKm || 0).toFixed(1),
      stops: trip?.stops.length || 0,
      isActive: trip?.isActive || false,
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="تتبع الرحلات"
        subtitle={isAdmin ? `${driverLocations.length} مندوب نشط` : undefined}
      />

      {/* تبويبات المدير */}
      {isAdmin && (
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setAdminTab("live")}
            style={[styles.tab, adminTab === "live" && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
          >
            <Feather name="radio" size={15} color={adminTab === "live" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: adminTab === "live" ? colors.primary : colors.mutedForeground }]}>
              مباشر
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAdminTab("history")}
            style={[styles.tab, adminTab === "history" && { borderBottomWidth: 2, borderBottomColor: "#8b5cf6" }]}
          >
            <Feather name="clock" size={15} color={adminTab === "history" ? "#8b5cf6" : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: adminTab === "history" ? "#8b5cf6" : colors.mutedForeground }]}>
              سجل الرحلات
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* الخريطة */}
      <AppMapView
        mapRef={mapRef}
        style={styles.map}
        initialRegion={AMMAN_REGION}
        showsUserLocation
      >
        {/* مسار الرحلة */}
        {routeCoords.length > 1 && (
          <AppPolyline
            coordinates={routeCoords}
            strokeColor="#e8531d"
            strokeWidth={4}
          />
        )}

        {/* نقاط التوقف */}
        {(displayTrip?.stops || []).map((stop, idx) => (
          <AppMarker
            key={`stop-${idx}`}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            pinColor="#f59e0b"
          >
            <AppCallout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>توقف #{idx + 1}</Text>
                <Text style={styles.calloutSub}>
                  {formatTime(stop.arrivalTime)} — {formatDuration(stop.durationMinutes)}
                </Text>
              </View>
            </AppCallout>
          </AppMarker>
        ))}

        {/* مواقع المندوبين */}
        {displayLocations.map((loc) => (
          <AppMarker
            key={loc.vanId}
            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
            pinColor={colors.primary}
          >
            <AppCallout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{loc.driverName}</Text>
                <Text style={styles.calloutSub}>{getTimeDiff(loc.timestamp)}</Text>
                {(() => {
                  const stats = getVanTripStats(loc.vanId);
                  return (
                    <Text style={styles.calloutSub}>{stats.km} كم • {stats.stops} توقف</Text>
                  );
                })()}
              </View>
            </AppCallout>
          </AppMarker>
        ))}

        {/* مواقع العملاء */}
        {displayCustomers.map((c) => (
          <AppMarker
            key={c.id}
            coordinate={{ latitude: c.lat!, longitude: c.lng! }}
            pinColor="#0891b2"
          >
            <AppCallout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{c.name}</Text>
                <Text style={styles.calloutSub}>{c.phone}</Text>
              </View>
            </AppCallout>
          </AppMarker>
        ))}
      </AppMapView>

      {/* اللوحة السفلية */}
      <View style={[styles.panel, { backgroundColor: colors.background }]}>

        {/* ══════ عرض المندوب ══════ */}
        {!isAdmin && (
          <>
            {/* بطاقة الرحلة */}
            <View style={styles.tripStatsRow}>
              <View style={[styles.tripStat, { backgroundColor: "#e8531d18" }]}>
                <Feather name="map" size={18} color="#e8531d" />
                <Text style={[styles.tripStatVal, { color: "#e8531d" }]}>{myTripStats.km}</Text>
                <Text style={[styles.tripStatLbl, { color: colors.mutedForeground }]}>كم</Text>
              </View>
              <View style={[styles.tripStat, { backgroundColor: "#f59e0b18" }]}>
                <Feather name="pause-circle" size={18} color="#f59e0b" />
                <Text style={[styles.tripStatVal, { color: "#f59e0b" }]}>{myTripStats.stops}</Text>
                <Text style={[styles.tripStatLbl, { color: colors.mutedForeground }]}>توقف</Text>
              </View>
              <View style={[styles.tripStat, { backgroundColor: "#22c55e18" }]}>
                <Feather name="navigation" size={18} color="#22c55e" />
                <Text style={[styles.tripStatVal, { color: "#22c55e" }]}>{myTripStats.points}</Text>
                <Text style={[styles.tripStatLbl, { color: colors.mutedForeground }]}>نقطة</Text>
              </View>
              {trackingActive && (
                <View style={[styles.tripStat, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="clock" size={18} color={colors.primary} />
                  <Text style={[styles.tripStatVal, { color: colors.primary }]}>{myTripStats.startTime}</Text>
                  <Text style={[styles.tripStatLbl, { color: colors.mutedForeground }]}>بدأت</Text>
                </View>
              )}
            </View>

            {/* زر بدء/إيقاف */}
            <TouchableOpacity
              onPress={trackingActive ? stopTracking : startTracking}
              style={[
                styles.trackBtn,
                { backgroundColor: trackingActive ? "#dc2626" : "#22c55e", borderRadius: 14 },
              ]}
            >
              <Feather name={trackingActive ? "stop-circle" : "play-circle"} size={22} color="#fff" />
              <View>
                <Text style={styles.trackBtnText}>
                  {trackingActive ? "إنهاء الرحلة وحفظ المسار" : "بدء رحلة جديدة"}
                </Text>
                {trackingActive && (
                  <Text style={styles.trackBtnSub}>يتم تسجيل الكيلومترات والتوقفات</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* قائمة التوقفات */}
            {(activeTrip?.stops.length || 0) > 0 && (
              <ScrollView
                style={{ maxHeight: 130 }}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.stopsTitle, { color: colors.foreground }]}>
                  أماكن التوقف ({activeTrip!.stops.length})
                </Text>
                {activeTrip!.stops.map((stop, idx) => (
                  <View key={idx} style={[styles.stopRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.stopNumBadge, { backgroundColor: "#f59e0b22" }]}>
                      <Text style={styles.stopNum}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stopTime, { color: colors.foreground }]}>
                        {formatTime(stop.arrivalTime)}
                        {stop.departureTime ? ` — ${formatTime(stop.departureTime)}` : " (حالياً)"}
                      </Text>
                      <Text style={[styles.stopDuration, { color: colors.mutedForeground }]}>
                        مدة التوقف: {formatDuration(stop.durationMinutes)}
                      </Text>
                    </View>
                    <Badge
                      label={stop.departureTime ? "غادر" : "متوقف"}
                      variant={stop.departureTime ? "muted" : "warning"}
                    />
                  </View>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* ══════ عرض المدير — مباشر ══════ */}
        {isAdmin && adminTab === "live" && (
          <ScrollView
            style={{ maxHeight: 250 }}
            contentContainerStyle={{ gap: 10, paddingBottom: botPad }}
            showsVerticalScrollIndicator={false}
          >
            {vans.map((van) => {
              const stats = getVanTripStats(van.id);
              const loc = driverLocations.find((l) => l.vanId === van.id);
              return (
                <TouchableOpacity
                  key={van.id}
                  onPress={() => setSelectedVanId(van.id === selectedVanId ? null : van.id)}
                >
                  <Card style={[styles.vanCard,
                    selectedVanId === van.id && { borderColor: colors.primary, borderWidth: 2 }
                  ]}>
                    <View style={[styles.vanDot, {
                      backgroundColor: stats.isActive ? "#22c55e" : colors.mutedForeground
                    }]} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.vanName, { color: colors.foreground }]}>
                        {van.driverName} — {van.name}
                      </Text>
                      {loc && (
                        <Text style={[styles.vanSub, { color: colors.mutedForeground }]}>
                          آخر تحديث: {getTimeDiff(loc.timestamp)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.vanStats}>
                      <View style={styles.vanStatItem}>
                        <Feather name="map" size={13} color="#e8531d" />
                        <Text style={[styles.vanStatText, { color: "#e8531d" }]}>{stats.km} كم</Text>
                      </View>
                      <View style={styles.vanStatItem}>
                        <Feather name="pause-circle" size={13} color="#f59e0b" />
                        <Text style={[styles.vanStatText, { color: "#f59e0b" }]}>{stats.stops} توقف</Text>
                      </View>
                      {stats.isActive && <Badge label="نشط" variant="success" />}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
            {driverLocations.length === 0 && (
              <View style={styles.empty}>
                <Feather name="map-pin" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد مندوبون نشطون</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ══════ عرض المدير — سجل الرحلات ══════ */}
        {isAdmin && adminTab === "history" && (
          <ScrollView
            style={{ maxHeight: 260 }}
            contentContainerStyle={{ gap: 10, paddingBottom: botPad }}
            showsVerticalScrollIndicator={false}
          >
            {historyTrips.length === 0 && (
              <View style={styles.empty}>
                <Feather name="clock" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا يوجد رحلات مسجّلة</Text>
              </View>
            )}
            {historyTrips.map((trip) => {
              const van = vans.find((v) => v.id === trip.vanId);
              const tripDuration = trip.endTime
                ? Math.round((new Date(trip.endTime).getTime() - new Date(trip.startTime).getTime()) / 60000)
                : null;
              return (
                <Card key={trip.id} style={[styles.histCard, {
                  borderRightWidth: 3,
                  borderRightColor: trip.isActive ? "#22c55e" : colors.primary,
                }]}>
                  <View style={styles.histTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.histDriver, { color: colors.foreground }]}>
                        {trip.driverName} — {van?.name || ""}
                      </Text>
                      <Text style={[styles.histDate, { color: colors.mutedForeground }]}>
                        {formatDate(trip.startTime)} • {formatTime(trip.startTime)}
                        {trip.endTime ? ` — ${formatTime(trip.endTime)}` : ""}
                      </Text>
                    </View>
                    {trip.isActive
                      ? <Badge label="جارية" variant="success" />
                      : <Badge label="منتهية" variant="muted" />
                    }
                  </View>
                  <View style={styles.histStats}>
                    <View style={styles.histStatItem}>
                      <Feather name="map" size={14} color="#e8531d" />
                      <Text style={[styles.histStatText, { color: "#e8531d" }]}>
                        {trip.distanceKm.toFixed(1)} كم
                      </Text>
                    </View>
                    <View style={styles.histStatItem}>
                      <Feather name="pause-circle" size={14} color="#f59e0b" />
                      <Text style={[styles.histStatText, { color: "#f59e0b" }]}>
                        {trip.stops.length} توقفة
                      </Text>
                    </View>
                    <View style={styles.histStatItem}>
                      <Feather name="navigation" size={14} color="#8b5cf6" />
                      <Text style={[styles.histStatText, { color: "#8b5cf6" }]}>
                        {trip.points.length} نقطة
                      </Text>
                    </View>
                    {tripDuration !== null && (
                      <View style={styles.histStatItem}>
                        <Feather name="clock" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.histStatText, { color: colors.mutedForeground }]}>
                          {formatDuration(tripDuration)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {trip.stops.length > 0 && (
                    <View style={[styles.stopsList, { borderTopColor: colors.border }]}>
                      {trip.stops.slice(0, 3).map((stop, idx) => (
                        <Text key={idx} style={[styles.stopsListItem, { color: colors.mutedForeground }]}>
                          • توقف {idx + 1}: {formatTime(stop.arrivalTime)} — {formatDuration(stop.durationMinutes)}
                        </Text>
                      ))}
                      {trip.stops.length > 3 && (
                        <Text style={[styles.stopsListItem, { color: colors.mutedForeground }]}>
                          +{trip.stops.length - 3} توقف آخر...
                        </Text>
                      )}
                    </View>
                  )}
                </Card>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  tabText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  map: { flex: 1, minHeight: 240 },
  callout: { padding: 8, minWidth: 130 },
  calloutTitle: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  calloutSub: { fontSize: 11, textAlign: "center", marginTop: 3, color: "#666" },
  panel: {
    maxHeight: 340,
    padding: 14,
    gap: 10,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tripStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  tripStat: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  tripStatVal: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  tripStatLbl: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 13,
    gap: 10,
  },
  trackBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  trackBtnSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 2,
  },
  stopsTitle: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    marginBottom: 6,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  stopNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stopNum: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#f59e0b",
  },
  stopTime: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  stopDuration: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  // Admin
  vanCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  vanDot: { width: 10, height: 10, borderRadius: 5 },
  vanName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  vanSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  vanStats: { flexDirection: "row", alignItems: "center", gap: 8 },
  vanStatItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  vanStatText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  histCard: { gap: 6 },
  histTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  histDriver: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "right" },
  histDate: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
  histStats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  histStatItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  histStatText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  stopsList: { borderTopWidth: 1, paddingTop: 6, gap: 4 },
  stopsListItem: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  empty: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
