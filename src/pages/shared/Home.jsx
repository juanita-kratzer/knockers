// src/pages/shared/Home.jsx
// Home page with map/grid toggle for browsing entertainers

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polygon } from "@react-google-maps/api";
import { useEntertainersByPostcode, useEntertainers } from "../../hooks/useEntertainers";
import { useAustralianSuburbs } from "../../hooks/useAustralianSuburbs";
import { useSuburbBoundaries, ringToPath } from "../../hooks/useSuburbBoundaries";
import { getVisibleSuburbsForMap, clusterSuburbsByZoom } from "../../utils/geoUtils";
import { entertainerCategories } from "../../data/entertainerTypes";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";
import PromoBanner from "../../components/PromoBanner";
import SuburbAutocomplete from "../../components/SuburbAutocomplete";
import { useRole } from "../../context/RoleContext";
import { MapPin, Navigation, ChevronDown, Crosshair, X, Map as MapIcon, LayoutGrid } from "lucide-react";
import { logger } from "../../lib/logger";

// Debounce delay for map bounds/zoom (stops re-render storm on mobile)
const MAP_UPDATE_DEBOUNCE_MS = 200;

// Map container style
const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

// Minimal dark map: only land, water, subtle roads. No POIs, no road names, no map labels.
// Suburb names and counts come only from our circles + info window.
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1d21" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2a2f38" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a2f38" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1d21" }],
  },
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a3f48" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1a2b" }],
  },
  {
    featureType: "water",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  { elementType: "labels", stylers: [{ visibility: "off" }] },
];

// Default center (Sydney, Australia - change as needed)
const defaultCenter = {
  lat: -33.8688,
  lng: 151.2093,
};


