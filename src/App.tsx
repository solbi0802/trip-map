import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { useEffect, useMemo, useState } from 'react';

import koreaMunicipalities from './data/skorea_municipalities_geo_simple.json';

type RegionProperties = {
  code: string;
  name: string;
  name_eng: string;
  base_year: string;
};

type RegionFeature = Feature<Geometry, RegionProperties>;

type RegionShape = {
  id: string;
  groupId: string;
  name: string;
  fullName: string;
  englishName: string;
  path: string;
  label: [x: number, y: number];
};

type RegionGroup = {
  id: string;
  name: string;
  englishName: string;
  label: [x: number, y: number];
  centroid: [x: number, y: number];
  regionIds: string[];
};

const STORAGE_KEY = 'trip-map.visited-region-groups.v1';
const MAP_VIEW_BOX = '45 115 720 760';

const geoJson = koreaMunicipalities as FeatureCollection<Geometry, RegionProperties>;

const METROPOLITAN_PREFIX_NAMES: Record<string, string> = {
  '11': '서울',
  '21': '부산',
  '22': '대구',
  '23': '인천',
  '24': '광주',
  '25': '대전',
  '26': '울산',
  '29': '세종',
};

const LABEL_POSITION_OVERRIDES: Record<string, [x: number, y: number]> = {
  'metro-11': [319, 295],
  'metro-23': [267, 301],
  'region-31030': [337, 274],
  'region-31200': [292, 257],
  'region-31260': [316, 264],
  'region-31080': [331, 249],
  'city-고양': [298, 283],
  'region-31230': [280, 277],
  'city-부천': [286, 303],
  'region-31060': [303, 310],
  'city-안양': [301, 331],
  'city-성남': [351, 311],
  'region-31120': [346, 289],
  'region-31110': [333, 304],
  'region-31180': [346, 300],
  'region-31150': [296, 319],
  'city-안산': [297, 329],
  'city-수원': [323, 337],
  'city-용인': [343, 333],
  'city-청주': [366, 407],
};

const EMPHASIZED_GROUP_IDS = new Set(['city-부천', 'city-안양', 'region-31110']);

function getShortName(name: string) {
  return name
    .replace(/특별자치도$/u, '')
    .replace(/특별자치시$/u, '')
    .replace(/광역시$/u, '')
    .replace(/특별시$/u, '')
    .replace(/시$/u, '')
    .replace(/군$/u, '')
    .replace(/구$/u, '');
}

function getDisplayName(feature: RegionFeature) {
  const metroName = METROPOLITAN_PREFIX_NAMES[feature.properties.code.slice(0, 2)];
  if (metroName) {
    return metroName;
  }

  if (feature.properties.name === '울릉군') {
    return '울릉도';
  }

  if (feature.properties.name === '청원군') {
    return '청주';
  }

  const cityWithDistrict = feature.properties.name.match(/^(.+?)시.+구$/u);
  if (cityWithDistrict) {
    return getShortName(`${cityWithDistrict[1]}시`);
  }

  return getShortName(feature.properties.name);
}

function getGroupId(feature: RegionFeature) {
  const metroName = METROPOLITAN_PREFIX_NAMES[feature.properties.code.slice(0, 2)];
  if (metroName) {
    return `metro-${feature.properties.code.slice(0, 2)}`;
  }

  if (feature.properties.name === '청원군') {
    return 'city-청주';
  }

  const cityWithDistrict = feature.properties.name.match(/^(.+?)시.+구$/u);
  if (cityWithDistrict) {
    return `city-${cityWithDistrict[1]}`;
  }

  return `region-${feature.properties.code}`;
}

function createRegionShapes(): RegionShape[] {
  const projection = geoMercator().center([127.72, 36.12]).scale(5550).translate([390, 468]);
  const pathGenerator = geoPath(projection);

  return geoJson.features
    .map((feature: RegionFeature): RegionShape | null => {
      const path = pathGenerator(feature);
      const centroid = projection(geoCentroid(feature));

      if (!path || !centroid) {
        return null;
      }

      return {
        id: feature.properties.code,
        groupId: getGroupId(feature),
        name: getDisplayName(feature),
        fullName: feature.properties.name,
        englishName: feature.properties.name_eng,
        path,
        label: centroid as [number, number],
      };
    })
    .filter((region): region is RegionShape => region !== null);
}

const REGION_SHAPES = createRegionShapes();

function createRegionGroups() {
  const groups = new Map<string, RegionGroup & { totalX: number; totalY: number; count: number }>();

  REGION_SHAPES.forEach((region) => {
    const group = groups.get(region.groupId);

    if (!group) {
      groups.set(region.groupId, {
        id: region.groupId,
        name: region.name,
        englishName: region.englishName,
        label: region.label,
        centroid: region.label,
        regionIds: [region.id],
        totalX: region.label[0],
        totalY: region.label[1],
        count: 1,
      });
      return;
    }

    group.regionIds.push(region.id);
    group.totalX += region.label[0];
    group.totalY += region.label[1];
    group.count += 1;
    group.centroid = [group.totalX / group.count, group.totalY / group.count];
    group.label = group.centroid;
  });

  return Array.from(groups.values()).map(({ totalX, totalY, count, ...group }) => ({
    ...group,
    label: LABEL_POSITION_OVERRIDES[group.id] ?? group.label,
  }));
}

