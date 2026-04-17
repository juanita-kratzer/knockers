// src/pages/client/ExplorePage.jsx
// Browse and filter entertainers

import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { useEntertainers } from "../../hooks/useEntertainers";
import { useRole } from "../../context/RoleContext";
import { entertainerCategories } from "../../data/entertainerTypes";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import ErrorMessage from "../../components/ErrorMessage";

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ageVerified } = useRole();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get("location") || "");
  const [showAdult, setShowAdult] = useState(searchParams.get("adult") === "true");
  const [showFilters, setShowFilters] = useState(false);

  // Build filters for the hook
  const filters = useMemo(() => ({
    category: selectedCategory || undefined,
    suburb: selectedLocation || undefined,
    hideAdult: !showAdult || !ageVerified,
    searchQuery: searchQuery || undefined,
  }), [selectedCategory, selectedLocation, showAdult, ageVerified, searchQuery]);

  const { entertainers, loading, error } = useEntertainers(filters);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedLocation) params.set("location", selectedLocation);
    if (showAdult) params.set("adult", "true");
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, selectedLocation, showAdult, setSearchParams]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedLocation("");
    setShowAdult(false);
  };

  const hasFilters = searchQuery || selectedCategory || selectedLocation;

  return (
    <Container>
      {/* Search Header */}
      <SearchHeader>
        <SearchInputWrapper>
          <SearchIcon>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </SearchIcon>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entertainers..."
          />
          {searchQuery && (
            <ClearButton onClick={() => setSearchQuery("")}>×</ClearButton>
          )}
        </SearchInputWrapper>
        <FilterToggle 
          onClick={() => setShowFilters(!showFilters)}
          $active={showFilters || hasFilters}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
          </svg>
        </FilterToggle>
      </SearchHeader>

      {/* Filters Panel */}
      {showFilters && (
        <FiltersPanel>
          <FilterSection>
            <FilterLabel>Category</FilterLabel>
            <FilterScroll>
              <FilterChip
                $selected={!selectedCategory}
                onClick={() => setSelectedCategory("")}
              >
                All
              </FilterChip>
              {entertainerCategories
                .filter((c) => !c.ageRestricted || (showAdult && ageVerified))
                .map((cat) => (
                  <FilterChip
                    key={cat.name}
                    $selected={selectedCategory === cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    {cat.emoji} {cat.name.split(",")[0]}
                  </FilterChip>
                ))}
            </FilterScroll>
          </FilterSection>

          <FilterRow>
            <FilterSection style={{ flex: 1 }}>
              <FilterLabel>Location</FilterLabel>
              <FilterInput
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                placeholder="Suburb..."
              />
            </FilterSection>

            {ageVerified && (
              <FilterSection>
                <FilterLabel>Adult Content</FilterLabel>
                <ToggleSwitch
                  $active={showAdult}
                  onClick={() => setShowAdult(!showAdult)}
                >
                  <ToggleKnob $active={showAdult} />
                </ToggleSwitch>
              </FilterSection>
            )}
          </FilterRow>

          {hasFilters && (
            <ClearFiltersButton onClick={handleClearFilters}>
              Clear all filters
            </ClearFiltersButton>
          )}
        </FiltersPanel>
      )}

      {/* Results */}
      <ResultsSection>
        {loading ? (
          <LoadingWrapper>
            <LoadingSpinner size={32} />
          </LoadingWrapper>
        ) : error ? (
          <ErrorMessage error={error} onRetry={() => window.location.reload()} />
        ) : entertainers.length === 0 ? (
          <EmptyState
            icon=""
            title="No entertainers found"
            message={hasFilters 
              ? "Try adjusting your filters or search terms"
              : "Be the first entertainer in your area!"
            }
            actionText={hasFilters ? "Clear filters" : "Join as entertainer"}
            onAction={hasFilters ? handleClearFilters : undefined}
            actionTo={hasFilters ? undefined : "/talent/signup"}
          />
        ) : (
          <>
            <ResultsCount>
              {entertainers.length} entertainer{entertainers.length !== 1 ? "s" : ""} found
            </ResultsCount>
            <EntertainerGrid>
              {entertainers.map((ent) => (
                <EntertainerCard key={ent.id} to={`/talent/${ent.id}`}>
                  <CardImage>
                    {ent.photos?.[0] ? (
                      <img src={ent.photos[0]} alt={ent.displayName} />
                    ) : (
                      <PlaceholderImage>
                        {ent.displayName?.[0] || "?"}
                      </PlaceholderImage>
                    )}
                    {ent.isAdultContent && <AdultBadge>18+</AdultBadge>}
                  </CardImage>
                  <CardContent>
                    <CardName>{ent.displayName}</CardName>
                    <CardCategory>
                      {ent.subCategories?.[0] || ent.categories?.[0] || "Entertainer"}
                    </CardCategory>
                    <CardMeta>
                      <CardLocation>{(ent.suburb || "Location TBA").replace(/\s*\(.*\)$/, "").trim()}</CardLocation>
                      {ent.pricing?.baseRate > 0 && (
                        <CardPrice>From ${ent.pricing.baseRate}</CardPrice>
                      )}
                    </CardMeta>
                    {ent.rating > 0 && (
                      <CardRating>
                        {ent.rating.toFixed(1)} ({ent.reviewCount})
                      </CardRating>
                    )}
                  </CardContent>
                </EntertainerCard>
              ))}
            </EntertainerGrid>
          </>
        )}
      </ResultsSection>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100%;
  background: ${({ theme }) => theme.bg};
`;

const SearchHeader = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.bg};
  z-index: 10;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const SearchInputWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
`;

const SearchIcon = styled.span`
  color: ${({ theme }) => theme.muted};
  display: flex;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: none;
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  outline: none;
  
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
`;

const ClearButton = styled.button`
  border: none;
  background: none;
  color: ${({ theme }) => theme.muted};
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
`;

const FilterToggle = styled.button`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $active, theme }) => $active ? theme.primary : theme.border};
  background: ${({ $active, theme }) => $active ? theme.hover : theme.card};
  color: ${({ $active, theme }) => $active ? theme.primary : theme.text};
  border-radius: 12px;
  cursor: pointer;
`;

const FiltersPanel = styled.div`
  padding: 16px;
  background: ${({ theme }) => theme.card};
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const FilterSection = styled.div`
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FilterLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.muted};
  margin-bottom: 8px;
  text-transform: uppercase;
`;

/* Categories: grid wrap to prevent overlapping (knockers-fixes). Category titles from entertainerTypes. */
const FilterScroll = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 4px;
`;

const FilterChip = styled.button`
  padding: 8px 14px;
  border: 1px solid ${({ $selected, theme }) => $selected ? theme.primary : theme.border};
  background: ${({ $selected, theme }) => $selected ? theme.hover : "transparent"};
  color: ${({ $selected, theme }) => $selected ? theme.primary : theme.text};
  border-radius: 20px;
  font-size: 0.85rem;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-end;
`;

const FilterInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  border-radius: 10px;
  font-size: 0.9rem;
  outline: none;
  
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const ToggleSwitch = styled.button`
  width: 50px;
  height: 28px;
  border-radius: 14px;
  border: none;
  background: ${({ $active, theme }) => $active ? theme.primary : theme.dark};
  cursor: pointer;
  position: relative;
  transition: background 150ms;
`;

const ToggleKnob = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 3px;
  left: ${({ $active }) => $active ? "25px" : "3px"};
  transition: left 150ms;
`;

const ClearFiltersButton = styled.button`
  width: 100%;
  padding: 12px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.primary};
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 8px;
`;

const ResultsSection = styled.div`
  padding: 16px;
  padding-bottom: 100px;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

const ResultsCount = styled.p`
  color: ${({ theme }) => theme.muted};
  font-size: 0.85rem;
  margin: 0 0 16px 0;
`;

const EntertainerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const EntertainerCard = styled(Link)`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 150ms;
  
  &:active {
    transform: scale(0.98);
  }
`;

const CardImage = styled.div`
  aspect-ratio: 1;
  position: relative;
  background: ${({ theme }) => theme.bgAlt};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PlaceholderImage = styled.div`
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

const AdultBadge = styled.span`
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

const CardContent = styled.div`
  padding: 12px;
`;

const CardName = styled.h3`
  margin: 0 0 4px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardCategory = styled.p`
  margin: 0 0 8px 0;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardLocation = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
`;

const CardPrice = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const CardRating = styled.div`
  margin-top: 8px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.muted};
`;