export default function Home() {
  const navigate = useNavigate();
  const { isEntertainer, ageVerified } = useRole();
  const [viewMode, setViewMode] = useState("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showAdult, setShowAdult] = useState(false);
  const [showGridFilters, setShowGridFilters] = useState(false);
  const { postcodeData, loading } = useEntertainersByPostcode();

  const gridFilters = useMemo(() => ({
    category: selectedCategory || undefined,
    suburb: selectedLocation || undefined,
    hideAdult: !showAdult || !ageVerified,
    searchQuery: searchQuery || undefined,
  }), [selectedCategory, selectedLocation, showAdult, ageVerified, searchQuery]);

  const { entertainers: gridEntertainers, loading: gridLoading, error: gridError } = useEntertainers(gridFilters);
  const australianSuburbs = useAustralianSuburbs();
  const suburbBoundaries = useSuburbBoundaries();
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationLabel, setLocationLabel] = useState(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [map, setMap] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const boundsDebounceRef = useRef(null);
  const mapRef = useRef(null);
  const locationResolvedRef = useRef(false);

  // Entertainer dashboard has no map; redirect to Listings
  useEffect(() => {
    if (isEntertainer) {
      navigate("/listings", { replace: true });
    }
  }, [isEntertainer, navigate]);

  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    id: "google-map-script",
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setLocationLoading(false);
      return;
    }
    setLocationError(null);
    setLocationLoading(true);
    locationResolvedRef.current = false;

    const safetyTimer = setTimeout(() => {
      if (!locationResolvedRef.current) {
        locationResolvedRef.current = true;
        logger.warn("Geolocation: safety timeout (20s) — neither callback fired");
        setLocationError("Location unavailable");
        setLocationLoading(false);
      }
    }, 20000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationResolvedRef.current) return;
        locationResolvedRef.current = true;
        clearTimeout(safetyTimer);
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLabel(null);
        setLocationError(null);
        setLocationLoading(false);
      },
      (error) => {
        if (locationResolvedRef.current) return;
        locationResolvedRef.current = true;
        clearTimeout(safetyTimer);
        logger.warn("Geolocation error:", error.code, error.message);
        setLocationError(error.message || "Location unavailable");
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Map load callback: mark map ready, store ref, force initial bounds read, debounce subsequent updates
  const onMapLoad = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    setMap(mapInstance);
    setMapReady(true);
    const z = mapInstance.getZoom();
    if (z != null) setMapZoom(z);
    const flushBounds = () => {
      const b = mapInstance.getBounds();
      if (b) {
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        setMapBounds({ ne: { lat: ne.lat(), lng: ne.lng() }, sw: { lat: sw.lat(), lng: sw.lng() } });
      }
    };
    const flushZoom = () => {
      const z = mapInstance.getZoom();
      if (z != null) setMapZoom(z);
    };
    const scheduleFlush = (flush) => {
      if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
      boundsDebounceRef.current = setTimeout(() => {
        boundsDebounceRef.current = null;
        flush();
      }, MAP_UPDATE_DEBOUNCE_MS);
    };
    flushBounds();
    const updateBounds = () => scheduleFlush(flushBounds);
    const updateZoom = () => scheduleFlush(flushZoom);
    const listeners = [
      mapInstance.addListener("bounds_changed", updateBounds),
      mapInstance.addListener("idle", updateBounds),
      mapInstance.addListener("zoom_changed", updateZoom),
    ];
    return () => {
      mapRef.current = null;
      if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
      listeners.forEach((l) => google.maps.event.removeListener(l));
    };
  }, []);

  // Mobile: bounds sometimes never fire in WebView; force a read after 1.5s if still null
  useEffect(() => {
    if (!mapReady) return;
    const t = setTimeout(() => {
      if (mapRef.current && !mapBounds) {
        const b = mapRef.current.getBounds();
        if (b) {
          const ne = b.getNorthEast();
          const sw = b.getSouthWest();
          setMapBounds({ ne: { lat: ne.lat(), lng: ne.lng() }, sw: { lat: sw.lat(), lng: sw.lng() } });
        }
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [mapReady, mapBounds]);

  // Center map on user location (recenter on button tap or when we first get location)
  const centerOnUser = useCallback(() => {
    if (map && userLocation) {
      map.panTo(userLocation);
      map.setZoom(12);
    }
  }, [map, userLocation]);

  // When we first get user location, pan map to it
  useEffect(() => {
    if (map && userLocation) {
      map.panTo(userLocation);
      map.setZoom(12);
    }
  }, [map, userLocation]);

  const handleSuburbSelect = useCallback((loc) => {
    if (!loc) return;
    const coords = { lat: loc.lat, lng: loc.lng };
    setUserLocation(coords);
    setLocationLabel(`${loc.suburb}${loc.state ? `, ${loc.state}` : ""}`);
    setLocationError(null);
    setLocationLoading(false);
    setShowLocationSelector(false);
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    setShowLocationSelector(false);
    setLocationLabel(null);
    requestLocation();
  }, [requestLocation]);

  const locationStatusText = locationLabel
    || (userLocation ? "Current location" : locationLoading ? "Getting location…" : "Select location");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setViewMode("grid");
    }
  };

  const handleClearGridFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedLocation("");
    setShowAdult(false);
  };

  const hasGridFilters = searchQuery || selectedCategory || selectedLocation;

  // Map data: one entry per postcode (e.g. 4217 = Surfers Paradise, Main Beach, Bundall, Benowa)
  const suburbsForMap = useMemo(() => {
    if (postcodeData && postcodeData.length > 0) return postcodeData;
    return [];
  }, [postcodeData]);

  // Unified pipeline: when bounds null use soft fallback (first 40) so markers can show; no deadlock
  const MAX_MARKERS = 80;
  const FALLBACK_WHEN_NO_BOUNDS = 40;
  const visibleSuburbs = useMemo(() => {
    if (!mapReady || !suburbsForMap?.length) return [];
    return getVisibleSuburbsForMap(suburbsForMap, mapBounds, 0.1, FALLBACK_WHEN_NO_BOUNDS);
  }, [mapReady, suburbsForMap, mapBounds]);

  // Markers use each suburb’s real lat/lng so circles sit in the actual suburbs (on land)
  const suburbMarkers = useMemo(() => {
    const clustered = clusterSuburbsByZoom(visibleSuburbs, mapZoom, 14, 6, suburbsForMap);
    return clustered.length <= MAX_MARKERS ? clustered : clustered.slice(0, MAX_MARKERS);
  }, [visibleSuburbs, mapZoom, suburbsForMap]);

  // DEV: log pipeline state to debug "no circles" (must be after visibleSuburbs is defined)
  useEffect(() => {
    logger.debug("Map pipeline:", {
      mapReady,
      bounds: mapBounds ? "set" : "null",
      postcodeDataLen: postcodeData?.length ?? 0,
      visibleLen: visibleSuburbs?.length ?? 0,
    });
  }, [mapReady, mapBounds, postcodeData?.length, visibleSuburbs?.length]);

  // Perimeter paths for glow: only for individual suburbs (not clusters) that have boundary data
  const suburbPerimeterPaths = useMemo(() => {
    if (!suburbBoundaries || typeof suburbBoundaries !== "object") return [];
    return suburbMarkers
      .filter((s) => !s.isCluster && s.salCode && suburbBoundaries[s.salCode])
      .map((suburb) => ({
        suburb,
        paths: suburbBoundaries[suburb.salCode].map(ringToPath).filter((p) => p.length >= 3),
      }))
      .filter((x) => x.paths.length > 0);
  }, [suburbMarkers, suburbBoundaries]);

  // Map center
  const mapCenter = userLocation || defaultCenter;

  if (isEntertainer) {
    return (
      <Container>
        <LoadingOverlay>
          <LoadingSpinner size={32} />
          <LoadingText>Redirecting to your dashboard...</LoadingText>
        </LoadingOverlay>
      </Container>
    );
  }

  return (
    <Container>
      <HeaderArea>
        <LogoHeading>Knockers</LogoHeading>
        <SearchBar onSubmit={handleSearch}>
          <SearchInput>
            <SearchIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </SearchIcon>
            <Input
              placeholder="Search entertainers, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FilterWrap>
              <FilterButton type="button" onClick={() => setShowFilterDropdown((v) => !v)} aria-expanded={showFilterDropdown}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </FilterButton>
              {showFilterDropdown && (
                <FilterDropdown>
                  <FilterDropdownBtn type="button" onClick={() => { setShowFilterDropdown(false); setViewMode(viewMode === "grid" ? "map" : "grid"); }}>
                    {viewMode === "grid" ? "Switch to map" : "Browse all entertainers"}
                  </FilterDropdownBtn>
                </FilterDropdown>
              )}
            </FilterWrap>
          </SearchInput>
        </SearchBar>
        <ViewToggle>
          <ViewToggleBtn type="button" $active={viewMode === "map"} onClick={() => setViewMode("map")}>
            <MapIcon size={16} /> Map
          </ViewToggleBtn>
          <ViewToggleBtn type="button" $active={viewMode === "grid"} onClick={() => setViewMode("grid")}>
            <LayoutGrid size={16} /> Grid
          </ViewToggleBtn>
        </ViewToggle>
      </HeaderArea>

      <PromoBanner targetRole="both" style={{ margin: "0 16px 12px" }} />

      {viewMode === "grid" ? (
        <GridSection>
          <GridFilterBar>
            <GridFilterToggle
              type="button"
              onClick={() => setShowGridFilters(!showGridFilters)}
              $active={showGridFilters || hasGridFilters}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
              </svg>
              Filters {hasGridFilters ? "(active)" : ""}
            </GridFilterToggle>
          </GridFilterBar>

          {showGridFilters && (
            <GridFiltersPanel>
              <GFilterSection>
                <GFilterLabel>Category</GFilterLabel>
                <GFilterScroll>
                  <GFilterChip $selected={!selectedCategory} onClick={() => setSelectedCategory("")}>All</GFilterChip>
                  {entertainerCategories
                    .filter((c) => !c.ageRestricted || (showAdult && ageVerified))
                    .map((cat) => (
                      <GFilterChip
                        key={cat.name}
                        $selected={selectedCategory === cat.name}
                        onClick={() => setSelectedCategory(cat.name)}
                      >
                        {cat.emoji} {cat.name.split(",")[0]}
                      </GFilterChip>
                    ))}
                </GFilterScroll>
              </GFilterSection>

              <GFilterRow>
                <GFilterSection style={{ flex: 1 }}>
                  <GFilterLabel>Location</GFilterLabel>
                  <GFilterInput
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    placeholder="Suburb..."
                  />
                </GFilterSection>
                {ageVerified && (
                  <GFilterSection>
                    <GFilterLabel>Adult Content</GFilterLabel>
                    <GToggleSwitch $active={showAdult} onClick={() => setShowAdult(!showAdult)}>
                      <GToggleKnob $active={showAdult} />
                    </GToggleSwitch>
                  </GFilterSection>
                )}
              </GFilterRow>

              {hasGridFilters && (
                <GClearFiltersBtn onClick={handleClearGridFilters}>Clear all filters</GClearFiltersBtn>
              )}
            </GridFiltersPanel>
          )}

          <GridResults>
            {gridLoading ? (
              <GridLoadingWrap><LoadingSpinner size={32} /></GridLoadingWrap>
            ) : gridError ? (
              <ErrorMessage error={gridError} onRetry={() => window.location.reload()} />
            ) : gridEntertainers.length === 0 ? (
              <EmptyState
                icon=""
                title="No entertainers found"
                message={hasGridFilters
                  ? "Try adjusting your filters or search terms"
                  : "Be the first entertainer in your area!"
                }
                actionText={hasGridFilters ? "Clear filters" : "Join as entertainer"}
                onAction={hasGridFilters ? handleClearGridFilters : undefined}
                actionTo={hasGridFilters ? undefined : "/talent/signup"}
              />
            ) : (
              <>
                <GridResultsCount>
                  {gridEntertainers.length} entertainer{gridEntertainers.length !== 1 ? "s" : ""} found
                </GridResultsCount>
                <EntGrid>
                  {gridEntertainers.map((ent) => (
                    <EntCard key={ent.id} to={`/talent/${ent.id}`}>
                      <EntCardImage>
                        {ent.photos?.[0] ? (
                          <img src={ent.photos[0]} alt={ent.displayName} />
                        ) : (
                          <EntPlaceholder>{ent.displayName?.[0] || "?"}</EntPlaceholder>
                        )}
                        {ent.isAdultContent && <EntAdultBadge>18+</EntAdultBadge>}
                      </EntCardImage>
                      <EntCardContent>
                        <EntNameRow>
                          <EntName>{ent.displayName}</EntName>
                          {ent.profileType === "hard" && <EntPoliceTick title="Police Check Verified">✓</EntPoliceTick>}
                        </EntNameRow>
                        <EntCategory>{ent.subCategories?.[0] || ent.categories?.[0] || "Entertainer"}</EntCategory>
                        <EntMeta>
                          <EntLocation>{(ent.suburb || "Location TBA").replace(/\s*\(.*\)$/, "").trim()}</EntLocation>
                          {ent.pricing?.baseRate > 0 && <EntPrice>From ${ent.pricing.baseRate}</EntPrice>}
                        </EntMeta>
                        {ent.rating > 0 && <EntRating>{ent.rating.toFixed(1)} ({ent.reviewCount})</EntRating>}
                      </EntCardContent>
                    </EntCard>
                  ))}
                </EntGrid>
              </>
            )}
          </GridResults>
        </GridSection>
      ) : (
      <MapContainer>
        {!isLoaded ? (
          <LoadingOverlay>
            <LoadingSpinner size={32} />
            <LoadingText>Loading map...</LoadingText>
          </LoadingOverlay>
        ) : loadError ? (
          <EmptyMap>
            <EmptyIconWrapper><MapPin size={48} /></EmptyIconWrapper>
            <EmptyText>Could not load map</EmptyText>
            <EmptySubtext>Please check your connection</EmptySubtext>
          </EmptyMap>
        ) : (
          <>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={12}
              onLoad={onMapLoad}
              options={{
                styles: darkMapStyle,
                disableDefaultUI: true,
                zoomControl: false,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
            >
              {/* User location marker */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#87CEEB",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 3,
                  }}
                  zIndex={1000}
                />
              )}

              {/* Glow around actual suburb perimeters – soft outer fade, then thin glow, then subtle edge */}
              {suburbPerimeterPaths.map(({ suburb, paths }, i) => (
                <Polygon
                  key={`fade-${suburb.salCode ?? i}`}
                  paths={paths}
                  options={{
                    fillColor: "transparent",
                    fillOpacity: 0,
                    strokeColor: "#87CEEB",
                    strokeOpacity: 0.06,
                    strokeWeight: 10,
                    zIndex: 1,
                  }}
                />
              ))}
              {suburbPerimeterPaths.map(({ suburb, paths }, i) => (
                <Polygon
                  key={`glow-${suburb.salCode ?? i}`}
                  paths={paths}
                  options={{
                    fillColor: "transparent",
                    fillOpacity: 0,
                    strokeColor: "#87CEEB",
                    strokeOpacity: 0.18,
                    strokeWeight: 6,
                    zIndex: 2,
                  }}
                />
              ))}
              {suburbPerimeterPaths.map(({ suburb, paths }, i) => (
                <Polygon
                  key={`border-${suburb.salCode ?? i}`}
                  paths={paths}
                  options={{
                    fillColor: "transparent",
                    fillOpacity: 0,
                    strokeColor: "#87CEEB",
                    strokeOpacity: 0.75,
                    strokeWeight: 1.5,
                    zIndex: 3,
                  }}
                />
              ))}

              {/* Suburb cluster markers – click again to close popup */}
              {suburbMarkers.map((suburb) => (
                <Marker
                  key={`${suburb.name}-${suburb.position.lat}-${suburb.position.lng}`}
                  position={suburb.position}
                  onClick={() => {
                    setSelectedMarker((prev) =>
                      prev &&
                      prev.name === suburb.name &&
                      prev.position?.lat === suburb.position?.lat &&
                      prev.position?.lng === suburb.position?.lng
                        ? null
                        : suburb
                    );
                  }}
                  icon={{
                    url: `data:image/svg+xml,${encodeURIComponent(`
                      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="20" cy="20" r="18" fill="#87CEEB" stroke="#1a1d21" stroke-width="2"/>
                        <text x="20" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a1d21">${suburb.count}</text>
                      </svg>
                    `)}`,
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 20),
                  }}
                />
              ))}

              {/* Info window for selected marker */}
              {selectedMarker && (
                <InfoWindow
                  position={selectedMarker.position}
                  onCloseClick={() => setSelectedMarker(null)}
                  options={{
                    pixelOffset: new google.maps.Size(0, -20),
                  }}
                >
                  <InfoWindowContent>
                    <InfoTitle>{selectedMarker.name}</InfoTitle>
                    {selectedMarker.suburbs?.length > 0 && (
                      <InfoSuburbs>{selectedMarker.suburbs.slice(0, 5).join(", ")}{selectedMarker.suburbs.length > 5 ? "…" : ""}</InfoSuburbs>
                    )}
                    <InfoCount>{selectedMarker.count} entertainer{selectedMarker.count !== 1 ? "s" : ""}</InfoCount>
                    <InfoButton
                      onClick={() => { setSelectedLocation(selectedMarker.name); setSelectedMarker(null); setViewMode("grid"); }}
                    >
                      View All
                    </InfoButton>
                  </InfoWindowContent>
                </InfoWindow>
              )}
            </GoogleMap>

            {/* Location button: center on me when we have location, otherwise request location (helps iOS permission) */}
            {userLocation ? (
              <LocationButton
                onClick={centerOnUser}
                type="button"
                title="Back to my area – zoom to local suburbs"
                aria-label="Back to my area"
              >
                <Navigation size={20} />
              </LocationButton>
            ) : (
              <LocationButton
                onClick={requestLocation}
                type="button"
                disabled={locationLoading}
                title="Use my location"
                aria-label="Use my location"
              >
                <MapPin size={20} />
              </LocationButton>
            )}

            {/* Location status — clickable to open selector */}
            <LocationStatusBtn
              type="button"
              onClick={() => setShowLocationSelector(true)}
              $hasLocation={!!userLocation}
            >
              <MapPin size={14} />
              <span>{locationStatusText}</span>
              <ChevronDown size={12} />
            </LocationStatusBtn>

            {/* Location selector bottom sheet */}
            {showLocationSelector && (
              <>
                <SheetOverlay onClick={() => setShowLocationSelector(false)} />
                <LocationSheet>
                  <SheetHandle />
                  <SheetHeader>
                    <SheetTitle>Choose location</SheetTitle>
                    <SheetClose type="button" onClick={() => setShowLocationSelector(false)} aria-label="Close">
                      <X size={20} />
                    </SheetClose>
                  </SheetHeader>
                  <SheetOption type="button" onClick={handleUseCurrentLocation}>
                    <Crosshair size={18} />
                    <span>Use current location</span>
                  </SheetOption>
                  <SheetDivider />
                  <SheetSearchLabel>Search suburb or city</SheetSearchLabel>
                  <SheetSearchWrap>
                    <SuburbAutocomplete
                      value={null}
                      onChange={handleSuburbSelect}
                      placeholder="e.g. Surfers Paradise, Bondi"
                      aria-label="Search location"
                    />
                  </SheetSearchWrap>
                </LocationSheet>
              </>
            )}

            {mapReady && postcodeData?.length === 0 && !loading && (
              <MapEmptyState>
                No entertainers in this area yet
              </MapEmptyState>
            )}
          </>
        )}
      </MapContainer>
      )}
    </Container>
  );
}

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg};
  overflow: hidden;