const REGION_GROUPS = createRegionGroups();

function loadVisitedRegions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const validIds = new Set(REGION_GROUPS.map((region) => region.id));
    return parsed.filter((id): id is string => typeof id === 'string' && validIds.has(id));
  } catch {
    return [];
  }
}

function saveVisitedRegions(regionIds: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(regionIds));
}

export default function App() {
  const [visitedRegionIds, setVisitedRegionIds] = useState<string[]>(() => loadVisitedRegions());
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const visitedRegionSet = useMemo(() => new Set(visitedRegionIds), [visitedRegionIds]);
  const selectedRegion = useMemo(
    () => REGION_GROUPS.find((region) => region.id === selectedRegionId) ?? null,
    [selectedRegionId]
  );
  const visitedRegions = useMemo(
    () => REGION_GROUPS.filter((region) => visitedRegionSet.has(region.id)),
    [visitedRegionSet]
  );

  useEffect(() => {
    saveVisitedRegions(visitedRegionIds);
  }, [visitedRegionIds]);

  function toggleRegion(region: RegionGroup) {
    setSelectedRegionId(region.id);
    setVisitedRegionIds((currentRegionIds) =>
      currentRegionIds.includes(region.id)
        ? currentRegionIds.filter((regionId) => regionId !== region.id)
        : [...currentRegionIds, region.id]
    );
  }

  function toggleShape(region: RegionShape) {
    const group = REGION_GROUPS.find((item) => item.id === region.groupId);
    if (group) {
      toggleRegion(group);
    }
  }

  function clearVisitedRegions() {
    setVisitedRegionIds([]);
    setSelectedRegionId(null);
  }

  return (
    <main className="app-shell">
      <section className="map-pane">
        <div className="map-header">
          <div>
            <p className="eyebrow">Trip Map MVP</p>
            <h1>국내여행 지도</h1>
          </div>
          <span className="marker-count">{visitedRegionIds.length}곳 색칠</span>
        </div>

        <div className="map-canvas region-map-canvas">
          <svg
            className="korea-map-svg"
            viewBox={MAP_VIEW_BOX}
            role="img"
            aria-label="대한민국 시군구 행정구역 지도">
            <g className="region-layer">
              {REGION_SHAPES.map((region) => {
                const isVisitedGroup = visitedRegionSet.has(region.groupId);
                const isSelected = selectedRegionId === region.groupId;

                return (
                  <path
                    aria-label={region.fullName}
                    className={`region-shape ${isVisitedGroup ? 'region-visited' : ''} ${
                      isSelected ? 'region-selected' : ''
                    } ${EMPHASIZED_GROUP_IDS.has(region.groupId) ? 'region-emphasized' : ''}`}
                    d={region.path}
                    key={region.id}
                    onClick={() => toggleShape(region)}
                  />
                );
              })}
            </g>

            <g className="connector-layer">
              {REGION_GROUPS.filter(
                (region) =>
                  EMPHASIZED_GROUP_IDS.has(region.id) &&
                  (region.centroid[0] !== region.label[0] || region.centroid[1] !== region.label[1])
              ).map((region) => (
                <line
                  className="label-connector"
                  key={`${region.id}-connector`}
                  x1={region.centroid[0]}
                  x2={region.label[0]}
                  y1={region.centroid[1]}
                  y2={region.label[1] - 4}
                />
              ))}
            </g>

            <g className="label-layer">
              {REGION_GROUPS.map((region) => {
                const isVisited = visitedRegionSet.has(region.id);

                return (
                  <text
                    className={`region-label ${isVisited ? 'region-label-visited' : ''}`}
                    key={`${region.id}-label`}
                    x={region.label[0]}
                    y={region.label[1]}
                    onClick={() => toggleRegion(region)}>
                    {region.name}
                  </text>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="map-hint">
          실제 시군구 경계 기반 지도입니다. 지역 이름이나 구역을 클릭하면 파란색으로 칠해집니다.
        </div>
      </section>

      <aside className="side-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Colored Places</p>
            <h2>색칠한 지역</h2>
          </div>
          <button className="ghost-button" disabled={visitedRegionIds.length === 0} onClick={clearVisitedRegions}>
            전체 해제
          </button>
        </div>

        {selectedRegion && (
          <div className="selected-card">
            <div>
              <p className="selected-label">선택한 지역</p>
              <strong>{selectedRegion.name}</strong>
              <span>{selectedRegion.englishName}</span>
            </div>
            <button className="danger-button" onClick={() => toggleRegion(selectedRegion)}>
              색칠 전환
            </button>
          </div>
        )}

        <div className="marker-list">
          {visitedRegions.length === 0 ? (
            <div className="empty-state">
              <strong>아직 색칠한 지역이 없어요.</strong>
              <p>지도에서 여행한 지역이나 가고 싶은 지역명을 클릭해보세요.</p>
            </div>
          ) : (
            visitedRegions.map((region) => (
              <button
                className={`marker-card ${region.id === selectedRegionId ? 'marker-card-active' : ''}`}
                key={region.id}
                onClick={() => setSelectedRegionId(region.id)}>
                <span>
                  <strong>{region.name}</strong>
                  <small>{region.englishName}</small>
                </span>
                <code>색칠됨</code>
              </button>
            ))
          )}
        </div>
      </aside>
    </main>
  );
}
