// SuburbAutocomplete.jsx
// Typeahead suburb selector using existing Australian suburbs data. Only allows selecting a real suburb;
// free text cannot be submitted. Stores standardized { suburb, state, region, lat, lng } for Firestore.

import { useState, useMemo, useRef, useEffect } from "react";
import styled from "styled-components";
import { useAustralianSuburbs } from "../hooks/useAustralianSuburbs";
import { normalizeSuburbList } from "../utils/suburbLocation";

const MAX_RESULTS = 10;

export default function SuburbAutocomplete({
  value,
  onChange,
  error,
  disabled,
  placeholder = "e.g. Burleigh Heads, Surfers Paradise",
  "aria-label": ariaLabel,
}) {
  const rawSuburbs = useAustralianSuburbs();
  const normalizedList = useMemo(() => normalizeSuburbList(rawSuburbs), [rawSuburbs]);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Display string: selected location or current query
  const displayValue = value ? `${value.suburb}${value.state ? `, ${value.state}` : ""}` : query;

  // Filter suburbs: case-insensitive match on suburb name and state, limit to MAX_RESULTS
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return normalizedList
      .filter(
        (loc) =>
          loc.suburb.toLowerCase().includes(q) ||
          (loc.fullLocation && loc.fullLocation.toLowerCase().includes(q)) ||
          (loc.state && loc.state.toLowerCase().includes(q))
      )
      .slice(0, MAX_RESULTS);
  }, [normalizedList, query]);

  // When dropdown opens, reset highlight
  useEffect(() => {
    if (isOpen) setHighlightedIndex(0);
  }, [isOpen, suggestions.length]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange(null);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSelect = (loc) => {
    onChange(loc);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Escape") setIsOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    onChange(null);
    inputRef.current?.focus();
  };

  return (
    <Container ref={containerRef}>
      <InputWrap>
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          $error={!!error}
          aria-label={ariaLabel || "Suburb"}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="suburb-listbox"
          aria-activedescendant={suggestions[highlightedIndex] ? `suburb-opt-${highlightedIndex}` : undefined}
        />
        {value && (
          <ClearBtn type="button" onClick={handleClear} aria-label="Clear selection">
            ×
          </ClearBtn>
        )}
      </InputWrap>
      {isOpen && suggestions.length > 0 && (
        <Listbox id="suburb-listbox" role="listbox">
          {suggestions.map((loc, i) => (
            <Option
              key={`${loc.suburb}-${loc.lat}-${loc.lng}`}
              id={`suburb-opt-${i}`}
              role="option"
              $highlighted={i === highlightedIndex}
              onClick={() => handleSelect(loc)}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              {loc.fullLocation || loc.suburb}
              {loc.state && !loc.fullLocation && <OptionState>{loc.state}</OptionState>}
            </Option>
          ))}
        </Listbox>
      )}
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  width: 100%;
  overflow: visible !important;
`;

const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 36px 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme, $error }) => ($error ? "#ef4444" : theme.border)};
  border-radius: 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.text};
  &::placeholder {
    color: ${({ theme }) => theme.muted};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme, $error }) => ($error ? "#ef4444" : theme.primary)};
  }
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const ClearBtn = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: none;
  background: ${({ theme }) => theme.hover};
  color: ${({ theme }) => theme.muted};
  border-radius: 50%;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    color: ${({ theme }) => theme.text};
  }
`;

const Listbox = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 4px 0 0 0;
  padding: 8px 0;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  max-height: 280px;
  overflow-y: auto;
  list-style: none;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const Option = styled.li`
  padding: 12px 16px;
  cursor: pointer;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text};
  background: ${({ $highlighted, theme }) => ($highlighted ? theme.hover : "transparent")};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  &:hover {
    background: ${({ theme }) => theme.hover};
  }
`;

const OptionState = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.muted};
`;