`;

const HeaderArea = styled.div`
  padding: 12px 16px 16px;
  background: ${({ theme }) => theme.bg};
  flex-shrink: 0;
  z-index: 20;
`;

const LogoHeading = styled.h1`
  margin: 0 0 16px 0;
  font-size: 2.2rem;
  font-weight: 800;
  color: ${({ theme }) => theme.primary};
  text-align: center;
  letter-spacing: -0.02em;
`;

const SearchBar = styled.form``;

const SearchInput = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 2px;
  background: ${({ theme }) => theme.card};
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid ${({ theme }) => theme.border};
`;

const SearchIcon = styled.span`
  color: ${({ theme }) => theme.muted};
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  background: none;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  outline: none;
  
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
`;

const FilterWrap = styled.div`
  position: relative;
`;

const FilterButton = styled.button`
  padding: 8px;
  border: none;
  background: ${({ theme }) => theme.bgAlt};
  border-radius: 10px;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    background: ${({ theme }) => theme.dark};
  }
`;

const FilterDropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  min-width: 180px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  z-index: 100;
  overflow: hidden;
`;

const FilterDropdownBtn = styled.button`
  display: block;
  width: 100%;
  padding: 12px 16px;
  color: ${({ theme }) => theme.text};
  background: none;
  border: none;
  text-align: left;
  font-size: 0.9rem;
  cursor: pointer;
  &:active, &:hover {
    background: ${({ theme }) => theme.bgAlt};
  }
`;

const MapContainer = styled.div`
  flex: 1;
  min-height: 350px;
  background: linear-gradient(180deg, #1a2633 0%, #12141a 100%);
  position: relative;
  overflow: hidden;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const LoadingText = styled.span`
  color: ${({ theme }) => theme.muted};
  font-size: 0.9rem;
`;

const EmptyMap = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
`;

const EmptyIconWrapper = styled.div`
  color: ${({ theme }) => theme.primary};
  margin-bottom: 16px;
`;

const EmptyText = styled.h3`
  color: ${({ theme }) => theme.text};
  margin: 0 0 8px 0;
  font-size: 1.2rem;
`;

const EmptySubtext = styled.p`
  color: ${({ theme }) => theme.muted};
  margin: 0 0 20px 0;
`;

const LocationButton = styled.button`
  position: absolute;
  bottom: 20px;
  right: 16px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10;
  
  &:active {
    background: ${({ theme }) => theme.bgAlt};
    transform: scale(0.95);
  }
`;

const LocationStatusBtn = styled.button`
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.card}ee;
  border-radius: 20px;
  font-size: 0.75rem;
  color: ${({ $hasLocation, theme }) => $hasLocation ? theme.primary : theme.muted};
  border: 1px solid ${({ theme }) => theme.border};
  z-index: 10;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const SheetOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 900;
`;

const LocationSheet = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.card};
  border-radius: 20px 20px 0 0;
  padding: 12px 16px calc(env(safe-area-inset-bottom, 0px) + var(--bottomnav-total, 80px) + 12px);
  z-index: 901;
  min-height: 50vh;
  overflow: visible;
`;

const SheetHandle = styled.div`
  width: 36px;
  height: 4px;
  background: ${({ theme }) => theme.border};
  border-radius: 2px;
  margin: 0 auto 12px;
`;

const SheetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SheetTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const SheetClose = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${({ theme }) => theme.bgAlt};
  color: ${({ theme }) => theme.muted};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const SheetOption = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 0;
  background: none;
  border: none;
  color: ${({ theme }) => theme.primary};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const SheetDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.border};
  margin: 4px 0 12px;
`;

const SheetSearchLabel = styled.p`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.muted};
  margin: 0 0 8px;
`;

const SheetSearchWrap = styled.div`
  position: relative;
  z-index: 10;
`;

const MapEmptyState = styled.div`
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 20px;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
  z-index: 10;
  white-space: nowrap;
`;

const InfoWindowContent = styled.div`
  padding: 4px;
  min-width: 120px;
`;

const InfoTitle = styled.h4`
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1d21;
`;

const InfoSuburbs = styled.p`
  margin: 0 0 6px 0;
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.2;
`;

const InfoCount = styled.p`
  margin: 0 0 10px 0;
  font-size: 0.85rem;
  color: #64748b;
`;

const InfoButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  background: #87CEEB;
  border: none;
  border-radius: 8px;
  color: #1a1d21;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  
  &:hover {
    background: #7BC4E1;
  }
`;

// --- View toggle ---

const ViewToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const ViewToggleBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border: 1px solid ${({ $active, theme }) => $active ? theme.primary : theme.border};
  background: ${({ $active, theme }) => $active ? `${theme.primary}15` : theme.card};
  color: ${({ $active, theme }) => $active ? theme.primary : theme.muted};
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
`;

// --- Grid view ---

const GridSection = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const GridFilterBar = styled.div`
  padding: 0 16px 12px;
`;

const GridFilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.primary : theme.border};
  background: ${({ $active, theme }) => $active ? `${theme.primary}10` : theme.card};
  color: ${({ $active, theme }) => $active ? theme.primary : theme.text};
  border-radius: 50px;
  font-size: 0.85rem;
  cursor: pointer;
`;

const GridFiltersPanel = styled.div`
  padding: 0 16px 16px;
`;

const GFilterSection = styled.div`
  margin-bottom: 16px;
  &:last-child { margin-bottom: 0; }
`;

const GFilterLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.muted};
  margin-bottom: 8px;
  text-transform: uppercase;
`;

const GFilterScroll = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 4px;
`;

const GFilterChip = styled.button`
  padding: 8px 14px;
  border: 1px solid ${({ $selected, theme }) => $selected ? theme.primary : theme.border};
  background: ${({ $selected, theme }) => $selected ? `${theme.primary}15` : "transparent"};
  color: ${({ $selected, theme }) => $selected ? theme.primary : theme.text};
  border-radius: 50px;
  font-size: 0.85rem;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
`;

const GFilterRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-end;
`;

const GFilterInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.bgAlt};
  color: ${({ theme }) => theme.text};
  border-radius: 10px;
  font-size: 0.9rem;
  outline: none;
  &::placeholder { color: ${({ theme }) => theme.muted}; }
  &:focus { border-color: ${({ theme }) => theme.primary}; }
`;

const GToggleSwitch = styled.button`
  width: 50px;
  height: 28px;
  border-radius: 14px;
  border: none;
  background: ${({ $active, theme }) => $active ? theme.primary : theme.dark};
  cursor: pointer;
  position: relative;
`;

const GToggleKnob = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 3px;
  left: ${({ $active }) => $active ? "25px" : "3px"};
  transition: left 150ms;
`;

const GClearFiltersBtn = styled.button`
  width: 100%;
  padding: 12px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.primary};
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 8px;
`;

const GridResults = styled.div`
  padding: 0 16px 100px;
`;

const GridLoadingWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const GridResultsCount = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.85rem;
  margin: 0 0 16px 0;
`;

const EntGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
`;

const EntCard = styled(Link)`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  &:active { transform: scale(0.98); }
`;

const EntCardImage = styled.div`
  aspect-ratio: 1;
  position: relative;
  background: ${({ theme }) => theme.bgAlt};
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const EntPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.muted};
  background: ${({ theme }) => theme.dark};
`;

const EntAdultBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #ef4444;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 6px;
`;

const EntCardContent = styled.div`
  padding: 12px;
`;

const EntNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
`;

const EntName = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EntPoliceTick = styled.span`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 50%;
`;

const EntCategory = styled.p`
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EntMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const EntLocation = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
`;

const EntPrice = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const EntRating = styled.div`
  margin-top: 8px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
`;

